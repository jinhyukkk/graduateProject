# Positioning Decision

생성일: 2026-04-07
입력: `_workspace/gap_matrix.md`
전제 제약: **HR 스키마-온리 실험 설계** — 기업 인사관리 DB의 실데이터는 사용하지 않고, 테이블/컬럼/관계 등 스키마 구조만 이식하여 합성 데이터 또는 공개 벤치마크로 row-level을 채운다.

---

## 1. 고려된 옵션

### 옵션 A: "NL-space Intent Consistency Checker" — SQL→NL 역번역 + NLI 기반 의미검증을 일차 차별점으로

- **thesis**: 기존 자기교정 연구는 의미검증을 SQL 쪽(clause reasoning, SMT 동치성) 또는 DB 실행결과 쪽(unit test, executor)에서 수행했으나, SC-TSQL은 **생성된 SQL을 자연어로 역번역한 뒤 원 질의와 NLI 모델로 entailment/contradiction 판정**하는 **자연어 공간 의도 일치 검증**을 도입한다. 이로써 gold SQL·evidence·외부 DB 신호 없이도 의미 오류를 잡아내며, 검증 신호는 유형 진단과 함께 교정 루프의 트리거가 된다.
- **primary_gap**: gap_matrix §3-(1) "SQL→NL 역번역 + NLI 기반 의도 일치 검증 — 9편 모두에 없음 (진짜 gap)". 가장 근접한 CHESS NL Unit Test, SQLDriller NL execution, SQLens DB+LLM 신호 모두 구조가 다름.
- **novelty_strength**: **높음** — 9편 커버리지 매트릭스에서 semantic_check 축 1.0 보유 연구가 0편이며, 역번역+NLI 구조 자체가 전무.
- **feasibility_under_schema_only**:
  - 검증 가능 여부: **가능**
  - 실험 스케치:
    - 데이터: BIRD 공개 벤치마크(공정 비교용) + HR 스키마-온리 합성 셋(HR ERD 구조만 이식, row는 합성 생성기 또는 BIRD 서브셋 템플릿 매핑). HR 셋은 "스키마 구조가 의미검증에 어떻게 영향을 미치는가"를 보는 프로브로 사용.
    - 베이스라인: DIN-SQL, DAIL-SQL, CHESS (동일 GPT-4o 백본). SQL-of-Thought·SQLens는 comparator로 분석 테이블에 포함.
    - 평가 지표: Execution Accuracy, Valid Efficiency Score, Exact Match, 그리고 자체 제안 **Intent Consistency Score** (NLI entailment 확률 기반).
    - 어블레이션: (a) 역번역 제거, (b) NLI 제거(단일 LLM 자가판정으로 대체), (c) 유형 주입 제거, (d) 반복 루프 제거.
- **review_risk**:
  - 예상 반론 1: "역번역 NL이 이미 SQL을 반영하므로 NLI 비교가 순환적(self-consistency)에 가깝지 않나?" → 방어: 역번역에 SQL→NL 전용 모델(서로 다른 프롬프트/모델) 사용, SQLDriller식 counterexample 없이 entailment만 쓰는 구조적 차이 명시, self-consistency baseline과 분리 측정.
  - 예상 반론 2: "NLI 모델이 스키마·도메인 용어(HR)에 약해 false negative가 많지 않나?" → 방어: 도메인 정규화 단계(컬럼명→NL 표현 매핑)를 전처리에 두고, NLI 임계값을 dev set으로 튜닝, 오류 분석에 false alarm 구간 보고.
  - 예상 반론 3: "HR 실데이터가 없는데 어떻게 도메인 일반화를 주장하나?" → 방어: HR 스키마-온리 설계는 **privacy-preserving evaluation methodology**라는 독립 기여로 frame. 실데이터 분포 주장은 하지 않고, "스키마 구조가 유발하는 오류 패턴"만 주장 범위로 한정.

---

### 옵션 B: "Type-Branched Correction Prompting" — 유형별 전용 교정 템플릿 분기를 일차 차별점으로

- **thesis**: MapleRepair·SQL-of-Thought·SQLens는 유형/신호 정보를 공용 fixer 프롬프트에 "전달"할 뿐이다. SC-TSQL은 감지된 오류 유형을 프롬프트 변수로 받아 **유형별 전용 교정 템플릿**으로 분기하여, 스키마 링킹·GROUP BY·타입 캐스팅 등 서로 다른 failure mode에 차별화된 수정 전략을 적용한다.
- **primary_gap**: gap_matrix §3-(2) "유형-특화 프롬프트 분기 — 어느 선행도 구현 안 함 (부분 gap)".
- **novelty_strength**: **중간** — 유형 정보의 프롬프트 주입 자체는 선행연구에 부분 존재하고, "분기 템플릿화"는 엔지니어링 변주로 해석될 여지가 있어 방법론적 임팩트는 제한적.
- **feasibility_under_schema_only**:
  - 검증 가능 여부: **가능**
  - 실험 스케치:
    - 데이터: BIRD + HR 스키마-온리 합성 셋.
    - 베이스라인: SQL-of-Thought (taxonomy 일괄 주입형), MapleRepair 재현, DIN-SQL.
    - 평가 지표: EX, EM, 유형별 recovery rate.
    - 어블레이션: (a) 단일 공용 템플릿 vs 유형 분기, (b) 유형 분기 + NLI 결합.
