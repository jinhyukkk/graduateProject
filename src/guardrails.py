"""
Guardrails (Phase 3 — Section 5)
입력 검증 + 출력 검증으로 파이프라인 안전성을 보장한다.

InputGuardrails:
  - 빈 쿼리 / 너무 짧은 쿼리 거부
  - 쿼리 최대 길이 제한 (500자)
  - 위험 SQL 키워드 주입 시도 감지

OutputGuardrails:
  - 결과 행 수 상한선 적용 (MAX_ROWS)
  - NLI threshold 미달 + 교정 루프 소진 시 경고 플래그

GuardrailsError:
  - InputGuardrails.validate() 실패 시 raise
"""

import re
from dataclasses import dataclass


# ── 예외 ─────────────────────────────────────────────────────────────────────

class GuardrailsError(Exception):
    """입력 Guardrails 위반 시 발생."""
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


# ── 입력 Guardrails ───────────────────────────────────────────────────────────

class InputGuardrails:
    """
    자연어 질의가 파이프라인에 진입하기 전에 유효성을 검사한다.

    검사 항목:
      1. 빈 쿼리 / 너무 짧은 쿼리 (< MIN_LENGTH)
      2. 최대 길이 초과 (> MAX_LENGTH)
      3. SQL 주입 패턴 감지 (; + DML/DDL 키워드)
      4. 반복 문자 / 의미 없는 입력
    """

    MIN_LENGTH = 3
    MAX_LENGTH = 500

    # 세미콜론 + DML/DDL (SQL injection 시도)
    _SQL_INJECTION_PATTERN = re.compile(
        r";\s*(drop|delete|insert|update|create|alter|truncate|exec|execute)\b",
        re.IGNORECASE,
    )

    # 단일 문자 반복 (예: "aaaaaaaa")
    _REPEATED_CHAR_PATTERN = re.compile(r"(.)\1{9,}")

    def validate(self, query: str) -> str:
        """
        질의 문자열을 검사하고 정제된 질의를 반환한다.

        Args:
            query: 사용자가 입력한 자연어 질의

        Returns:
            공백 정제 후 질의 문자열

        Raises:
            GuardrailsError: 검사 실패 시
        """
        if not isinstance(query, str):
            raise GuardrailsError("질의는 문자열이어야 합니다.")

        cleaned = query.strip()

        if len(cleaned) < self.MIN_LENGTH:
            raise GuardrailsError(
                f"질의가 너무 짧습니다 (최소 {self.MIN_LENGTH}자 이상)."
            )

        if len(cleaned) > self.MAX_LENGTH:
            raise GuardrailsError(
                f"질의가 너무 깁니다 (최대 {self.MAX_LENGTH}자). "
                f"현재 길이: {len(cleaned)}자."
            )

        if self._SQL_INJECTION_PATTERN.search(cleaned):
            raise GuardrailsError(
                "SQL 명령어가 포함된 입력은 허용되지 않습니다."
            )

        if self._REPEATED_CHAR_PATTERN.search(cleaned):
            raise GuardrailsError(
                "의미 있는 질의를 입력해 주세요."
            )

        return cleaned


# ── 출력 Guardrails ───────────────────────────────────────────────────────────

@dataclass
class OutputGuardrailsResult:
    """출력 Guardrails 검사 결과."""
    rows_truncated: bool = False      # MAX_ROWS 초과로 잘림
    original_row_count: int = 0       # 잘리기 전 행 수
    low_confidence_warning: bool = False  # NLI 신뢰도 낮음 경고
    warning_message: str = ""         # 사용자에게 보여줄 경고 메시지


class OutputGuardrails:
    """
    파이프라인 결과가 사용자에게 반환되기 전에 후처리한다.

    처리 항목:
      1. 결과 행 수 상한선 적용 (MAX_ROWS = 1000)
      2. 교정 루프 소진 + NLI 낮음 → 저신뢰 경고 플래그
    """

    MAX_ROWS = 1000

    def __init__(self, semantic_threshold: float = 0.75):
        self.semantic_threshold = semantic_threshold

    def apply(
        self,
        results: list[tuple],
        sql_confidence: float,
        nli_score: float,
        correction_rounds: int,
        max_rounds: int,
    ) -> tuple[list[tuple], OutputGuardrailsResult]:
        """
        결과 리스트에 Guardrails를 적용한다.

        Args:
            results:           SQL 실행 결과 행 리스트
            sql_confidence:    SQL 생성 신뢰도 (logprob 기반, 0~1)
            nli_score:         NLI 의미 일치 점수 (ICS)
            correction_rounds: 실제 교정 횟수
            max_rounds:        최대 교정 횟수 (K)

        Returns:
            (truncated_results, guardrails_result)
        """
        gr = OutputGuardrailsResult(original_row_count=len(results))

        # 1. 행 수 제한
        if len(results) > self.MAX_ROWS:
            results = results[: self.MAX_ROWS]
            gr.rows_truncated = True

        # 2. 저신뢰 경고: 교정 루프 소진 + NLI 미달
        loop_exhausted = (correction_rounds >= max_rounds) and (max_rounds > 0)
        nli_below_threshold = nli_score < self.semantic_threshold

        if loop_exhausted and nli_below_threshold:
            gr.low_confidence_warning = True
            gr.warning_message = (
                f"최대 교정 횟수({max_rounds}회)에 도달했으나 의미 일치 점수"
                f"({nli_score:.2f})가 임계값({self.semantic_threshold})에 미치지 못합니다. "
                "결과가 질문의 의도와 다를 수 있습니다."
            )

        return results, gr
