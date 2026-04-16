# DAIL-SQL 논문 vs 구현 충실도 검증

검증일: 2026-04-16
대상 논문: Gao et al. (2024) "Text-to-SQL Empowered by Large Language Models: A Benchmark Evaluation", VLDB 2024
대상 구현: `src/baselines/dail_sql.py`
참조 공식 repo: https://github.com/BeachWang/DAIL-SQL

## 요약

- 일치: 1/7
- 부분 일치: 2/7
- 불일치: 4/7

**핵심 문제**: 현재 구현은 DAIL-SQL의 핵심 예시 선택 알고리즘을 정확히 재현하지 못하고 있다. 특히 (1) 유사도 대상이 SQL skeleton이 아닌 schema token으로 잘못 설정되어 있고, (2) question masking이 누락되어 있으며, (3) 유사도 메트릭이 Euclidean distance가 아닌 cosine similarity로 대체되어 있고, (4) 두 유사도의 결합 방식이 가중합이 아닌 threshold-based 2단계 필터링이어야 한다.

---

## 항목별 대조

### 1. 예시 선택 전략

- **논문**: DAIL Selection (EUCDISMASKPRESKLSIMTHR)은 **2단계 필터링 방식**이다.
  1. 질의를 schema linking으로 마스킹한 뒤 sentence-transformers로 임베딩하여 Euclidean distance를 계산한다.
  2. 예비(preliminary) SQL의 skeleton과 후보 예시의 SQL skeleton 간 Jaccard similarity를 계산한다.
  3. Euclidean distance 기준 정렬 후, Jaccard similarity >= 0.85인 예시를 우선 선택하고, 부족하면 0.85 미만인 예시로 폴백한다.
  - 즉, **가중합(weighted sum)이 아니라 distance 정렬 + skeleton similarity threshold 필터링**이다.

- **구현**: `_select_few_shot()`에서 `structural_weight * structural_scores + semantic_weight * semantic_scores`로 **가중합(0.5:0.5)**을 계산하여 top-K를 선택한다.

- **판정**: **불일치**
- **수정 필요**: 있음.
  - 가중합 방식을 폐기하고, 논문의 2단계 필터링으로 변경해야 한다:
    (a) Euclidean distance로 후보를 정렬
    (b) Jaccard similarity >= 0.85인 후보를 우선 선택
    (c) 부족 시 threshold 미만 후보로 폴백
  - `structural_weight`, `semantic_weight` config 항목은 제거하거나 `skeleton_sim_threshold: 0.85`로 대체

### 2. 구조 유사도 정의

- **논문**: "Query Skeleton Similarity"이다. **SQL skeleton** 간의 Jaccard similarity를 계산한다.
  - SQL skeleton은 `sql2skeleton()` 함수로 생성: SQL에서 테이블명, 컬럼명, 문자열 리터럴, 숫자를 모두 `_`로 치환하고 중복 절을 축약한 추상 구조이다.
  - 예: `SELECT _ FROM _ WHERE _ = _ AND _ > _` 형태
  - 비교 대상: (target의 예비 SQL skeleton) vs (후보 예시의 gold SQL skeleton)
  - Jaccard similarity = |skeleton_tokens 교집합| / |skeleton_tokens 합집합|

- **구현**: `_structural_similarity()`가 **스키마 DDL 토큰 간 Jaccard**를 계산한다. `schema_text`와 `example_schema`의 토큰을 비교하고 있다.

- **판정**: **불일치**
- **수정 필요**: 있음. 근본적으로 비교 대상이 다르다.
  - `_structural_similarity()`를 **SQL skeleton Jaccard**로 재구현해야 한다.
  - `sql2skeleton()` 함수 구현 필요: SQL에서 테이블명/컬럼명/값을 `_`로 치환
  - 비교 대상을 schema DDL이 아니라 SQL skeleton으로 변경
  - 단, 본 프로젝트에서는 예비 SQL이 없으므로 (1) few-shot pool의 gold SQL skeleton만 활용하거나, (2) 1-pass로 예비 SQL을 먼저 생성하는 2단계 전략을 구현해야 한다.
  - **경량 래퍼 타협안**: 예비 SQL 생성 단계를 생략하고, gold SQL skeleton 기반 Jaccard만 사용하되, 이 제한을 논문에 명시한다.

### 3. 의미 유사도 정의

- **논문**:
  - 임베딩 모델: `sentence-transformers/all-mpnet-base-v2` (SBERT 계열)
  - 비교 대상: **마스킹된 질의(masked question)** 간 비교. 질의에서 DB 엔티티(테이블명, 컬럼명, 값)를 `<mask>`/`<unk>`으로 치환한 뒤 임베딩한다.
  - 거리 메트릭: **Euclidean distance** (낮을수록 유사)
  - question만 비교 (question+SQL이 아님)

- **구현**:
  - 임베딩 모델: `text-embedding-3-large` (OpenAI API)
  - 비교 대상: 원본 질의(masking 없음)
  - 거리 메트릭: **cosine similarity** (높을수록 유사)
  - question만 비교 (이 점은 일치)