- **review_risk**:
  - 예상 반론 1: "템플릿 분기는 엔지니어링 차원 개선 아닌가?" → 방어: 분기 자체의 정밀도 향상을 어블레이션으로 분리 측정, novelty는 "유형 진단 → 분기 → 재진입" 전체 파이프라인으로 주장.
  - 예상 반론 2: "유형 수가 많아지면 유지보수 비용이 크지 않나?" → 방어: 3계층 10유형으로 제한, 계층 상위에서 공통 프롬프트를 상속하는 구조 제안.

---

### 옵션 C: "Schema-Only HR Evaluation Protocol" — 프라이버시 친화적 HR 스키마 평가 프로토콜을 일차 차별점으로

- **thesis**: 9편 모두 Spider/BIRD 범용 벤치마크에 국한되어 있고, 실무 도메인(특히 HR) DB에서의 평가는 전무하다. SC-TSQL은 **실데이터 없이 스키마 구조만 이식하여 합성 row로 채우는 평가 프로토콜**을 제안하고, 여기에 SC-TSQL 자기교정 파이프라인을 검증한다. HR 스키마-온리 제약 자체를 방법론적 기여로 승격.
- **primary_gap**: gap_matrix §4 "HR 도메인 적용 지향" (축 밖 주장). 축 내 진짜 gap은 아니지만, 실험 제약과 가장 직접 결합.
- **novelty_strength**: **중간** — 프라이버시 친화 평가라는 각도는 있으나, "프로토콜 제안"만으로는 4축(분류/의미검증/주입/루프) 핵심 novelty를 대체하지 못한다.
- **feasibility_under_schema_only**:
  - 검증 가능 여부: **가능** (오히려 이 옵션은 제약 자체가 기여가 된다)
  - 실험 스케치: HR ERD/DDL 덤프 → 합성 row 생성기 → 질의 템플릿 → 모든 베이스라인 재실행. 평가: EX + "스키마 복잡도와 오류율의 상관" 분석.
- **review_risk**:
  - 예상 반론 1: "합성 데이터로 얻은 결과가 실무에 이전되나?" → 방어: 주장 범위를 스키마 구조 유발 오류에 국한, 분포 기반 주장 금지.
  - 예상 반론 2: "방법론 기여가 얇다(프로토콜 뿐)." → 방어: 옵션 A/B의 기술적 기여와 결합했을 때만 완성되므로, 단독 포지셔닝으로는 부족.

---

## 2. 점수표

| 옵션 | feasibility (0.40) | novelty (0.35) | defensibility (0.25) | 총점 |
|---|---|---|---|---|
| A: NL-space Intent Consistency Checker | 0.85 | 0.90 | 0.75 | **0.8275** |
| B: Type-Branched Correction Prompting | 0.90 | 0.55 | 0.70 | 0.7275 |
| C: Schema-Only HR Evaluation Protocol | 0.95 | 0.45 | 0.60 | 0.6875 |

계산:
- A: 0.40·0.85 + 0.35·0.90 + 0.25·0.75 = 0.340 + 0.315 + 0.1875 = **0.8425** → 반올림 0.84 (표 기재치 소수 반영)
- B: 0.40·0.90 + 0.35·0.55 + 0.25·0.70 = 0.360 + 0.1925 + 0.175 = **0.7275**
- C: 0.40·0.95 + 0.35·0.45 + 0.25·0.60 = 0.380 + 0.1575 + 0.150 = **0.6875**

(옵션 A 총점 정정: **0.8425**)

---

## 3. 선택 결과

- **선택**: 옵션 A — "NL-space Intent Consistency Checker" — SQL→NL 역번역 + NLI 의도 일치 검증을 일차 차별점으로, 옵션 B(유형 분기)를 보조 기여로, 옵션 C(스키마-온리 HR 프로토콜)를 평가 방법론 기여로 **통합**한다.

- **선택 근거**:
  1. gap_matrix가 9편 커버리지에서 "1.0 보유 0편"으로 확인한 유일한 **진짜 gap**이 semantic_check 축이며, 옵션 A가 이 축에 직접 대응한다.
  2. feasibility가 0.85로 충분히 높다 — BIRD 공개 데이터로 공정 비교가 가능하고, NLI는 off-the-shelf 모델(예: DeBERTa-NLI)로 즉시 돌릴 수 있어 HR 스키마-온리 제약과 충돌하지 않는다.
  3. defensibility 측면에서 "self-consistency와 무엇이 다른가"라는 가장 날카로운 반론에 대해 **모델/프롬프트 분리 + NLI 임계값 튜닝 + 분리 어블레이션**으로 방어 논리를 미리 준비할 수 있다.
  4. 옵션 B와 C는 단독으로는 novelty가 얇지만, A의 파이프라인 안에서 각각 "유형 분기 교정"과 "프라이버시 친화적 평가 프로토콜"로 자연스럽게 결합되어 **세 기여가 상호 강화**한다.
  5. HR 스키마-온리 제약을 약점 대신 C의 독립 기여로 승격시킴으로써 리뷰어가 "왜 실데이터가 없는가"를 공격하기 전에 **"이것이 바로 privacy-preserving evaluation methodology"**로 선제 framing 할 수 있다.

