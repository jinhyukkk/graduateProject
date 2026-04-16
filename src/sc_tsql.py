"""
SC-TSQL 메인 파이프라인 (Section 4 전체)
Schema Linker → SQL Generator → Self-Correction Loop → Result Explainer

Phase 2 추가:
- 단계별 latency 추적 (stage_latency)
- SQL 생성 신뢰도 기록 (sql_confidence)
- Cross-encoder Reranking: SemanticVerifier의 NLI 모델을 SQLGenerator에 공유

Phase 3 추가:
- OutputGuardrails: 결과 행 수 제한 + 저신뢰 경고
- conversation_history: 멀티턴 대화 히스토리 SQL 생성 프롬프트 반영
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
from src.guardrails import OutputGuardrails, OutputGuardrailsResult


@dataclass
class AblationFlags:
    """어블레이션 실험용 구성요소 비활성화 플래그."""
    disable_schema_linker: bool = False
    disable_execution_validator: bool = False
    disable_semantic_verifier: bool = False
    disable_correction_loop: bool = False
    # RQ2 어블레이션: True면 오류 유형별 지시문 대신 단일 공용 지시문을 사용한다.
    use_generic_correction_prompt: bool = False
    # Phase 2 어블레이션: True면 few-shot cross-encoder reranking을 비활성화한다.
    disable_reranking: bool = False


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
    # Phase 2: 단계별 latency 및 신뢰도
    stage_latency: dict = field(default_factory=dict)
    sql_confidence: float = 0.5           # SQL 생성 신뢰도 (logprob 기반, 0~1)
    # Phase 3: Guardrails 결과
    guardrails: OutputGuardrailsResult | None = None


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

    Phase 2 변경:
      - SemanticVerifier를 SQLGenerator보다 먼저 초기화하여 NLI 모델을
        few-shot reranker로 공유한다 (추가 모델 로딩 없이 reranking 구현).
      - SCTSQLResult에 stage_latency, sql_confidence 필드 추가.

    Phase 3 변경:
      - OutputGuardrails: run() 결과에 행 수 제한 + 저신뢰 경고 적용.
      - run()에 conversation_history 파라미터 추가 (멀티턴 컨텍스트).
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

        # Phase 2: SemanticVerifier를 먼저 초기화하여 NLI 모델을 reranker로 공유
        self.execution_validator = ExecutionValidator()
        self.semantic_verifier = SemanticVerifier(config)

        # Phase 2: disable_reranking 플래그 또는 disable_semantic_verifier 시 reranker=None
        reranker = None
        if (
            not self.ablation.disable_reranking
            and not self.ablation.disable_semantic_verifier
        ):
            reranker = self.semantic_verifier.nli_model

        if not self.ablation.disable_schema_linker:
            self.schema_linker = SchemaLinker(db_path, config)
        else:
            self.schema_linker = None

        self.sql_generator = SQLGenerator(config, few_shot_examples, reranker=reranker)
        self.corrector = Corrector(
            config,
            use_typed_prompt=not self.ablation.use_generic_correction_prompt,
        )
        self.result_explainer = ResultExplainer(config)

        # Phase 3: OutputGuardrails
        semantic_threshold = config["correction"].get("semantic_threshold", 0.75)
        self.output_guardrails = OutputGuardrails(semantic_threshold=semantic_threshold)

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

    def run(
        self,
        query: str,
        conversation_history: list[dict] | None = None,
    ) -> SCTSQLResult:
        """
        Section 4: 전체 파이프라인을 실행한다.

        Args:
            query: 자연어 질의
            conversation_history: 이전 대화 이력 (Phase 3 멀티턴).
                각 항목: {"question": str, "sql": str, "explanation": str}

        Returns:
            SCTSQLResult: SQL, 결과, 교정 이력, 설명, 지연시간 포함
        """
        total_start = time.time()
        stage_latency = {}
        correction_history = []

        # Step 1: Schema Linking (Section 4.2)
        t0 = time.time()
        if self.schema_linker is not None:
            schema_context = self.schema_linker.link(query)
        else:
            schema_context = self._fallback_schema_context()
        stage_latency["schema_linking"] = round(time.time() - t0, 3)

        # Step 2: SQL Generation (Section 4.3)
        t0 = time.time()
        gen_result = self.sql_generator.generate(
            query, schema_context,
            conversation_history=conversation_history or [],
        )
        current_sql = gen_result["sql"]
        sql_confidence = gen_result["confidence"]
        stage_latency["sql_generation"] = round(time.time() - t0, 3)

        # Step 3: Self-Correction Loop (Section 4.4, 최대 K회)
        validation_result = None
        verification_result = None

        for round_num in range(1, self.max_rounds + 1):
            t0 = time.time()

            # Section 4.4.1: 실행 기반 검증
            if not self.ablation.disable_execution_validator:
                validation_result = self.execution_validator.validate(current_sql, self.db_path)
            else:
                validation_result = ValidationResult(
                    success=True, results=[], column_names=[],
                    error_type=None, error_message=None,
                    is_empty=False, is_excessive=False, row_count=0,
                )

            # Section 4.4.2: 의미론적 일관성 검증
            if not self.ablation.disable_semantic_verifier:
                verification_result = self.semantic_verifier.verify(query, current_sql)
            else:
                verification_result = VerificationResult(
                    back_translation="",
                    similarity_score=1.0,
                    is_consistent=True,
                    mismatch_diagnosis=None,
                )

            # 교정 필요 여부 판단
            needs_correction = self._needs_correction(validation_result, verification_result)

            if not needs_correction:
                stage_latency[f"correction_round_{round_num}"] = round(time.time() - t0, 3)
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
            stage_latency[f"correction_round_{round_num}"] = round(time.time() - t0, 3)

        # 최종 실행 (교정 후 결과 갱신)
        if validation_result is None or correction_history:
            validation_result = self.execution_validator.validate(current_sql, self.db_path)

        # Step 4: Result Explanation (Section 4.5)
        results = validation_result.results if validation_result.success else []
        column_names = validation_result.column_names if validation_result.success else []

        t0 = time.time()
        explanation = self.result_explainer.explain(
            query, current_sql, results, correction_history
        )
        stage_latency["explanation"] = round(time.time() - t0, 3)

        latency = time.time() - total_start

        # Phase 3: Output Guardrails 적용
        nli_score = (
            verification_result.similarity_score
            if verification_result is not None
            else 1.0
        )
        results, guardrails_result = self.output_guardrails.apply(
            results=results,
            sql_confidence=sql_confidence,
            nli_score=nli_score,
            correction_rounds=len(correction_history),
            max_rounds=self.max_rounds,
        )

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
            stage_latency=stage_latency,
            sql_confidence=sql_confidence,
            guardrails=guardrails_result,
        )

    def _needs_correction(
        self,
        validation_result: ValidationResult,
        verification_result: VerificationResult,
    ) -> bool:
        """
        Section 4.4: 교정이 필요한지 판단한다.

        교정 조건:
        1. 실행 실패 (E1~E6) — 항상 교정
        2. 결과 비어있음(E7) 또는 과대(E8) **그리고** 의미 불일치(NLI < θ)
           — E7/E8은 단독으로는 "의심 플래그"일 뿐이며, 정답도 0행이거나
             >1000행일 수 있다(BIRD에 실제 존재). 따라서 의미 검증까지
             불일치로 판정된 경우에만 교정 트리거로 쓴다. 이는 valid
             empty/large gold에 대한 오탐을 줄여 실측 신뢰도를 높인다.
        3. 실행은 정상이지만 의미 불일치 — 교정
        """
        if not validation_result.success:
            return True

        if validation_result.is_empty or validation_result.is_excessive:
            if not verification_result.is_consistent:
                return True
            return False

        if not verification_result.is_consistent:
            return True

        return False
