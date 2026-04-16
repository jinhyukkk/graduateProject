"""
Semantic Consistency Verifier (Section 4.4.2)
SQL 역번역 + NLI 일치 검증.
"""

import os
from dataclasses import dataclass
from openai import OpenAI
from sentence_transformers import CrossEncoder


@dataclass
class VerificationResult:
    """의미 일관성 검증 결과."""
    back_translation: str          # SQL의 자연어 역번역
    similarity_score: float        # NLI entailment score ∈ [0, 1]
    is_consistent: bool            # sim >= θ 여부
    mismatch_diagnosis: str | None = None  # 불일치 시 GPT-4o 진단 결과


class SemanticVerifier:
    """
    Section 4.4.2: 의미론적 일관성 검증기.

    Step 1: GPT-4o로 SQL을 자연어로 역번역한다.
    Step 2: NLI 모델(cross-encoder/nli-deberta-v3-base)로
            원래 질의와 역번역을 비교하여 entailment score를 계산한다.
            sim(q, q̂) = NLI entailment score ∈ [0, 1]
    Step 3: sim < θ=0.75 이면 불일치 → GPT-4o로 원인을 진단한다.
    """

    def __init__(self, config: dict):
        self.config = config
        self.client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.llm_model = config["llm"]["model"]
        self.threshold = config["correction"]["semantic_threshold"]  # θ=0.75
        self.nli_model_name = config["nli"]["model"]
        # NLI cross-encoder 로드
        self.nli_model = CrossEncoder(self.nli_model_name)

    def _back_translate(self, sql: str) -> str:
        """
        Section 4.4.2, Step 1: SQL을 자연어로 역번역한다.
        GPT-4o가 SQL 쿼리의 의도를 자연어로 설명한다.
        """
        prompt = f"""Translate the following SQL query into a natural language question that it answers.
Be precise and include all conditions, aggregations, and joins.
Return ONLY the natural language question, nothing else.

SQL: {sql}"""

        response = self.client.chat.completions.create(
            model=self.llm_model,
            temperature=0.0,
            max_completion_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()

    def _compute_nli_score(self, original_query: str, back_translation: str) -> float:
        """
        Section 4.4.2, Step 2: NLI 모델로 양방향 entailment score를 계산한다.
        sim(q, q̂) = min(P(q → q̂), P(q̂ → q)) ∈ [0, 1]

        NLI는 비대칭 관계이므로, 의미 동등성을 근사하기 위해 두 방향의
        entailment 확률 중 낮은 값을 취한다(보수적 집계). 단방향만 사용하면
        "원 질문이 역번역보다 더 구체적/일반적"인 경우 한쪽만 높게 나와
        오탐이 증가한다.

        cross-encoder/nli-deberta-v3-base 출력: [contradiction, entailment, neutral]
        """
        scores = self.nli_model.predict(
            [
                (original_query, back_translation),  # q → q̂
                (back_translation, original_query),  # q̂ → q
            ],
            apply_softmax=True,
        )
        # scores shape: (2, 3) → 각 행 [contradiction, entailment, neutral]
        forward = float(scores[0][1])
        backward = float(scores[1][1])
        return min(forward, backward)

    def _diagnose_mismatch(self, original_query: str, sql: str, back_translation: str) -> str:
        """
        Section 4.4.2, Step 3: 불일치 시 GPT-4o로 원인을 진단한다.
        """
        prompt = f"""The following SQL query does not correctly represent the user's intent.
Analyze the mismatch between the original question and the SQL query.

## Original Question
{original_query}

## Generated SQL
{sql}

## SQL's Meaning (back-translation)
{back_translation}

## Instructions
1. Identify the specific differences between what the user asked and what the SQL does.
2. Explain what needs to be changed in the SQL to match the user's intent.
3. Be concise and specific.

## Diagnosis"""

        response = self.client.chat.completions.create(
            model=self.llm_model,
            temperature=0.0,
            max_completion_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()

    def verify(self, original_query: str, sql: str) -> VerificationResult:
        """
        Section 4.4.2: 의미론적 일관성을 검증한다.

        Args:
            original_query: 원래 자연어 질의
            sql: 검증할 SQL 문자열

        Returns:
            VerificationResult: 검증 결과 (유사도 점수, 일치 여부, 진단 결과)
        """
        # Step 1: 역번역
        back_translation = self._back_translate(sql)

        # Step 2: NLI 점수 계산
        similarity_score = self._compute_nli_score(original_query, back_translation)

        # Step 3: θ=0.75 기준으로 일관성 판단
        is_consistent = similarity_score >= self.threshold

        mismatch_diagnosis = None
        if not is_consistent:
            mismatch_diagnosis = self._diagnose_mismatch(
                original_query, sql, back_translation
            )

        return VerificationResult(
            back_translation=back_translation,
            similarity_score=similarity_score,
            is_consistent=is_consistent,
            mismatch_diagnosis=mismatch_diagnosis,
        )
