"""
Corrector (Section 4.4.3)
오류 정보 기반 SQL 교정.
"""

import os
from openai import OpenAI
from src.execution_validator import ValidationResult
from src.semantic_verifier import VerificationResult


class Corrector:
    """
    Section 4.4.3: 구체적 오류 정보를 포함한 교정 프롬프트로 SQL을 교정한다.

    교정 프롬프트 구조 (Section 4.4.3):
      원래 질의 + 생성된 SQL + 실행 결과 + 감지된 오류 + 의미 일관성 진단
    """

    def __init__(self, config: dict):
        self.config = config
        self.client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.llm_model = config["llm"]["model"]

    def correct(
        self,
        query: str,
        sql: str,
        validation_result: ValidationResult,
        verification_result: VerificationResult | None,
    ) -> str:
        """
        Section 4.4.3: 오류 정보를 기반으로 SQL을 교정한다.

        Args:
            query: 원래 자연어 질의
            sql: 교정 대상 SQL
            validation_result: ExecutionValidator.validate() 결과
            verification_result: SemanticVerifier.verify() 결과 (없을 수 있음)

        Returns:
            교정된 SQL 문자열
        """
        # Section 4.4.3: 교정 프롬프트 구성
        error_info = self._format_error_info(validation_result)
        semantic_info = self._format_semantic_info(verification_result)
        execution_info = self._format_execution_result(validation_result)

        # Section 4.4.3: Corrector 프롬프트 구조
        prompt = f"""You are an expert SQL debugger. Fix the following SQL query based on the error information provided.

원래 질의: {query}
생성된 SQL: {sql}
실행 결과: {execution_info}
감지된 오류: {error_info}
의미 일관성 진단: {semantic_info}

위의 오류를 수정하여 올바른 SQL을 생성하세요.
수정한 부분과 이유를 간략히 설명하세요.

Return the corrected SQL query wrapped in ```sql``` code blocks, followed by a brief explanation."""

        response = self.client.chat.completions.create(
            model=self.llm_model,
            temperature=self.config["llm"]["temperature"],
            max_tokens=self.config["llm"]["max_tokens"],
            messages=[{"role": "user", "content": prompt}],
        )

        result_text = response.choices[0].message.content.strip()

        # SQL 추출
        if "```sql" in result_text:
            corrected_sql = result_text.split("```sql")[1].split("```")[0].strip()
        elif "```" in result_text:
            corrected_sql = result_text.split("```")[1].split("```")[0].strip()
        else:
            # 코드 블록이 없으면 전체 텍스트에서 SQL 추출 시도
            lines = result_text.strip().split("\n")
            sql_lines = []
            for line in lines:
                stripped = line.strip().upper()
                if stripped.startswith(("SELECT", "WITH", "INSERT", "UPDATE", "DELETE",
                                        "CREATE", "DROP", "ALTER", "FROM", "WHERE",
                                        "JOIN", "LEFT", "RIGHT", "INNER", "GROUP",
                                        "ORDER", "HAVING", "LIMIT", "UNION", "EXCEPT",
                                        "INTERSECT", "(")) or sql_lines:
                    sql_lines.append(line)
            corrected_sql = "\n".join(sql_lines).strip() if sql_lines else result_text

        return corrected_sql

    def _format_error_info(self, validation_result: ValidationResult) -> str:
        """오류 정보를 포맷한다."""
        if validation_result.error_type is None:
            return "오류 없음"

        parts = [validation_result.error_type]
        if validation_result.error_message:
            parts.append(f"- {validation_result.error_message}")
        if validation_result.is_empty:
            parts.append("- 결과가 비어있음 (논리 오류 가능성)")
        if validation_result.is_excessive:
            parts.append(
                f"- 결과가 과대함 ({validation_result.row_count}행, 필터/조인 누락 가능성)"
            )
        return " ".join(parts)

    def _format_semantic_info(self, verification_result: VerificationResult | None) -> str:
        """의미 일관성 진단 정보를 포맷한다."""
        if verification_result is None:
            return "의미 검증 미수행"
        if verification_result.is_consistent:
            return f"일치 (score={verification_result.similarity_score:.3f})"
        parts = [
            f"불일치 (score={verification_result.similarity_score:.3f}, threshold={self.config['correction']['semantic_threshold']})"
        ]
        if verification_result.mismatch_diagnosis:
            parts.append(f"진단: {verification_result.mismatch_diagnosis}")
        return "\n".join(parts)

    def _format_execution_result(self, validation_result: ValidationResult) -> str:
        """실행 결과를 포맷한다."""
        if not validation_result.success:
            return f"실행 실패: {validation_result.error_message}"
        if validation_result.is_empty:
            return "실행 성공, 결과 없음 (0행)"
        # 결과 샘플 표시 (최대 5행)
        sample_rows = validation_result.results[:5]
        header = ", ".join(validation_result.column_names) if validation_result.column_names else ""
        rows_str = "\n".join(str(row) for row in sample_rows)
        suffix = f"\n... (총 {validation_result.row_count}행)" if validation_result.row_count > 5 else ""
        return f"실행 성공 ({validation_result.row_count}행)\n컬럼: {header}\n{rows_str}{suffix}"
