# Pipeline Design

## State Definition (LangGraph TypedDict)

```python
class PipelineState(TypedDict):
    # 입력
    question: str           # 자연어 질의
    db_id: str              # BIRD database ID
    evidence: str           # BIRD external evidence (없으면 "")
    gold_sql: str           # 정답 SQL (평가용)

    # Schema RAG 출력
    schema_context: str     # 관련 테이블·컬럼 메타데이터

    # NL2SQL 출력
    generated_sql: str      # 생성된 SQL 초안

    # Validator 출력
    is_valid: bool          # 실행 성공 여부
    execution_result: Any   # 실행 결과 or 오류 메시지
    is_correct: bool        # 정답과 일치 여부

    # Error Classifier 출력
    error_type: str         # Schema/Join/Aggregation/Condition/Logic

    # Correction 출력
    corrected_sql: str      # 교정된 SQL
    correction_strategy: str # "CoT" or "RAG"

    # 최종
    final_sql: str
    final_result: Any
    is_final_correct: bool
```

## Agent Input/Output

| 단계 | 입력 (state fields) | 출력 (state fields) |
|------|---------------------|---------------------|
| Schema RAG | question, db_id | schema_context |
| NL2SQL | question, schema_context | generated_sql |
| Validator | generated_sql, db_id, gold_sql | is_valid, execution_result, is_correct |
| Error Classifier | generated_sql, schema_context, execution_result, gold_sql | error_type |
| CoT Corrector | generated_sql, error_type, schema_context, execution_result | corrected_sql |
| RAG Corrector | generated_sql, error_type, schema_context, evidence | corrected_sql |
| Executor | corrected_sql (or generated_sql), db_id, gold_sql | final_sql, final_result, is_final_correct |

## LangGraph Edge Logic

```
START
  → schema_rag
  → nl2sql
  → validator
  → [조건 분기]
      is_correct=True  → executor (교정 불필요)
      is_correct=False → error_classifier
                          → [조건 분기]
                              Schema/Join/Aggregation → cot_corrector
                              Condition/Logic         → rag_corrector
                          → executor
  → END
```

## Condition Variants

| 조건 | error_classifier | corrector | note |
|------|-----------------|-----------|------|
| C1 | OFF | OFF | validator 후 바로 executor |
| C2 | OFF | naive_retry | 동일 프롬프트 재생성 |
| C3 | OFF | cot_corrector | 모든 오류에 CoT |
| C4 | OFF | rag_corrector | 모든 오류에 RAG |
| C5 | ON | adaptive | 유형별 분기 (제안 방법) |

## Error Type Definitions

- **Schema**: 테이블명·컬럼명·데이터타입 오참조
- **Join**: 조인 관계 누락 또는 잘못된 조인 조건
- **Aggregation**: COUNT/SUM/AVG 선택·범위·DISTINCT 오류
- **Condition**: WHERE 절 필터값 오류 (약어, 코드값, 날짜 형식)
- **Logic**: 질문 의도 해석 오류 (쿼리 구조 자체가 틀림)

## Prompt Templates

각 에이전트 프롬프트는 @docs/prompts.md 참조.

## Few-shot Configuration

| 에이전트 | shot 수 | 비고 |
|---------|---------|------|
| NL2SQL | 3-shot | BIRD 예시 |
| Error Classifier | 5-shot (유형당 1개) | |
| CoT Corrector | 2-shot | |
| RAG Corrector | 2-shot | evidence 포함 |

## Evaluation

EX = (정답과 동일한 실행 결과 수) / 전체 600개
ECR = (교정 성공 수) / C1에서 오류 발생한 수

두 지표 모두 오류 유형별로 분해 보고.
