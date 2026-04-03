"""
SC-TSQL 메인 파이프라인 (Section 4 전체)
Schema Linker → SQL Generator → Self-Correction Loop → Result Explainer
"""

import json
import sqlite3
import time
from dataclasses import dataclass, field

from src.schema_linker import SchemaLinker
from src.sql_generator import SQLGenerator
from src.execution_validator import ExecutionValidator, ValidationResult
from src.semantic_verifier import SemanticVerifier, VerificationResult
from src.corrector import Corrector
from src.result_explainer import ResultExplainer


@dataclass
class AblationFlags:
    """어블레이션 실험용 구성요소 비활성화 플래그."""
    disable_schema_linker: bool = False
    disable_execution_validator: bool = False
    disable_semantic_verifier: bool = False
    disable_correction_loop: bool = False


@dataclass
class SCTSQLResult:
    """SC-TSQL 파이프라인 실행 결과."""
    query: str
    final_sql: str
    results: list[tuple] = field(default_factory=list)
    column_names: list[str] = field(default_factory=list)
    correction_history: list[dict] = field(default_factory=list)
    explanation: str = ""
    latency: float = 0.0                  # 총 소요 시간 (초)
    total_correction_rounds: int = 0      # 실제 교정 횟수
    final_validation: ValidationResult | None = None
    final_verification: VerificationResult | None = None


