"""
SQL Generator (Section 4.3)
Few-shot 예시 선택 + GPT-4o SQL 생성.
"""

import os
import numpy as np
from openai import OpenAI


class SQLGenerator:
    """
    Section 4.3: Few-shot 기반 SQL 생성기.

    DAIL-SQL 방식 참고: 구조적 유사도(0.5) + 의미적 유사도(0.5) 가중합으로
    가장 유사한 예시 K개를 선택하여 few-shot 프롬프트를 구성한다.
    """

    def __init__(self, config: dict, few_shot_examples: list[dict] | None = None):
        """
        Args:
            config: configs/config.yaml에서 로드된 설정
            few_shot_examples: few-shot 후보 리스트. 각 항목은
                {"query": str, "sql": str, "schema": str, "db_id": str} 형태.
        """
        self.config = config
        self.client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.llm_model = config["llm"]["model"]
        self.embedding_model = config["embedding"]["model"]
        self.few_shot_k = config["sql_generator"]["few_shot_k"]
        self.few_shot_examples = few_shot_examples or []
        self._example_embeddings = None

    def _get_embedding(self, texts: list[str]) -> np.ndarray:
        """OpenAI 임베딩 API로 텍스트 리스트를 임베딩한다."""
        response = self.client.embeddings.create(
            model=self.embedding_model,
            input=texts,
        )
        return np.array([item.embedding for item in response.data], dtype=np.float32)

    def _compute_example_embeddings(self):
        """few-shot 예시들의 임베딩을 미리 계산한다."""
        if not self.few_shot_examples or self._example_embeddings is not None:
            return
        texts = [ex["query"] for ex in self.few_shot_examples]
        self._example_embeddings = self._get_embedding(texts)

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        """코사인 유사도를 계산한다."""
        a_norm = a / (np.linalg.norm(a, axis=-1, keepdims=True) + 1e-9)
        b_norm = b / (np.linalg.norm(b, axis=-1, keepdims=True) + 1e-9)
        return np.dot(a_norm, b_norm.T)

    def _structural_similarity(self, query_schema: str, example_schema: str) -> float:
        """
        Section 4.3: 구조적 유사도 계산.
        # 미명시: 스키마 토큰 Jaccard 유사도 적용 (DAIL-SQL 기본 설정)
        """
        query_tokens = set(query_schema.lower().split())
        example_tokens = set(example_schema.lower().split())
        if not query_tokens or not example_tokens:
            return 0.0
        intersection = query_tokens & example_tokens
        union = query_tokens | example_tokens
        return len(intersection) / len(union)

    def _select_few_shot(self, query: str, schema_text: str) -> list[dict]:
        """
        Section 4.3: 구조적 유사도(0.5) + 의미적 유사도(0.5) 가중합으로
        가장 유사한 K개 예시를 선택한다. (DAIL-SQL 방식 참고)
        """
        if not self.few_shot_examples:
            return []

        self._compute_example_embeddings()

        # 의미적 유사도: 질의 임베딩 vs 예시 질의 임베딩
        query_emb = self._get_embedding([query])
        semantic_scores = self._cosine_similarity(query_emb, self._example_embeddings)[0]

        # 구조적 유사도: 스키마 토큰 Jaccard
        structural_scores = np.array([
            self._structural_similarity(schema_text, ex.get("schema", ""))
            for ex in self.few_shot_examples
        ])

        # 가중합: 0.5 * structural + 0.5 * semantic
        combined_scores = 0.5 * structural_scores + 0.5 * semantic_scores

        # 상위 K개 선택
        top_indices = np.argsort(combined_scores)[::-1][:self.few_shot_k]
        return [self.few_shot_examples[i] for i in top_indices]

    def generate(self, query: str, schema_context: dict) -> str:
        """
        Section 4.3: SQL을 생성한다.

        Args:
            query: 자연어 질의
            schema_context: SchemaLinker.link()의 반환값 (schema_text 포함)

        Returns:
            생성된 SQL 문자열
        """
        schema_text = schema_context.get("schema_text", "")
        selected_examples = self._select_few_shot(query, schema_text)

        # Section 4.3: 프롬프트 구성 - 역할 지시 + 스키마 + Few-shot + 오류 방지 지침 + 대상 질의
        few_shot_block = self._format_few_shot(selected_examples)

        prompt = f"""You are an expert SQL query generator. Given a database schema and a natural language question, generate the correct SQL query.

## Database Schema
{schema_text}

## Guidelines
1. Use only the tables and columns provided in the schema above.
2. Use proper JOIN conditions based on foreign key relationships.
3. Be careful with aggregate functions (COUNT, SUM, AVG, etc.) and GROUP BY clauses.
4. Use appropriate WHERE clauses for filtering.
5. Handle NULL values appropriately.
6. Do NOT use subqueries unless necessary.
7. Return ONLY the SQL query, no explanations.

{few_shot_block}

## Question
{query}

## SQL
"""

        response = self.client.chat.completions.create(
            model=self.llm_model,
            temperature=self.config["llm"]["temperature"],
            max_tokens=self.config["llm"]["max_tokens"],
            messages=[{"role": "user", "content": prompt}],
        )

        sql = response.choices[0].message.content.strip()
        # SQL 코드 블록이 있으면 추출
        if "```sql" in sql:
            sql = sql.split("```sql")[1].split("```")[0].strip()
        elif "```" in sql:
            sql = sql.split("```")[1].split("```")[0].strip()

        return sql

    def _format_few_shot(self, examples: list[dict]) -> str:
        """선택된 few-shot 예시를 프롬프트 포맷으로 변환한다."""
        if not examples:
            return ""

        lines = ["## Examples"]
        for i, ex in enumerate(examples, 1):
            lines.append(f"\n### Example {i}")
            lines.append(f"Question: {ex['query']}")
            lines.append(f"SQL: {ex['sql']}")

        return "\n".join(lines)