- **판정**: **부분 일치**
- **수정 필요**: 있음.
  - (a) **Question masking 구현 필요**: schema linking 결과를 이용해 질의에서 DB 엔티티를 `<mask>`, 값을 `<unk>`으로 치환하는 전처리 추가
  - (b) **임베딩 모델**: OpenAI embedding 사용은 "동일 LLM 환경 공정 비교"라는 프로젝트 방침상 정당화 가능. 단, 논문과의 차이를 실험 설계에 명시해야 한다.
  - (c) **거리 메트릭**: Euclidean distance로 변경하거나, cosine similarity 유지 시 논문과의 차이를 명시. 정규화된 임베딩에서는 cosine similarity와 Euclidean distance가 단조 변환 관계이므로 순위에 영향 없음 -- OpenAI embedding은 정규화되어 반환되므로 cosine으로 유지 가능하나 이를 주석으로 정당화해야 한다.

### 4. 프롬프트 포맷

- **논문**: DAIL-SQL의 최적 구성은 "Code Representation + DAIL Organization"이다.
  - **Code Representation (SQLPrompt)**: `/* Given the following database schema: */\n{schema DDL}\n\n/* Answer the following: {question} */\nSELECT `
  - **DAIL Organization (QA example format)**: 예시를 schema 없이 question-SQL 쌍만 제시: `/* Answer the following: {example_question} */\n{example_sql}`
  - 핵심 특징: (1) 스키마는 target에만 포함, 예시에는 미포함 (토큰 효율), (2) `SELECT `로 프라이밍, (3) SQL 주석(`/* */`) 스타일 래핑

- **구현**: `_build_prompt()`에서 영어 자연어 지시문 + Markdown 헤더 포맷을 사용한다.
  - `## Database Schema`, `## Guidelines` (7개 규칙), `## Examples`, `## Question`, `## SQL` 섹션
  - 예시 포맷: `### Example {i}\nQuestion: {q}\nSQL: {sql}`
  - `SELECT` 프라이밍 없음

- **판정**: **불일치**
- **수정 필요**: 있음.
  - 논문의 Code Representation + QA format으로 변경해야 한다:
    ```
    /* Given the following database schema: */
    {schema DDL}

    /* Answer the following: {example_q1} */
    {example_sql1}

    /* Answer the following: {example_q2} */
    {example_sql2}

    ...

    /* Answer the following: {target_question} */
    SELECT 
    ```
  - 현재의 `## Guidelines` 7개 규칙은 논문에 없는 추가 지시이므로 제거해야 한다.
  - 예시에서 schema를 제외하는 것이 DAIL Organization의 핵심이므로 유지.

### 5. Self-consistency

- **논문**: 최적 구성에서 self-consistency를 사용한다.
  - n=5 (5개 후보 생성), temperature=1.0
  - 다수결(majority voting)으로 최종 SQL 선택
  - self-consistency 적용 시 86.6% EX (Spider test), 미적용 시 86.2%

- **구현**: n=1 (단일 생성), temperature=0.0. Self-consistency 미구현. 주석에 "비용상 skip, 논문에 명시"라고 기재.

- **판정**: **부분 일치** (의도적 생략이며, 논문 최적 구성과 다르지만 self-consistency 없는 결과도 논문에 보고됨)
- **수정 필요**: 조건부.
  - 현재 방식(n=1, temperature=0.0)은 DAIL-SQL의 self-consistency **없는** 구성에 해당하며, 논문에서도 이 구성의 결과를 보고하고 있다(86.2% without SC vs 86.6% with SC).
  - **비용 제약으로 SC를 생략하는 것은 정당화 가능**하나, 논문 본문에서 "DAIL-SQL without self-consistency"임을 명시해야 한다.
  - 완전한 재현을 위해서는 SC 옵션을 config로 추가하는 것이 바람직: `self_consistency: {enabled: false, n: 5, temperature: 1.0}`

### 6. Few-shot 풀 구성

- **논문**: Spider/BIRD의 **train set**을 few-shot 풀로 사용한다. 평가 대상(dev/test)과 분리된 별도 데이터이다. k=9 (9-shot)가 최적.

- **구현**: `load_few_shot_pool()`은 `dev.json`을 풀로 로드하며, predict 시 자기 자신의 `question_id`만 제외한다. 주석에 "dev.json 내에서 현재 질의와 같은 db_id인 다른 질의를 cross-database few-shot으로 쓰거나, train set이 있으면 train을 쓴다"고 설명. k=3 (config 기본값).

- **판정**: **일치** (구조적으로는 올바름)
- **수정 필요**: 경미한 조정.
  - `load_few_shot_pool()`의 인터페이스는 train.json도 로드할 수 있도록 설계되어 있어, 호출 시 train set 경로를 넘기면 논문과 동일해진다.
  - **k=3은 논문(k=9)과 다르다.** config에서 `few_shot_k: 9`로 변경하거나, k=3을 사용하는 근거(토큰 제한, 비용)를 논문에 명시해야 한다.
  - 실험 실행 시 반드시 train set을 풀로 사용하고, dev set은 평가 전용으로 분리해야 한다. 현재처럼 dev.json을 풀로 쓰면 **데이터 누출(data leakage)** 위험이 있다.