- **탈락 옵션 이유**:
  - **옵션 B 단독**: feasibility는 가장 높지만 novelty가 중간이며, 9편 중 3편이 이미 0.5로 유형 정보 주입을 구현 중이어서 "최초 제안"을 주장할 수 없다. 보조 기여로는 유효하므로 A와 통합.
  - **옵션 C 단독**: 프로토콜 제안만으로는 Text-to-SQL 방법론 학회(한국IT서비스학회) 기여로 얇고, 4축 핵심 gap(의미검증)에 직접 대응하지 못한다. 평가 방법론 기여로 흡수.

---

## 4. 선택된 포지셔닝의 실험 설계 스케치

### 데이터
- **Primary (공정 비교)**: BIRD 벤치마크 dev split — DIN-SQL, DAIL-SQL, CHESS와 동일 GPT-4o 백본으로 재실행.
- **Secondary (HR 스키마-온리)**:
  - 공개 HR 관리 시스템(예: OrangeHRM, Bitnami HR 샘플, 또는 기업 내부 DDL의 **구조만** 추출한 익명화 ERD)의 **테이블/컬럼/관계 DDL만** 추출.
  - Row-level은 **합성 데이터 생성기**(Faker + 스키마 제약 준수)로 채우거나, BIRD 내 유사 도메인(finance/personnel) 테이블에서 값 템플릿을 mapping.
  - 질의 셋: 실무에서 자주 발생하는 HR 조회 유형(재직/퇴직, 급여구간, 부서이동, 평가이력 등)을 템플릿화하여 NL 질의 50~100개 작성, gold SQL 수기 작성.
- **주장 범위 한정**: HR 셋에 대한 결과는 "스키마 구조가 유발하는 오류 패턴" 범위에서만 해석하며, 실데이터 분포 기반 주장은 하지 않는다.

### 베이스라인
- DIN-SQL (2023)
- DAIL-SQL (2023)
- CHESS (2024)
- (분석 comparator) SQL-of-Thought, SQLens, MapleRepair — 재현 가능한 경우만
- 모두 동일 GPT-4o 백본, 동일 retrieval/ICL 설정

### 평가 지표
- **Execution Accuracy (EX)**: BIRD 공식 지표
- **Valid Efficiency Score (VES)**: BIRD
- **Exact Match (EM)**: 구문 근접도
- **Intent Consistency Score (ICS)** (자체 제안): NLI entailment 확률 기반, 역번역 NL ↔ 원 질의
- **Type-wise Recovery Rate**: 10유형 각각에 대한 교정 성공률 (옵션 B 기여 측정)

### 어블레이션 축
1. 역번역 모듈 제거 (의미검증 off)
2. NLI 비교 제거 → LLM self-judge로 대체
3. 유형 진단 주입 제거 → 공용 교정 프롬프트
4. **유형 분기 템플릿** 제거 → 단일 템플릿
5. 반복 교정 루프 제거 → 단회 교정
6. NLI 임계값 스윕 (0.5 / 0.7 / 0.9)

### HR 스키마-온리 제약 통합 방식
- **표면 framing**: 본 연구의 평가 프로토콜은 "기업 인사관리 스키마의 구조만 이식하고 실데이터는 사용하지 않는 privacy-preserving evaluation"이며, 이는 실무 배포 전 단계에서 데이터 유출 없이 Text-to-SQL 자기교정 시스템을 검증할 수 있는 방법론적 기여다.
- **주장 한정**: HR 셋 결과는 EX/ICS의 절대 수치로 일반화하지 않고, "**스키마 구조 차원의 난이도(복합 관계, FK 체인, 유사 컬럼명)가 어떤 오류 유형을 유발하는가**"의 질적 분석과 "BIRD 대비 상대 성능 패턴"으로만 해석한다.
- **리뷰어 선제 방어**: 한계 절에 "실데이터 분포 일반화 주장 불가"를 명시하고, 후속 연구로 "기업 협력을 통한 on-premise 재검증"을 연결한다.
- **기여 문장화 (초록 반영용 제안)**:
  "본 연구는 (1) SQL→NL 역번역과 NLI 기반 의도 일치 검증을 도입한 의미 검증 메커니즘, (2) 감지된 오류 유형에 따라 분기되는 교정 프롬프트 전략, (3) 실데이터 없이 스키마 구조만 이식하는 프라이버시 친화적 HR 평가 프로토콜의 세 가지 기여를 제시한다."

---

## 플래그
- 없음 (정상 산출)
- 후속: `abstract-rewriter`가 본 문서의 §3 선택 결과와 §4 실험 설계를 초록에 통합.
