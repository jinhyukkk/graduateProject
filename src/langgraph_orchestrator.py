"""
LangGraph 기반 SC-TSQL 오케스트레이터 (Phase 3)

sc_tsql.py의 선형 파이프라인을 LangGraph StateGraph로 재구현한다.
기존 SCTSQL과 동일한 인터페이스(run() → SCTSQLResult)를 유지하므로
config에 use_langgraph: true를 설정하면 평가 스크립트와 백엔드에서
drop-in 교체가 가능하다.

상태 전이 그래프:
  schema_link
      │
  sql_generate
      │
  execution_validate ──실패──► correct ──┐
      │                                   │ (라운드 증가)
  semantic_verify                         │
      │                                   │
   일치──► explain ──► END               │
      │                                   │
   불일치──► correct ◄───────────────────┘
                │
             (최대 K회 후) ──► final_execute ──► explain ──► END
"""

import time
from dataclasses import dataclass, field
from typing import Annotated, TypedDict

from langgraph.graph import StateGraph, END

from src.schema_linker import SchemaLinker
from src.sql_generator import SQLGenerator
from src.execution_validator import ExecutionValidator, ValidationResult
from src.semantic_verifier import SemanticVerifier, VerificationResult
from src.corrector import Corrector
from src.result_explainer import ResultExplainer
from src.guardrails import OutputGuardrails, OutputGuardrailsResult
from src.sc_tsql import AblationFlags, SCTSQLResult


# ── 그래프 상태 정의 ──────────────────────────────────────────────────────────

class PipelineState(TypedDict):
    # 입력
    query: str
    conversation_history: list[dict]

    # 중간 상태
    schema_context: dict
    current_sql: str
    sql_confidence: float
    round_num: int

    # 검증 결과
    validation_result: ValidationResult | None
    verification_result: VerificationResult | None

    # 누적 결과
    correction_history: list[dict]
    stage_latency: dict

    # 최종 출력
    final_results: list[tuple]
    final_column_names: list[str]
    explanation: str
    guardrails_result: OutputGuardrailsResult | None


# ── LangGraph 오케스트레이터 ──────────────────────────────────────────────────