### 7. 기타 차이

#### 논문에 있으나 구현에 없는 기능

| 기능 | 논문 상세 | 영향도 |
|------|-----------|--------|
| **Question masking** | Schema linking으로 DB 엔티티를 `<mask>`, 값을 `<unk>`으로 치환 | **높음** -- 핵심 알고리즘의 일부 |
| **SQL skeleton 추출** | `sql2skeleton()`: 테이블명/컬럼명/값을 `_`로 치환한 추상 SQL 구조 | **높음** -- 구조 유사도의 기반 |
| **예비 SQL 생성** | 1-pass로 예비 SQL을 생성한 뒤 그 skeleton을 2-pass 선택에 활용 | **중간** -- 경량 래퍼에서는 생략 가능하나 명시 필요 |
| **`SELECT ` 프라이밍** | 프롬프트 끝에 `SELECT `를 삽입하여 LLM이 SQL 생성을 즉시 시작하도록 유도 | **낮음** -- 성능 영향 미미하나 논문 충실도에 기여 |

#### 구현에 있으나 논문에 없는 기능

| 기능 | 구현 상세 | 판단 |
|------|-----------|------|
| **Guidelines 7개 규칙** | JOIN, NULL 처리, subquery 제한 등 추가 지시 | **제거 필요** -- DAIL-SQL 논문에 없는 추가 프롬프트이므로 공정 비교를 저해 |
| **Markdown 프롬프트 포맷** | `## Database Schema`, `### Example` 등 | **변경 필요** -- 논문의 SQL 주석 스타일(`/* */`)로 대체 |
| **Schema를 풀에 저장** | 각 예시에 schema DDL을 함께 저장 | **불필요** -- DAIL Organization은 예시에 schema를 포함하지 않음 |

---

## 수정 우선순위

| 순위 | 항목 | 난이도 | 사유 |
|------|------|--------|------|
| **P0** | 구조 유사도: schema Jaccard -> SQL skeleton Jaccard | 중 | 핵심 알고리즘 오류. 비교 대상 자체가 다름 |
| **P0** | 예시 선택: 가중합 -> threshold-based 2단계 필터링 | 중 | 논문의 핵심 선택 전략과 불일치 |
| **P0** | 프롬프트 포맷: Markdown -> SQL 주석 스타일 Code Representation | 하 | 공정 비교를 위해 필수. Guidelines 제거 포함 |
| **P1** | Question masking 추가 | 중 | 논문의 핵심 전처리. 없으면 의미 유사도 품질 저하 |
| **P1** | Few-shot 풀: dev -> train 분리, k=3 -> k=9 | 하 | 데이터 누출 방지 및 논문 구성 일치 |
| **P2** | SELECT 프라이밍 추가 | 하 | 성능 영향 미미하나 충실도 향상 |
| **P2** | Self-consistency 옵션 추가 (기본 비활성) | 중 | 비용상 비활성 유지하되 옵션으로 제공 |

---

## 경량 래퍼 타협안 (권장)

본 프로젝트는 DAIL-SQL "완벽 재현"이 아닌 "공정 비교를 위한 경량 래퍼"이므로, 다음 타협이 허용된다:

1. **예비 SQL 생성 생략**: 2-pass 대신, few-shot pool의 gold SQL skeleton만 활용하여 Jaccard를 계산한다. 논문에 "gold SQL skeleton 기반 선택"임을 명시.
2. **임베딩 모델**: sentence-transformers 대신 OpenAI embedding 사용. "동일 LLM 환경 통일"로 정당화. cosine similarity도 정규화된 벡터에서는 Euclidean distance와 동치이므로 유지 가능.
3. **Self-consistency 생략**: n=1, temperature=0.0. "without SC" 구성으로 명시.
4. **k=3 유지**: 토큰 비용 제약으로 k=9 대신 k=3 사용. 차이를 논문에 명시.

**그러나 다음은 타협 불가**:
- 구조 유사도 대상: schema DDL -> SQL skeleton (반드시 수정)
- 예시 선택 방식: 가중합 -> threshold 필터링 (반드시 수정)
- 프롬프트 포맷: 논문 원안 준수 (반드시 수정)
- Question masking: 최소한의 구현이라도 추가 (schema linking 기반 마스킹)
- Few-shot 풀 분리: dev를 풀로 쓰지 않음 (data leakage 방지)

---

## 참고 자료

- 논문 PDF: https://www.vldb.org/pvldb/vol17/p1132-gao.pdf
- 공식 GitHub: https://github.com/BeachWang/DAIL-SQL
- 핵심 소스: `prompt/ExampleSelectorTemplate.py` (selector), `utils/utils.py` (`sql2skeleton()`, `jaccard_similarity()`)
- arXiv: https://arxiv.org/abs/2308.15363
