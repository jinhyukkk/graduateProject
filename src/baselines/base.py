"""
Baseline abstract interface (Section 5).
모든 베이스라인 모델이 구현해야 하는 공통 인터페이스 및 유틸리티.
"""

import re
import os
import time
import logging
from abc import ABC, abstractmethod

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import APIError, APITimeoutError, RateLimitError

logger = logging.getLogger(__name__)


def extract_sql(text: str) -> str:
    """
    LLM 응답에서 SQL 문을 추출한다.

    추출 우선순위:
      1. ```sql ... ``` 코드 블록
      2. ``` ... ``` 코드 블록
      3. SELECT/WITH 로 시작하는 연속 라인
      4. 전체 텍스트 (폴백)
    """
    # 1. ```sql ... ``` 블록
    if "```sql" in text:
        match = text.split("```sql", 1)[1]
        sql = match.split("```", 1)[0].strip()
        if sql:
            return sql

    # 2. ``` ... ``` 블록
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 3:
            sql = parts[1].strip()
            if sql:
                return sql

    # 3. SELECT/WITH 로 시작하는 연속 라인
    # multi-line SQL의 중간 빈 줄을 허용하되, 명백히 비-SQL 텍스트(영문 설명 등)를 만나면 중단
    lines = text.strip().split("\n")
    sql_lines = []
    capturing = False
    consecutive_blank = 0
    for line in lines:
        stripped = line.strip()
        stripped_upper = stripped.upper()
        if not capturing and stripped_upper.startswith(("SELECT", "WITH")):
            capturing = True
        if capturing:
            if not stripped:
                consecutive_blank += 1
                # 빈 줄 2개 연속이면 SQL 종료로 판단
                if consecutive_blank >= 2:
                    break
                sql_lines.append(line)
                continue
            consecutive_blank = 0
            # 영어 산문(설명 텍스트)으로 시작하면 SQL 종료
            if stripped_upper.startswith(("NOTE", "EXPLANATION", "THIS ", "THE ", "I ", "HERE")):
                break
            sql_lines.append(line)

    if sql_lines:
        # 후행 빈 줄 제거, 세미콜론은 유지 (SQLite 실행에 무해)
        return "\n".join(sql_lines).strip()

    # 4. 폴백: 전체 텍스트
    return text.strip()


class BaselineModel(ABC):
    """
    베이스라인 모델 추상 인터페이스.

    모든 베이스라인은 동일한 LLM 설정(모델, temperature, seed)을 사용하고,
    predict() 메서드를 통해 자연어 질의 -> SQL 변환 결과를 반환한다.
    """

    def __init__(self, config: dict):
        """
        Args:
            config: configs/config.yaml에서 로드된 설정
        """
        self.config = config
        self.client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.llm_model = config["llm"]["model"]
        self.temperature = config["llm"]["temperature"]
        self.max_tokens = config["llm"]["max_tokens"]

    @abstractmethod
    def predict(self, question: str, schema: dict, db_path: str) -> dict:
        """
        자연어 질의를 SQL로 변환한다.

        Args:
            question: 자연어 질의
            schema: 스키마 정보 딕셔너리. 최소 키:
                - "schema_text": CREATE TABLE DDL 문자열
                - "tables": 테이블명 리스트
                - "columns": {table: [columns]} 매핑
                - "foreign_keys": 외래키 리스트
            db_path: SQLite 데이터베이스 파일 경로

        Returns:
            {
                "sql": str,                    # 생성된 SQL
                "raw_output": str,             # LLM 원본 응답
                "cost": {
                    "prompt_tokens": int,
                    "completion_tokens": int,
                },
                "latency": float,              # 총 소요 시간 (초)
                "error": str | None,           # 에러 발생 시 메시지
            }
        """
        ...

    def _call_llm(self, messages: list[dict], **kwargs) -> dict:
        """
        OpenAI Chat Completion API를 호출한다.
        3회 재시도(지수 백오프) 포함.

        Args:
            messages: Chat messages 리스트
            **kwargs: 추가 API 파라미터 (temperature, max_tokens 등 오버라이드)

        Returns:
            {
                "content": str,                # 응답 텍스트
                "prompt_tokens": int,
                "completion_tokens": int,
            }

        Raises:
            마지막 재시도 이후에도 실패하면 원본 예외를 전파한다.
        """
        return self._call_llm_with_retry(messages, **kwargs)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)),
        reraise=True,
    )
    def _call_llm_with_retry(self, messages: list[dict], **kwargs) -> dict:
        """재시도 로직이 적용된 내부 LLM 호출."""
        temperature = kwargs.pop("temperature", self.temperature)
        max_tokens = kwargs.pop("max_tokens", self.max_tokens)

        response = self.client.chat.completions.create(
            model=self.llm_model,
            temperature=temperature,
            max_completion_tokens=max_tokens,
            messages=messages,
            **kwargs,
        )

        content = response.choices[0].message.content or ""
        usage = response.usage

        return {
            "content": content.strip(),
            "prompt_tokens": usage.prompt_tokens if usage else 0,
            "completion_tokens": usage.completion_tokens if usage else 0,
        }

    def _make_result(
        self,
        sql: str,
        raw_output: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency: float,
        error: str | None = None,
    ) -> dict:
        """표준 반환 딕셔너리를 생성한다."""
        return {
            "sql": sql,
            "raw_output": raw_output,
            "cost": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
            },
            "latency": latency,
            "error": error,
        }
