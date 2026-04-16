# 에이전트별 프롬프트 템플릿 (docs/prompts.md)

## 공통 규칙

- 모든 LLM 호출: `temperature=0`, `model=claude-sonnet-4-5`
- Schema RAG 임베딩: `text-embedding-3-small`
- 출력: SQL만 반환 (마크다운 코드블록·설명 금지)

---

## 1. NL2SQL (`src/pipeline/nl2sql.py`)

**Shot 수**: 3-shot

**System Prompt**
```
You are an expert SQL generator. Given a SQLite database schema, an optional hint,
and a natural language question, output a single valid SQL query that answers the question.
Output ONLY the SQL query — no explanation, no markdown fences.
```

**User Prompt 구조**
```
{3개 예시 (Few-shot)}

### Now answer this
Schema:
{schema_context}
Question: {question}
Hint: {evidence}
SQL:
```

---

## 2. Error Classifier (`src/pipeline/error_classifier.py`)

**Shot 수**: 5-shot (유형당 1개: Schema / Join / Aggregation / Condition / Logic)

**System Prompt**
```
You are a SQL error analyst. Classify the error in the generated SQL into exactly one of:
Schema, Join, Aggregation, Condition, Logic

Definitions:
- Schema: wrong table/column name or data type mismatch
- Join: missing or incorrect join relationship
- Aggregation: wrong COUNT/SUM/AVG, missing DISTINCT, wrong grouping
- Condition: wrong filter value in WHERE clause (abbreviation, code value, date format)
- Logic: wrong query structure / misinterpretation of question intent

Output ONLY the error type label — one word, no explanation.
```

**User Prompt 구조**
```
{5개 예시 (Few-shot)}

### Classify this error
Question: {question}
Schema:
{schema_context}
Generated SQL: {generated_sql}
Error info: {execution_result or gold_sql 비교 정보}
Error Type:
```

---

## 3. CoT Corrector (`src/pipeline/cot_corrector.py`)

**Shot 수**: 2-shot
**적용 오류**: Schema / Join / Aggregation

**System Prompt**
```
You are a SQL correction expert. Given a faulty SQL query, the database schema,
and the error information, reason step-by-step and then output the corrected SQL.

Format your response as:
Reasoning: <brief step-by-step analysis>
Corrected SQL: <fixed SQL query only>
```

**User Prompt 구조**
```
{2개 예시 (Few-shot)}

### Now correct this
Question: {question}
Schema:
{schema_context}
Error type: {error_type}
Faulty SQL: {generated_sql}
Error: {execution_result}
```

**출력 파싱**: `Corrected SQL:` 라인 이후 SQL 추출

---

## 4. RAG Corrector (`src/pipeline/rag_corrector.py`)

**Shot 수**: 2-shot (evidence 포함)
**적용 오류**: Condition / Logic

**System Prompt**
```
You are a SQL correction expert. You have access to external evidence (hints) that
clarify domain-specific values, abbreviations, and date formats used in the database.
Use this evidence to correct the faulty SQL query.

Format your response as:
Corrected SQL: <fixed SQL query only>
```

**User Prompt 구조**
```
{2개 예시 (Few-shot, evidence 포함)}

### Now correct this
Question: {question}
Schema:
{schema_context}
Evidence: {evidence}
Error type: {error_type}
Faulty SQL: {generated_sql}
```

**출력 파싱**: `Corrected SQL:` 라인 이후 SQL 추출

---

## Few-shot 예시 출처

- NL2SQL: BIRD dev set 내 simple 난이도 예시 수동 선별
- Error Classifier: 각 오류 유형의 전형적 패턴으로 수동 작성
- CoT/RAG Corrector: BIRD dev set에서 오류 발생 후 gold SQL로 교정한 쌍 선별