class LangGraphSCTSQL:
    """
    LangGraph StateGraph 기반 SC-TSQL 파이프라인.

    SCTSQL과 동일한 공개 인터페이스:
        pipeline = LangGraphSCTSQL(db_path, config)
        result: SCTSQLResult = pipeline.run(query)

    config에 use_langgraph: true가 있을 때 sc_tsql.SCTSQL 대신 사용된다.
    """

    def __init__(
        self,
        db_path: str,
        config: dict,
        few_shot_examples: list[dict] | None = None,
        ablation: AblationFlags | None = None,
    ):
        self.db_path = db_path
        self.config = config
        self.ablation = ablation or AblationFlags()
        self.max_rounds = config["correction"]["max_rounds"]

        if self.ablation.disable_correction_loop:
            self.max_rounds = 0

        semantic_threshold = config["correction"].get("semantic_threshold", 0.75)

        # 모듈 초기화 (sc_tsql.py와 동일한 순서)
        self.execution_validator = ExecutionValidator()
        self.semantic_verifier = SemanticVerifier(config)

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
        self.output_guardrails = OutputGuardrails(semantic_threshold=semantic_threshold)

        # 그래프 컴파일
        self._graph = self._build_graph()

    # ── 노드 함수 ─────────────────────────────────────────────────────────────

    def _node_schema_link(self, state: PipelineState) -> dict:
        t0 = time.time()
        if self.schema_linker is not None:
            ctx = self.schema_linker.link(state["query"])
        else:
            ctx = self._fallback_schema_context()
        return {
            "schema_context": ctx,
            "stage_latency": {**state.get("stage_latency", {}),
                               "schema_linking": round(time.time() - t0, 3)},
        }

    def _node_sql_generate(self, state: PipelineState) -> dict:
        t0 = time.time()
        gen = self.sql_generator.generate(
            state["query"],
            state["schema_context"],
            conversation_history=state.get("conversation_history", []),
        )
        return {
            "current_sql": gen["sql"],
            "sql_confidence": gen["confidence"],
            "stage_latency": {**state.get("stage_latency", {}),
                               "sql_generation": round(time.time() - t0, 3)},
        }

    def _node_execution_validate(self, state: PipelineState) -> dict:
        t0 = time.time()
        if not self.ablation.disable_execution_validator:
            vr = self.execution_validator.validate(state["current_sql"], self.db_path)
        else:
            vr = ValidationResult(
                success=True, results=[], column_names=[],
                error_type=None, error_message=None,
                is_empty=False, is_excessive=False, row_count=0,
            )
        stage_key = f"execution_validate_r{state.get('round_num', 1)}"
        return {
            "validation_result": vr,
            "stage_latency": {**state.get("stage_latency", {}),
                               stage_key: round(time.time() - t0, 3)},
        }

    def _node_semantic_verify(self, state: PipelineState) -> dict:
        t0 = time.time()
        if not self.ablation.disable_semantic_verifier:
            vr = self.semantic_verifier.verify(state["query"], state["current_sql"])
        else:
            vr = VerificationResult(
                back_translation="", similarity_score=1.0,
                is_consistent=True, mismatch_diagnosis=None,
            )
        stage_key = f"semantic_verify_r{state.get('round_num', 1)}"
        return {
            "verification_result": vr,
            "stage_latency": {**state.get("stage_latency", {}),
                               stage_key: round(time.time() - t0, 3)},
        }

    def _node_correct(self, state: PipelineState) -> dict:
        t0 = time.time()
        round_num = state.get("round_num", 1)
        val = state["validation_result"]
        ver = state["verification_result"]

        error_type = (val.error_type if val else None) or "SEMANTIC_MISMATCH"
        entry = {
            "round": round_num,
            "error_type": error_type,
            "original_sql": state["current_sql"],
            "validation_success": val.success if val else True,
            "semantic_score": ver.similarity_score if ver else 1.0,
        }
        corrected = self.corrector.correct(
            state["query"], state["current_sql"], val, ver
        )
        entry["corrected_sql"] = corrected

        stage_key = f"correction_round_{round_num}"
        return {
            "current_sql": corrected,
            "round_num": round_num + 1,
            "correction_history": [*state.get("correction_history", []), entry],
            "stage_latency": {**state.get("stage_latency", {}),
                               stage_key: round(time.time() - t0, 3)},
        }

    def _node_final_execute(self, state: PipelineState) -> dict:
        """교정 후 최종 실행 (correction_history가 있는 경우)."""
        vr = self.execution_validator.validate(state["current_sql"], self.db_path)
        return {"validation_result": vr}

    def _node_explain(self, state: PipelineState) -> dict:
        t0 = time.time()
        val = state.get("validation_result")
        results = val.results if (val and val.success) else []
        col_names = val.column_names if (val and val.success) else []

        explanation = self.result_explainer.explain(
            state["query"], state["current_sql"], results, state.get("correction_history", [])
        )

        # Guardrails
        ver = state.get("verification_result")
        nli_score = ver.similarity_score if ver else 1.0
        correction_history = state.get("correction_history", [])
        results, gr = self.output_guardrails.apply(
            results=results,
            sql_confidence=state.get("sql_confidence", 0.5),
            nli_score=nli_score,
            correction_rounds=len(correction_history),
            max_rounds=self.max_rounds,
        )

        return {
            "final_results": results,
            "final_column_names": col_names,
            "explanation": explanation,
            "guardrails_result": gr,
            "stage_latency": {**state.get("stage_latency", {}),
                               "explanation": round(time.time() - t0, 3)},
        }

    # ── 조건 분기 함수 ────────────────────────────────────────────────────────

    def _should_correct_after_validate(self, state: PipelineState) -> str:
        """실행 실패 시 correct, 성공 시 semantic_verify로 진행."""
        val = state.get("validation_result")
        if val is None or not val.success:
            round_num = state.get("round_num", 1)
            if round_num > self.max_rounds:
                return "final_execute"
            return "correct"
        return "semantic_verify"

    def _should_correct_after_verify(self, state: PipelineState) -> str:
        """의미 불일치 시 correct, 일치 시 explain으로 진행."""
        val = state.get("validation_result")
        ver = state.get("verification_result")
        round_num = state.get("round_num", 1)

        if val and (val.is_empty or val.is_excessive):
            if ver and not ver.is_consistent and round_num <= self.max_rounds:
                return "correct"
            return "explain"

        if ver and not ver.is_consistent and round_num <= self.max_rounds:
            return "correct"
        return "explain"

    def _after_correct(self, state: PipelineState) -> str:
        """교정 후 최대 라운드 초과 시 final_execute, 아니면 execution_validate."""
        if state.get("round_num", 1) > self.max_rounds:
            return "final_execute"
        return "execution_validate"

    # ── 그래프 빌드 ───────────────────────────────────────────────────────────

    def _build_graph(self):
        g = StateGraph(PipelineState)

        g.add_node("schema_link", self._node_schema_link)
        g.add_node("sql_generate", self._node_sql_generate)
        g.add_node("execution_validate", self._node_execution_validate)
        g.add_node("semantic_verify", self._node_semantic_verify)
        g.add_node("correct", self._node_correct)
        g.add_node("final_execute", self._node_final_execute)
        g.add_node("explain", self._node_explain)

        g.set_entry_point("schema_link")
        g.add_edge("schema_link", "sql_generate")
        g.add_edge("sql_generate", "execution_validate")

        g.add_conditional_edges(
            "execution_validate",
            self._should_correct_after_validate,
            {
                "semantic_verify": "semantic_verify",
                "correct": "correct",
                "final_execute": "final_execute",
            },
        )

        g.add_conditional_edges(
            "semantic_verify",
            self._should_correct_after_verify,
            {"correct": "correct", "explain": "explain"},
        )

        g.add_conditional_edges(
            "correct",
            self._after_correct,
            {"execution_validate": "execution_validate", "final_execute": "final_execute"},
        )

        g.add_edge("final_execute", "explain")
        g.add_edge("explain", END)

        return g.compile()

    # ── 공개 인터페이스 (SCTSQL.run()과 동일) ─────────────────────────────────

    def run(
        self,
        query: str,
        conversation_history: list[dict] | None = None,
    ) -> SCTSQLResult:
        """
        LangGraph 파이프라인을 실행하고 SCTSQLResult를 반환한다.
        SCTSQL.run()과 동일한 인터페이스.
        """
        total_start = time.time()

        initial_state: PipelineState = {
            "query": query,
            "conversation_history": conversation_history or [],
            "schema_context": {},
            "current_sql": "",
            "sql_confidence": 0.5,
            "round_num": 1,
            "validation_result": None,
            "verification_result": None,
            "correction_history": [],
            "stage_latency": {},
            "final_results": [],
            "final_column_names": [],
            "explanation": "",
            "guardrails_result": None,
        }

        final_state = self._graph.invoke(initial_state)

        latency = time.time() - total_start

        return SCTSQLResult(
            query=query,
            final_sql=final_state.get("current_sql", ""),
            results=final_state.get("final_results", []),
            column_names=final_state.get("final_column_names", []),
            correction_history=final_state.get("correction_history", []),
            explanation=final_state.get("explanation", ""),
            latency=latency,
            total_correction_rounds=len(final_state.get("correction_history", [])),
            final_validation=final_state.get("validation_result"),
            final_verification=final_state.get("verification_result"),
            stage_latency=final_state.get("stage_latency", {}),
            sql_confidence=final_state.get("sql_confidence", 0.5),
            guardrails=final_state.get("guardrails_result"),
        )

    def _fallback_schema_context(self) -> dict:
        """스키마 링커 비활성화 시 전체 스키마를 직접 읽어 반환한다."""
        import sqlite3
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        )
        tables = [row[0] for row in cursor.fetchall()]
        all_columns, fk_list, schema_lines = {}, [], []
        for table in tables:
            cursor.execute(f"PRAGMA table_info(`{table}`);")
            cols = [col[1] for col in cursor.fetchall()]
            all_columns[table] = cols
            col_defs = ", ".join(f"{c} TEXT" for c in cols)
            schema_lines.append(f"CREATE TABLE {table} ({col_defs});")
            cursor.execute(f"PRAGMA foreign_key_list(`{table}`);")
            for fk in cursor.fetchall():
                fk_list.append({"from": f"{table}.{fk[3]}", "to": f"{fk[2]}.{fk[4]}"})
        conn.close()
        return {
            "tables": tables, "columns": all_columns,
            "foreign_keys": fk_list,
            "schema_text": "\n\n".join(schema_lines),
        }
