# 실험 스펙: 비전문가 환경을 위한 자기교정 Text-to-SQL 시스템 (SC-TSQL)

## 연구 개요
- 문제: LLM 기반 Text-to-SQL 시스템의 오류를 비전문가 환경에서 자동으로 탐지·교정
- 핵심 기여:
  1. 구문·의미·논리 3계층 오류 분류 체계
  2. 실행 기반 검증 + 의미론적 일관성 검증의 이중 자기교정 루프
  3. Spider/BIRD/EnterpriseDB 실증 평가
- 코드 저장소: 없음 (졸업 프로젝트 자체 구현)

---

## 시스템 아키텍처

5개 모듈로 구성된 파이프라인:

```
자연어 질의
  → [1] Schema Linker         (임베딩 검색 + LLM 선택)
  → [2] SQL Generator         (Few-shot + GPT-4o)
  → [3] Self-Correction Loop  (최대 K=3회)
      ├── Execution-Based Validator  (샌드박스 실행 + 오류 분류)
      ├── Semantic Consistency Verifier  (역번역 + NLI 비교)
      └── Corrector  (구체적 오류 정보 포함 교정 프롬프트)
  → [4] Result Explainer      (비전문가용 자연어 설명)
```

### [1] Schema Linker
- 임베딩 모델: `text-embedding-3-large` (OpenAI)
- 코사인 유사도로 관련 테이블/컬럼 상위 K개 검색
- 수식: `S_relevance(q, s_i) = (q⃗ · s⃗_i) / (|q⃗| |s⃗_i|)`
- 이후 LLM이 최소 필요 스키마 선택 (외래키 관계 포함)

### [2] SQL Generator
- 기반 LLM: `gpt-4o-2024-11-20`
- Few-shot: 구조적 유사성 + 의미적 유사성 결합 점수로 3개 예시 선택 (DAIL-SQL 방식 참고)
- 프롬프트 구성: 역할 지시 + 스키마 + Few-shot 3개 + 오류 방지 생성 지침 + 대상 질의

### [3] Self-Correction Loop
**하이퍼파라미터:**
- K = 3 (최대 교정 반복 횟수, 기본값)
- θ = 0.75 (의미 일치 임계값)

**Execution-Based Validator:**
- 샌드박스 SQLite DB에 SQL 실행
- 실행 성공 + 결과 비어있음 → 논리 오류 플래그
- 실행 성공 + 결과 과대 → 필터/조인 오류 플래그
- 실행 오류 → 오류 메시지를 E1~E10 유형으로 분류

**Semantic Consistency Verifier:**
- Step 1: SQL 역번역 (LLM → 자연어 설명)
- Step 2: NLI 모델로 원래 질의 vs 역번역 비교 → sim(q, q̂) ∈ [0,1]
- Step 3: sim < θ=0.75 이면 불일치 → Corrector에 진단 결과 전달

**Corrector 프롬프트 구조:**
```
원래 질의: {user_query}
생성된 SQL: {generated_sql}
실행 결과: {execution_result}
감지된 오류: {error_type} - {error_message}
의미 일관성 진단: {mismatch_diagnosis}
위의 오류를 수정하여 올바른 SQL을 생성하세요.
수정한 부분과 이유를 간략히 설명하세요.
```

### [4] Result Explainer
- 최종 SQL + 실행 결과 → 자연어 요약 (GPT-4o)
- 교정 발생 시 어떤 문제가 수정됐는지 투명하게 안내

---

## 데이터셋

| 데이터셋 | 설명 | 규모 | 평가 세트 | DB 엔진 |
|---------|------|------|---------|--------|
| Spider | 크로스-도메인 Text-to-SQL 벤치마크 | 200개 DB, 10,181 쌍 | dev set (1,034) | SQLite |
| BIRD | 현실적 분포 반영 벤치마크 | 95개 DB, 1,534 dev | dev set (1,534) | SQLite |
| EnterpriseDB (내부) | 국내 제조업 ERP DB | 47 테이블, 312 컬럼, 200 질의 | 전체 | SQLite (모사) |

- Spider 다운로드: https://yale-lily.github.io/spider
- BIRD 다운로드: https://bird-bench.github.io/

---

## 평가 지표

| 지표 | 설명 | 적용 데이터셋 |
|------|------|------------|
| EX (Execution Accuracy) | 실행 결과 일치율 | Spider, BIRD, EnterpriseDB |
| VES (Valid Efficiency Score) | 실행 정확도 + 쿼리 효율성 결합 | BIRD |
| CSR (Correction Success Rate) | 초기 오류 쿼리 중 교정 성공 비율 | EnterpriseDB |
| Avg Latency | 질의 → 최종 결과 평균 소요 시간 (초) | 전체 |

---

## 베이스라인

| 모델 | 설명 |
|------|------|
| Zero-shot GPT-4o | 스키마만 제공, 추가 메커니즘 없음 |
| DIN-SQL | 단계적 질의 분해 파이프라인 |
| DAIL-SQL | 구조·의미 유사도 기반 예시 선택 |
| CHESS | 최신 파이프라인 (교정 모듈 포함) |
| SC-TSQL (ours) | 본 논문 제안 시스템 |

---

## 목표 성능 (재현 대상)

| 모델 | Spider EX | BIRD EX | BIRD VES | EnterpriseDB EX |
|------|-----------|---------|---------|----------------|
| Zero-shot GPT-4o | 82.1% | 59.3% | 0.612 | 51.5% |
| SC-TSQL | 90.7% | 72.8% | 0.763 | 72.8% |

---

## 하이퍼파라미터

| 파라미터 | 값 | 출처 |
|---------|-----|------|
| base_llm | gpt-4o-2024-11-20 | Section 5.1 |
| embedding_model | text-embedding-3-large | Section 4.2 |
| few_shot_k | 3 | Section 4.3 |
| max_correction_rounds (K) | 3 | Section 4.4 |
| semantic_threshold (θ) | 0.75 | Section 4.4.2 |

---

## 하드웨어/환경

- GPU: 불필요 (API 기반 LLM 사용)
- Python: 3.10+ 권장
- 주요 의존성: openai, transformers (NLI), sqlite3 (stdlib)
- API 키: OPENAI_API_KEY 필요