class SCTSQL:
    """
    SC-TSQL 메인 파이프라인 (Section 4).

    전체 흐름:
      1. SchemaLinker.link()       — Section 4.2
      2. SQLGenerator.generate()   — Section 4.3
      3. Self-correction loop      — Section 4.4 (최대 K=3회)
         a. ExecutionValidator.validate()    — Section 4.4.1
         b. SemanticVerifier.verify()        — Section 4.4.2
         c. Corrector.correct()              — Section 4.4.3 (오류/불일치 시)
      4. ResultExplainer.explain()  — Section 4.5
    """

    def __init__(
        self,
        db_path: str,
        config: dict,
        few_shot_examples: list[dict] | None = None,
        ablation: AblationFlags | None = None,
    ):
        """
        Args:
            db_path: SQLite 데이터베이스 파일 경로
            config: configs/config.yaml에서 로드된 설정
            few_shot_examples: SQL Generator용 few-shot 후보 리스트
            ablation: 어블레이션 플래그 (None이면 모든 구성요소 활성화)
        """
        self.db_path = db_path
        self.config = config
        self.ablation = ablation or AblationFlags()
        self.max_rounds = config["correction"]["max_rounds"]  # K=3, Section 4.4

        # 교정 루프 비활성화 시 max_rounds=0으로 강제
        if self.ablation.disable_correction_loop:
            self.max_rounds = 0

        # 모듈 초기화 (어블레이션으로 비활성화된 모듈도 초기화하되, run()에서 스킵)
        if not self.ablation.disable_schema_linker:
            self.schema_linker = SchemaLinker(db_path, config)
        else:
            self.schema_linker = None
        self.sql_generator = SQLGenerator(config, few_shot_examples)
        self.execution_validator = ExecutionValidator()
        self.semantic_verifier = SemanticVerifier(config)
        self.corrector = Corrector(config)
        self.result_explainer = ResultExplainer(config)

    def _fallback_schema_context(self) -> dict:
        """스키마 링커 비활성화 시 전체 스키마를 직접 읽어 반환한다."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        )
        tables = [row[0] for row in cursor.fetchall()]

        all_columns = {}
        fk_list = []
        schema_lines = []
        for table in tables:
            cursor.execute(f"PRAGMA table_info(`{table}`);")
            cols = [col[1] for col in cursor.fetchall()]
            all_columns[table] = cols

            col_defs = ", ".join(f"{c} TEXT" for c in cols)
            schema_lines.append(f"CREATE TABLE {table} ({col_defs});")

            cursor.execute(f"PRAGMA foreign_key_list(`{table}`);")
            for fk in cursor.fetchall():
                fk_list.append({
                    "from": f"{table}.{fk[3]}",
                    "to": f"{fk[2]}.{fk[4]}",
                })

        conn.close()
        return {
            "tables": tables,
            "columns": all_columns,
            "foreign_keys": fk_list,
            "schema_text": "\n\n".join(schema_lines),
        }

    def run(self, query: str) -> SCTSQLResult:
        """
        Section 4: 전체 파이프라인을 실행한다.

        Args:
            query: 자연어 질의

        Returns:
            SCTSQLResult: SQL, 결과, 교정 이력, 설명, 지연시간 포함
        """
        start_time = time.time()
        correction_history = []

        # Step 1: Schema Linking (Section 4.2)
        if self.schema_linker is not None:
            schema_context = self.schema_linker.link(query)
        else:
            schema_context = self._fallback_schema_context()

        # Step 2: SQL Generation (Section 4.3)
        current_sql = self.sql_generator.generate(query, schema_context)

        # Step 3: Self-Correction Loop (Section 4.4, 최대 K회)
        validation_result = None
        verification_result = None

        for round_num in range(1, self.max_rounds + 1):
            # Section 4.4.1: 실행 기반 검증
            if not self.ablation.disable_execution_validator:
                validation_result = self.execution_validator.validate(current_sql, self.db_path)
            else:
                # 실행 검증 비활성화: 항상 성공으로 가정
                validation_result = ValidationResult(
                    success=True, results=[], column_names=[],
                    error_type=None, error_message=None,
                    is_empty=False, is_excessive=False, row_count=0,
                )

            # Section 4.4.2: 의미론적 일관성 검증
            if not self.ablation.disable_semantic_verifier:
                verification_result = self.semantic_verifier.verify(query, current_sql)
            else:
                # 의미 검증 비활성화: 항상 일치로 가정
                verification_result = VerificationResult(
                    back_translation="",
                    similarity_score=1.0,
                    is_consistent=True,
                    mismatch_diagnosis=None,
                )

            # 교정 필요 여부 판단
            needs_correction = self._needs_correction(validation_result, verification_result)

            if not needs_correction:
                break

            # Section 4.4.3: 교정
            error_type = validation_result.error_type or "SEMANTIC_MISMATCH"
            correction_entry = {
                "round": round_num,
                "error_type": error_type,
                "original_sql": current_sql,
                "validation_success": validation_result.success,
                "semantic_score": verification_result.similarity_score,
            }

            corrected_sql = self.corrector.correct(
                query, current_sql, validation_result, verification_result
            )

            correction_entry["corrected_sql"] = corrected_sql
            correction_history.append(correction_entry)

            current_sql = corrected_sql

        # 최종 실행 (교정 후 결과 갱신)
        if validation_result is None or correction_history:
            validation_result = self.execution_validator.validate(current_sql, self.db_path)

        # Step 4: Result Explanation (Section 4.5)
        results = validation_result.results if validation_result.success else []
        column_names = validation_result.column_names if validation_result.success else []

        explanation = self.result_explainer.explain(
            query, current_sql, results, correction_history
        )

        latency = time.time() - start_time

        return SCTSQLResult(
            query=query,
            final_sql=current_sql,
            results=results,
            column_names=column_names,
            correction_history=correction_history,
            explanation=explanation,
            latency=latency,
            total_correction_rounds=len(correction_history),
            final_validation=validation_result,
            final_verification=verification_result,
        )

    def _needs_correction(
        self,
        validation_result: ValidationResult,
        verification_result: VerificationResult,
    ) -> bool:
        """
        Section 4.4: 교정이 필요한지 판단한다.

        교정 조건:
        1. 실행 실패 (E1~E6)
        2. 결과 비어있음 (E7)
        3. 결과 과대 (E8)
        4. 의미 불일치 (sim < θ=0.75)
        """
        # 실행 오류
        if not validation_result.success:
            return True

        # 빈 결과 또는 과대 결과
        if validation_result.is_empty or validation_result.is_excessive:
            return True

        # 의미 불일치
        if not verification_result.is_consistent:
            return True

        return False
