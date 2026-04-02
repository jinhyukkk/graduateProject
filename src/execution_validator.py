"""
Execution-Based Validator (Section 4.4.1)
SQLite 샌드박스 실행 + 오류 분류.
"""

import re
import sqlite3
from dataclasses import dataclass, field


# Section 4.4.1: 오류 유형 분류 체계 (E1~E8)
# 미명시: 오류 메시지 패턴 매칭으로 분류 (일반적 관행 + LLM 보완은 Corrector에서 수행)
ERROR_PATTERNS = {
    "E1_SYNTAX": [
        r"near \".*?\": syntax error",
        r"incomplete input",
        r"unrecognized token",
    ],
    "E2_NO_SUCH_TABLE": [
        r"no such table: .*",
    ],
    "E3_NO_SUCH_COLUMN": [
        r"no such column: .*",
        r"has no column named .*",
    ],
    "E4_AMBIGUOUS_COLUMN": [
        r"ambiguous column name: .*",
    ],
    "E5_TYPE_MISMATCH": [
        r"datatype mismatch",
    ],
    "E6_AGGREGATE_ERROR": [
        r"misuse of aggregate function",
        r"misuse of aggregate: .*",
    ],
}


@dataclass
class ValidationResult:
    """실행 검증 결과."""
    success: bool
    results: list[tuple] = field(default_factory=list)
    column_names: list[str] = field(default_factory=list)
    error_type: str | None = None      # E1~E8 또는 None
    error_message: str | None = None   # 원본 오류 메시지
    is_empty: bool = False             # 결과가 비어있는지 (E7 논리 오류 의심)
    is_excessive: bool = False         # 결과가 과대한지 (>1000행, E8 필터 누락 의심)
    row_count: int = 0


class ExecutionValidator:
    """
    Section 4.4.1: 실행 기반 검증기.

    SQLite 샌드박스에서 SQL을 실행하여 오류를 탐지하고 분류한다.
    - 읽기 전용 연결 (uri=True, mode=ro)
    - timeout 5초
    """

    def validate(self, sql: str, db_path: str) -> ValidationResult:
        """
        Section 4.4.1: SQL을 샌드박스에서 실행하고 결과를 검증한다.

        Args:
            sql: 검증할 SQL 문자열
            db_path: SQLite DB 파일 경로

        Returns:
            ValidationResult: 실행 결과 + 오류 분류
        """
        try:
            # 읽기 전용 + timeout 5초 샌드박스  # 미명시: 읽기 전용 SQLite 연결 적용 (안전한 방법)
            conn = sqlite3.connect(
                f"file:{db_path}?mode=ro",
                uri=True,
                timeout=5.0,
            )
            conn.execute("PRAGMA query_only = ON;")
            cursor = conn.cursor()
            cursor.execute(sql)
            rows = cursor.fetchall()
            column_names = [desc[0] for desc in cursor.description] if cursor.description else []
            conn.close()

            row_count = len(rows)

            # Section 4.4.1: 실행 성공 시 결과 분석
            is_empty = (row_count == 0)      # 논리 오류 플래그 (E7/E8 의심)
            is_excessive = (row_count > 1000)  # 필터 누락 플래그

            error_type = None
            if is_empty:
                error_type = "E7_EMPTY_RESULT"
            elif is_excessive:
                error_type = "E8_EXCESSIVE_RESULT"

            return ValidationResult(
                success=True,
                results=rows,
                column_names=column_names,
                error_type=error_type,
                error_message=None,
                is_empty=is_empty,
                is_excessive=is_excessive,
                row_count=row_count,
            )

        except Exception as e:
            error_msg = str(e)
            error_type = self._classify_error(error_msg)
            return ValidationResult(
                success=False,
                error_type=error_type,
                error_message=error_msg,
            )

    def _classify_error(self, error_message: str) -> str:
        """
        Section 4.4.1: 오류 메시지를 E1~E6 유형으로 분류한다.
        # 미명시: 오류 메시지 패턴 매칭 적용 (일반적 관행)
        """
        for error_type, patterns in ERROR_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, error_message, re.IGNORECASE):
                    return error_type
        return "E_UNKNOWN"
