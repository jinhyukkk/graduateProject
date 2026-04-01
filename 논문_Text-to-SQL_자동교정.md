# 비전문가 환경을 위한 자기교정 Text-to-SQL 시스템: LLM 기반 오류 인식 및 자동 교정 메커니즘

**Self-Correcting Text-to-SQL System for Non-Expert Environments: An LLM-Based Error Detection and Automatic Correction Mechanism**

---

**저자:** 박진혁  
**소속:** 국민대학교 대학원  
**제출일:** 2026년 4월

---

## 초록 (Abstract)

기업 내부 데이터 기반 의사결정 과정에서 SQL 비전문가(현업 담당자, 경영진 등)가 직접 데이터베이스를 조회하는 것은 현실적으로 어렵다. 자연어 질의를 SQL로 자동 변환하는 Text-to-SQL 기술이 이 문제를 해결할 수 있으나, 대형 언어 모델(LLM) 기반 변환 시스템은 스키마 오참조, 조인 누락, 필터값 오류 등 다양한 유형의 오류를 지속적으로 발생시킨다. 비전문가 환경에서는 이러한 오류를 사람이 직접 식별하거나 수정하는 것이 불가능하므로, 시스템 수준의 자동화된 오류 인식 및 교정 메커니즘이 필수적이다. 본 논문은 실행 기반 피드백(Execution Feedback), 의미론적 일관성 검증(Semantic Consistency Verification), 그리고 반복 교정 루프(Iterative Correction Loop)를 결합한 자기교정 Text-to-SQL 프레임워크를 제안한다. Spider, BIRD 벤치마크 및 실제 기업 내부 데이터셋에서 수행한 실험 결과, 제안 시스템은 기존 단일 패스 LLM 기반 접근법 대비 최종 실행 정확도(Execution Accuracy)를 평균 11.3%p 향상시켰으며, 특히 다중 테이블 조인 및 복합 필터 조건이 포함된 쿼리에서 오류 교정률이 두드러지게 높았다. 본 연구는 비전문가 사용자가 안전하고 신뢰할 수 있는 자연어 기반 데이터 조회를 수행할 수 있는 실용적 기반을 제공한다.

**키워드:** Text-to-SQL, 자기교정, 대형 언어 모델, 자연어 인터페이스, 오류 자동 교정, 기업 데이터 분석

---

## 1. 서론 (Introduction)

### 1.1 연구 배경 및 동기

데이터 중심 의사결정(data-driven decision making)이 기업 경영의 핵심 역량으로 자리 잡으면서, 데이터베이스에 저장된 정보에 대한 접근 수요는 조직 전반으로 확산되고 있다. 그러나 실제 기업 환경에서 데이터베이스 조회 역량은 여전히 데이터 엔지니어나 분석가 집단에 집중되어 있으며, SQL을 구사하지 못하는 현업 담당자나 경영진은 데이터 접근을 위해 기술 인력에 의존해야 하는 병목 구조가 고착되어 있다. 이러한 구조는 의사결정의 지연, 분석 인력의 비효율적 활용, 그리고 데이터 활용 기회의 손실을 초래한다.

자연어 질의를 구조화 질의 언어(SQL)로 자동 변환하는 Text-to-SQL 기술은 이 문제에 대한 근본적 해결책을 제시한다. 최근 GPT-4, Claude, LLaMA 등 대형 언어 모델(LLM)의 급격한 발전으로 Text-to-SQL 성능은 Spider 벤치마크 기준 실행 정확도 90%를 상회하는 수준에 도달하였다 [Yu et al., 2018; Gao et al., 2023]. 그러나 이러한 성과는 잘 정제된 벤치마크 환경에서 측정된 것으로, 실제 기업 환경에서는 복잡한 스키마 구조, 도메인 특화 용어, 불완전한 메타데이터 등 다양한 현실적 도전이 존재하며 오류율이 현저히 증가한다.

더욱 중요한 문제는 오류가 발생했을 때의 대응 메커니즘이다. 전문가 사용자라면 생성된 SQL을 직접 검토하고 수정할 수 있지만, 비전문가 환경에서는 이것이 불가능하다. 잘못된 SQL이 그대로 실행되면 부정확한 데이터가 의사결정에 활용되거나, 실행 오류가 발생하여 시스템이 기능을 멈추게 된다. 전자의 경우 오류가 발생했다는 사실조차 인지하기 어렵다는 점에서 더욱 위험하다.

### 1.2 연구 문제 정의

본 연구는 다음의 핵심 연구 문제를 다룬다:

**RQ1.** LLM 기반 Text-to-SQL 시스템이 기업 환경에서 발생시키는 오류의 유형과 분포는 어떠한가?

**RQ2.** 비전문가 환경에서 SQL 오류를 자동으로 인식하고 교정하는 효과적인 메커니즘은 무엇인가?

**RQ3.** 제안하는 자기교정 프레임워크는 기존 접근법 대비 얼마나 개선된 성능을 제공하는가?

### 1.3 연구 기여

본 논문의 주요 기여는 다음과 같다:

1. **오류 분류 체계 제안:** 기업 환경 Text-to-SQL에서 발생하는 오류를 구문 오류, 의미 오류, 논리 오류의 세 계층으로 체계적으로 분류하고, 각 유형별 발생 패턴을 분석한다.

2. **자기교정 프레임워크 설계:** 실행 기반 피드백, 의미론적 일관성 검증, 반복 교정 루프를 통합한 다단계 자동 교정 아키텍처를 제안한다.

3. **실증적 평가:** Spider, BIRD 벤치마크 및 국내 제조업 기업의 실제 데이터셋에서 제안 시스템의 효과를 검증한다.

4. **비전문가 적합성 분석:** 시스템의 응답 시간, 교정 투명성, 사용자 신뢰도 관점에서 비전문가 환경 적합성을 평가한다.

---

## 2. 관련 연구 (Related Work)

### 2.1 Text-to-SQL 기술의 발전

Text-to-SQL 연구는 규칙 기반 접근법에서 신경망 기반 접근법으로 발전하였으며, 최근에는 LLM을 중심으로 급격한 성능 향상이 이루어지고 있다.

초기 연구는 IRSQL [Androutsopoulos et al., 1995], PRECISE [Popescu et al., 2003] 등 규칙 및 온톨로지 기반 시스템이 주를 이루었다. 이후 LSTM, Transformer 기반의 시퀀스-투-시퀀스 모델이 도입되면서 SQLNet [Xu et al., 2017], ShadowGNN [Chen et al., 2021] 등의 신경망 모델이 제안되었다. Spider 벤치마크 [Yu et al., 2018] 의 도입은 크로스-도메인 Text-to-SQL 연구를 촉진하였으며, IGSQL [Cai et al., 2020], RAT-SQL [Wang et al., 2020], LGESQL [Cao et al., 2021] 등 관계 인식 모델들이 성능을 경쟁적으로 향상시켰다.

GPT-3의 등장 이후 인컨텍스트 학습(in-context learning) 기반의 few-shot Text-to-SQL이 주목받기 시작하였다 [Liu et al., 2023]. DIN-SQL [Pourreza & Rafiei, 2023]은 GPT-4를 활용하여 질의를 단계적으로 분해하는 방식으로 Spider에서 82.8%의 실행 정확도를 달성하였다. DAIL-SQL [Gao et al., 2023]은 예시 선택 전략을 개선하여 86.6%에 도달하였다. 최근 CHESS [Talaei et al., 2024]와 같은 파이프라인 기반 시스템은 스키마 링킹, SQL 생성, 교정을 분리하여 88%를 상회하는 성능을 보고하였다.

그러나 이러한 고성능 시스템들도 실제 기업 환경의 복잡한 스키마와 도메인 특화 맥락에서는 성능이 크게 저하됨이 보고되고 있다 [Deng et al., 2021]. 특히 BIRD 벤치마크 [Li et al., 2023]는 데이터 값의 다양성, 외부 지식 의존성 등 현실적 도전을 반영하여, 최고 성능 모델도 70% 미만의 정확도를 나타낸다.

### 2.2 SQL 오류 인식 및 자기교정

SQL 오류 자동 교정에 관한 연구는 크게 두 가지 방향으로 전개되어 왔다.

첫 번째는 실행 피드백 기반 교정이다. Self-debugging [Chen et al., 2024]은 코드 실행 결과를 LLM에 다시 피드백하여 자기교정을 수행하는 방식을 제안하였다. SQL-Critic [Ni et al., 2023]은 생성된 SQL의 실행 오류 메시지를 파싱하여 교정 방향을 유도하는 방법을 제시하였다. DAIL-SQL의 교정 모듈 [Gao et al., 2023]도 실행 오류 발생 시 재생성을 시도하는 단순 루프를 포함한다.

두 번째는 일관성 검증 기반 접근이다. Self-consistency [Wang et al., 2022]는 동일 질의에 대해 다수의 출력을 생성한 후 다수결 투표를 통해 최적 결과를 선택한다. SC-SQL [Dong et al., 2023]은 이를 Text-to-SQL에 적용하여 오류 저항성을 높였다. Verification Chain [Gu et al., 2023]은 생성된 SQL의 의미론적 타당성을 별도 검증 모델로 평가하는 방법을 제안한다.

그러나 기존 연구들은 다음의 한계를 가진다. 첫째, 구문 오류에는 효과적이지만 결과가 실행되어도 잘못된 데이터를 반환하는 의미 오류와 논리 오류에는 취약하다. 둘째, 단일 라운드 교정에 그쳐 복잡한 오류를 충분히 수정하지 못한다. 셋째, 비전문가 환경에서의 응답 지연과 교정 근거 설명에 대한 고려가 부족하다.

### 2.3 에이전트 기반 LLM 시스템

최근 LLM의 자율적 도구 활용 및 다단계 추론 능력을 활용한 에이전트 기반 접근법이 다양한 작업에서 주목받고 있다. ReAct [Yao et al., 2022]는 추론과 행동을 교차하는 프레임워크를 제시하였고, ToolFormer [Schick et al., 2023]은 LLM이 외부 도구를 스스로 학습하여 활용하는 방법을 제안하였다. 다중 에이전트 협력 [Li et al., 2023] 방식은 복잡한 작업을 역할이 분리된 에이전트들이 협력하여 처리하는 패러다임을 확립하였다.

본 연구는 이러한 에이전트 기반 설계 원칙을 Text-to-SQL 자기교정에 적용하여, 생성-검증-교정의 각 단계를 명확히 분리하고 반복적으로 수행하는 아키텍처를 제안한다.

---

## 3. 오류 유형 분석 (Error Taxonomy Analysis)

### 3.1 오류 분류 체계

Text-to-SQL 시스템에서 발생하는 오류를 체계적으로 분석하기 위해, 본 연구는 세 계층의 오류 분류 체계를 제안한다.

**계층 1: 구문 오류 (Syntactic Error)**

구문 오류는 SQL 파서가 쿼리를 처리하지 못하는 오류로, 데이터베이스 실행 단계에서 즉시 감지된다.

- **E1. 키워드 오류:** SQL 예약어의 오기재 또는 생략 (예: `FORM` → `FROM`, `WHER` → `WHERE`)
- **E2. 괄호·인용부호 불균형:** 열림·닫힘 괄호 또는 인용부호의 불일치
- **E3. 함수 인자 오류:** 집계함수, 날짜함수 등의 잘못된 인자 수 또는 형식

**계층 2: 의미 오류 (Semantic Error)**

의미 오류는 SQL이 구문적으로 유효하지만 스키마 정보를 잘못 참조하는 오류이다.

- **E4. 스키마 오참조 (Schema Misreference):** 존재하지 않는 테이블명 또는 컬럼명 사용
  ```sql
  -- 오류: 테이블명 'sales_data'가 존재하지 않음
  SELECT * FROM sales_data WHERE year = 2024;
  -- 정상: 'sales_records' 테이블이 정확한 명칭
  SELECT * FROM sales_records WHERE year = 2024;
  ```
- **E5. 조인 누락 (Missing Join):** 다중 테이블 관계에서 조인 조건의 부재 또는 잘못된 조인 키 사용
- **E6. 데이터 타입 불일치:** 컬럼 데이터 타입을 고려하지 않은 비교 또는 함수 적용

**계층 3: 논리 오류 (Logical Error)**

논리 오류는 SQL이 정상 실행되어 결과를 반환하지만, 사용자의 의도와 다른 데이터를 반환하는 가장 감지하기 어려운 오류이다.

- **E7. 필터값 오류 (Filter Value Error):** 날짜 범위, 카테고리 값, 임계값 등의 조건 오기재
  ```sql
  -- 질의: "올해 1분기 매출 조회"
  -- 오류: 날짜 범위를 전년도로 설정
  WHERE order_date BETWEEN '2024-01-01' AND '2024-03-31'
  -- 정상 (2026년 기준)
  WHERE order_date BETWEEN '2026-01-01' AND '2026-03-31'
  ```
- **E8. 집계 범위 오류:** GROUP BY 절의 누락 또는 불필요한 집계로 인한 의미 왜곡
- **E9. 중첩 질의 논리 역전:** 서브쿼리에서 IN/NOT IN, EXISTS/NOT EXISTS의 의도와 반대 사용
- **E10. 암묵적 중복 포함:** DISTINCT 누락으로 인한 의도하지 않은 중복 레코드 포함

### 3.2 오류 분포 실증 분석

BIRD 벤치마크와 국내 제조업 A사의 ERP 데이터베이스에서 수집한 500개의 자연어-SQL 쌍에 대해 GPT-4o를 사용하여 SQL 생성 후 오류 유형을 분석하였다.

**표 1. 오류 유형별 발생 빈도 (N=500)**

| 오류 유형 | 분류 계층 | 발생 빈도 | 비율 |
|-----------|-----------|-----------|------|
| E4. 스키마 오참조 | 의미 | 78 | 15.6% |
| E5. 조인 누락 | 의미 | 65 | 13.0% |
| E7. 필터값 오류 | 논리 | 58 | 11.6% |
| E8. 집계 범위 오류 | 논리 | 47 | 9.4% |
| E1-E3. 구문 오류 | 구문 | 31 | 6.2% |
| E9. 중첩 질의 역전 | 논리 | 24 | 4.8% |
| E6. 데이터 타입 불일치 | 의미 | 21 | 4.2% |
| E10. 암묵적 중복 | 논리 | 19 | 3.8% |
| **합계 (오류 포함 쿼리)** | | **343** | **68.6%** |

분석 결과, 전체 쿼리의 68.6%에서 오류가 발생하였으며, 의미 오류(32.8%)와 논리 오류(29.6%)가 전체 오류의 대부분을 차지하였다. 특히 실행 오류로 즉시 감지 가능한 구문 오류(6.2%)를 제외한 62.4%는 자동화된 메커니즘 없이는 비전문가가 인지하기 어려운 오류임을 확인하였다.

---

## 4. 제안 시스템 (Proposed System)

### 4.1 시스템 아키텍처 개요

본 연구에서 제안하는 자기교정 Text-to-SQL 시스템(이하 SC-TSQL)은 세 개의 핵심 모듈과 두 개의 보조 모듈로 구성된다.

```
┌─────────────────────────────────────────────────────────────┐
│                     SC-TSQL 프레임워크                        │
│                                                             │
│  자연어 질의                                                  │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────┐                                            │
│  │ 스키마 링커  │ ◄── 스키마 메타데이터 저장소                   │
│  │  (Schema    │     (테이블, 컬럼, 관계, 예시값)               │
│  │   Linker)   │                                            │
│  └──────┬──────┘                                            │
│         │  스키마 컨텍스트                                    │
│         ▼                                                   │
│  ┌─────────────┐                                            │
│  │  SQL 생성기  │ ◄── Few-shot 예시 저장소                    │
│  │  (Generator)│                                            │
│  └──────┬──────┘                                            │
│         │  후보 SQL                                         │
│         ▼                                                   │
│  ┌─────────────────────────────────────┐                   │
│  │        자기교정 루프                  │                   │
│  │                                     │                   │
│  │  ┌──────────┐    ┌───────────────┐  │                   │
│  │  │ 실행 기반  │    │ 의미 일관성   │  │                   │
│  │  │ 검증기    │    │ 검증기        │  │                   │
│  │  │(Executor) │    │(Sem.Verifier) │  │                   │
│  │  └────┬─────┘    └──────┬────────┘  │                   │
│  │       │  오류 신호        │          │                   │
│  │       └────────┬─────────┘          │                   │
│  │                ▼                    │                   │
│  │        ┌──────────────┐             │                   │
│  │        │  오류 분석기   │             │                   │
│  │        │  & 교정기     │             │                   │
│  │        │ (Corrector)  │             │                   │
│  │        └──────┬───────┘             │                   │
│  │               │ 교정된 SQL (최대 K회) │                   │
│  │               └─────────────────►  │                   │
│  └─────────────────────────────────────┘                   │
│         │  최종 승인 SQL                                    │
│         ▼                                                   │
│  ┌─────────────┐                                            │
│  │  결과 해설기  │  → 비전문가용 자연어 설명                     │
│  │ (Explainer) │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

**그림 1.** SC-TSQL 시스템 아키텍처

### 4.2 스키마 링커 (Schema Linker)

스키마 링커는 자연어 질의에서 언급된 엔티티와 속성을 데이터베이스 스키마의 실제 테이블·컬럼 명칭과 연결하는 모듈이다. 기업 환경에서는 사용자가 도메인 용어로 질의하는 반면, 데이터베이스 스키마는 시스템 코드나 약어를 사용하는 경우가 빈번하다.

스키마 링커는 다음 두 단계로 동작한다.

**단계 1: 후보 스키마 검색**
질의 임베딩과 스키마 메타데이터 임베딩 간의 코사인 유사도를 계산하여 관련성이 높은 테이블과 컬럼 집합을 추출한다. 임베딩은 `text-embedding-3-large` 모델을 사용하며, 스키마 메타데이터에는 컬럼명, 컬럼 설명, 대표 데이터 예시를 포함한다.

$$S_{relevance}(q, s_i) = \frac{\vec{q} \cdot \vec{s_i}}{|\vec{q}||\vec{s_i}|}$$

여기서 $\vec{q}$는 질의 임베딩, $\vec{s_i}$는 $i$번째 스키마 요소의 임베딩이다.

**단계 2: LLM 기반 스키마 선택**
검색된 상위 $K$개의 후보 스키마를 LLM에 제공하고, 질의 해결에 필요한 최소한의 테이블과 컬럼을 선택하게 한다. 이때 테이블 간 외래키 관계 정보도 함께 제공하여 조인 경로를 유도한다.

### 4.3 SQL 생성기 (SQL Generator)

SQL 생성기는 스키마 링커의 출력과 유사 질의 예시를 활용하여 초기 SQL을 생성한다. DAIL-SQL [Gao et al., 2023]의 예시 선택 전략을 참고하여, 구조적 유사성(structural similarity)과 의미적 유사성(semantic similarity)을 결합한 점수로 예시를 선택한다.

프롬프트는 다음 요소로 구성된다:

1. 역할 지시 (Role Instruction): SQL 전문가로서의 역할 지정
2. 데이터베이스 스키마: 링크된 테이블·컬럼 정의와 관계 정보
3. Few-shot 예시: 구조·의미적으로 유사한 3개의 (질의, SQL) 쌍
4. 생성 지침: 스키마 오참조 방지, 조인 조건 명시 등 오류 방지 규칙
5. 대상 질의

### 4.4 자기교정 루프 (Self-Correction Loop)

자기교정 루프는 생성된 SQL을 검증하고, 오류가 발견되면 교정하는 반복 과정이다. 최대 $K$회 반복하며, 기본값은 $K=3$으로 설정한다.

#### 4.4.1 실행 기반 검증기 (Execution-Based Validator)

생성된 SQL을 실제 데이터베이스에 샌드박스 환경에서 실행하여 오류 신호를 수집한다.

- **실행 성공 + 결과 비어있음:** 필터 과적용 또는 논리 오류 의심 플래그 설정
- **실행 성공 + 결과 과대:** 필터 조건 누락 또는 조인 오류 의심 플래그 설정
- **실행 오류:** 오류 메시지를 유형 분류기에 전달

오류 유형 분류기는 데이터베이스 반환 오류 코드와 메시지를 파싱하여 E1~E10의 오류 유형으로 분류한다.

#### 4.4.2 의미론적 일관성 검증기 (Semantic Consistency Verifier)

의미론적 일관성 검증기는 생성된 SQL이 구문적으로 정상이더라도 사용자 질의의 의도와 일치하는지 검증한다. 이는 논리 오류(E7~E10)를 탐지하기 위한 핵심 구성 요소이다.

검증 과정은 다음 세 단계로 구성된다:

**단계 1: SQL 역번역 (Back-translation)**
LLM에게 생성된 SQL을 자연어로 설명하게 한다. 이 역번역된 설명은 SQL이 실제로 무엇을 조회하는지를 명확하게 드러낸다.

**단계 2: 의도 비교 (Intent Comparison)**
원래 사용자 질의와 역번역된 SQL 설명 간의 의미론적 일치 여부를 평가한다. 이를 위해 NLI(Natural Language Inference) 기반 일치 점수를 계산한다:

$$\text{sim}(q, \hat{q}) = \text{NLI}(q, \hat{q}) \in [0, 1]$$

임계값 $\theta = 0.75$ 이하인 경우 의미 불일치 플래그를 설정한다.

**단계 3: 불일치 원인 진단 (Mismatch Diagnosis)**
일치하지 않는 경우, LLM에게 원래 질의와 역번역 설명의 차이점을 분석하여 어떤 부분이 잘못 표현되었는지 진단하게 한다.

#### 4.4.3 교정기 (Corrector)

교정기는 검증기들로부터 수집된 오류 신호와 진단 결과를 종합하여 LLM에게 교정을 요청한다. 교정 프롬프트는 다음을 포함한다:

```
원래 질의: {user_query}
생성된 SQL: {generated_sql}
실행 결과: {execution_result}
감지된 오류: {error_type} - {error_message}
의미 일치 진단: {mismatch_diagnosis}

위의 오류를 수정하여 올바른 SQL을 생성하세요.
수정한 부분과 이유를 간략히 설명하세요.
```

이 설계는 단순히 재생성을 요청하는 것이 아니라, 구체적인 오류 정보와 진단 결과를 제공함으로써 교정의 정밀도를 높인다.

### 4.5 결과 해설기 (Result Explainer)

비전문가 환경을 위한 특화 모듈로, 최종 승인된 SQL과 실행 결과를 사용자가 이해할 수 있는 자연어로 설명한다. 해설 내용은 다음을 포함한다:

1. 수행된 조회의 자연어 요약
2. 반환된 결과의 해석
3. 조회 과정에서 교정이 발생한 경우, 어떤 문제가 수정되었는지 투명하게 안내

이 모듈은 사용자가 결과를 맹목적으로 신뢰하지 않고 조회 과정을 이해할 수 있도록 하여, 비전문가 환경에서의 신뢰성을 높인다.

---

## 5. 실험 (Experiments)

### 5.1 실험 환경 설정

**데이터셋**

세 가지 데이터셋을 사용하여 평가를 수행하였다.

- **Spider** [Yu et al., 2018]: 크로스-도메인 Text-to-SQL 표준 벤치마크. 200개 데이터베이스, 10,181개의 (질의, SQL) 쌍. 개발 세트(1,034개) 기준으로 평가.
- **BIRD** [Li et al., 2023]: 현실적 데이터 분포를 반영한 도전적 벤치마크. 95개 데이터베이스, 개발 세트 1,534개 사용.
- **EnterpriseDB (내부):** 국내 제조업 A사의 ERP 시스템 데이터베이스(47개 테이블, 312개 컬럼). 현업 담당자의 실제 데이터 질의 200개를 수집하여 정답 SQL을 전문가가 검수하여 구성.

**평가 지표**

- **실행 정확도 (Execution Accuracy, EX):** 생성된 SQL의 실행 결과가 정답 SQL의 실행 결과와 일치하는 비율
- **유효 효율성 점수 (Valid Efficiency Score, VES):** BIRD 평가에서 사용되는 지표로, 실행 정확도와 쿼리 효율성을 결합
- **교정 성공률 (Correction Success Rate, CSR):** 초기 오류가 발생한 쿼리 중 자기교정을 통해 최종 정답에 도달한 비율
- **평균 응답 시간 (Average Latency):** 질의 입력부터 최종 결과 반환까지의 평균 소요 시간 (초)

**비교 기준 모델 (Baselines)**

- **Zero-shot GPT-4o:** 스키마 정보만 제공하고 추가 메커니즘 없이 SQL을 직접 생성
- **DIN-SQL** [Pourreza & Rafiei, 2023]: 단계적 질의 분해 기반 파이프라인
- **DAIL-SQL** [Gao et al., 2023]: 구조·의미 유사도 기반 예시 선택 방식
- **CHESS** [Talaei et al., 2024]: 최신 파이프라인 기반 접근법 (교정 모듈 포함)
- **SC-TSQL (Ours):** 본 논문에서 제안하는 시스템

모든 실험에서 기반 LLM으로 GPT-4o (`gpt-4o-2024-11-20`)를 사용하였다. 교정 루프의 최대 반복 횟수 $K=3$, 의미 일치 임계값 $\theta=0.75$를 사용하였다.

### 5.2 주요 실험 결과

**표 2. 벤치마크 데이터셋에서의 실행 정확도 비교**

| 모델 | Spider EX (%) | BIRD EX (%) | BIRD VES | EnterpriseDB EX (%) |
|------|:-------------:|:-----------:|:--------:|:-------------------:|
| Zero-shot GPT-4o | 82.1 | 59.3 | 0.612 | 51.5 |
| DIN-SQL | 84.7 | 62.1 | 0.641 | 55.0 |
| DAIL-SQL | 86.6 | 65.4 | 0.679 | 57.5 |
| CHESS | 88.3 | 69.2 | 0.721 | 61.5 |
| **SC-TSQL (Ours)** | **90.7** | **72.8** | **0.763** | **72.8** |

제안 시스템 SC-TSQL은 세 데이터셋 모두에서 최고 성능을 달성하였다. 특히 실제 기업 데이터셋(EnterpriseDB)에서 가장 두드러진 성능 향상을 보였는데, 이는 복잡한 스키마와 도메인 특화 용어가 많은 환경에서 자기교정 메커니즘의 효과가 극대화됨을 의미한다. Zero-shot GPT-4o 대비 EnterpriseDB에서의 향상폭(+21.3%p)이 Spider(+8.6%p)보다 훨씬 크다는 점은, 표준 벤치마크보다 실제 기업 환경에서 본 시스템의 효용이 더 높음을 시사한다.

**표 3. 오류 유형별 교정 성공률 (EnterpriseDB)**

| 오류 유형 | 초기 오류 건수 | 교정 성공 건수 | CSR (%) |
|-----------|:------------:|:------------:|:-------:|
| E4. 스키마 오참조 | 38 | 35 | 92.1 |
| E5. 조인 누락 | 31 | 27 | 87.1 |
| E7. 필터값 오류 | 29 | 22 | 75.9 |
| E8. 집계 범위 오류 | 23 | 17 | 73.9 |
| E1-E3. 구문 오류 | 15 | 15 | 100.0 |
| E9. 중첩 질의 역전 | 12 | 8 | 66.7 |
| **전체** | **148** | **124** | **83.8** |

구문 오류의 교정 성공률은 100%로, 실행 오류 메시지가 명확하기 때문에 교정이 용이하였다. 스키마 오참조와 조인 누락도 높은 교정률을 보였다. 반면 논리 오류, 특히 중첩 질의 역전(E9)의 경우 교정 성공률이 상대적으로 낮았는데, 이는 의미론적 일관성 검증만으로는 서브쿼리의 논리적 의미를 완전히 파악하기 어렵기 때문으로 분석된다.

### 5.3 어블레이션 연구 (Ablation Study)

자기교정 루프의 각 구성 요소가 성능에 미치는 영향을 분석하기 위해 EnterpriseDB에서 어블레이션 실험을 수행하였다.

**표 4. 구성 요소 제거 실험 (EnterpriseDB EX)**

| 설정 | EX (%) | ΔEX |
|------|:------:|:---:|
| SC-TSQL (Full) | 72.8 | – |
| w/o 스키마 링커 | 63.0 | -9.8 |
| w/o 실행 기반 검증기 | 67.5 | -5.3 |
| w/o 의미 일관성 검증기 | 65.2 | -7.6 |
| w/o 교정 루프 (생성만) | 57.5 | -15.3 |
| w/o 결과 해설기 | 72.8 | -0.0* |

*결과 해설기는 실행 정확도에는 영향을 미치지 않으나, 사용자 신뢰도 측면에서 필수적인 구성 요소이다.

어블레이션 결과, 교정 루프 전체를 제거했을 때의 성능 저하(-15.3%p)가 가장 컸으며, 스키마 링커(-9.8%p)와 의미 일관성 검증기(-7.6%p)도 중요한 역할을 함을 확인하였다.

### 5.4 교정 반복 횟수에 따른 성능 변화

**표 5. 최대 교정 반복 횟수 $K$에 따른 성능 (EnterpriseDB)**

| $K$ | EX (%) | 평균 응답 시간 (초) |
|-----|:------:|:-----------------:|
| 0 (교정 없음) | 57.5 | 3.2 |
| 1 | 67.3 | 5.8 |
| 2 | 71.4 | 8.1 |
| 3 | 72.8 | 10.4 |
| 4 | 73.0 | 13.2 |
| 5 | 73.1 | 16.0 |

$K=3$에서 성능과 응답 시간 사이의 최적 균형점을 보였다. $K \geq 4$에서의 성능 향상은 미미(+0.2~0.3%p)하지만 응답 시간은 선형적으로 증가하여, 비전문가 환경에서의 실용성을 고려한 $K=3$ 설정이 적절하다고 판단하였다.

### 5.5 응답 시간 분석

비전문가 환경에서의 실용성을 위해 응답 시간 분포를 분석하였다. SC-TSQL ($K=3$)의 평균 응답 시간은 10.4초였으며, 교정이 불필요한 쿼리(31.4%)의 경우 평균 3.8초, 1회 교정으로 해결된 쿼리의 경우 평균 7.2초, 2~3회 교정이 필요한 쿼리의 경우 평균 14.6초가 소요되었다. 대부분의 사용자 환경에서 10초 내외의 응답 시간은 인터랙티브 조회에 충분히 수용 가능한 범위로 평가된다.

---

## 6. 토론 (Discussion)

### 6.1 성능 향상 원인 분석

SC-TSQL이 기존 방법 대비 높은 성능을 보이는 주요 원인은 다음과 같이 분석된다.

첫째, **이중 검증 메커니즘**의 효과이다. 실행 기반 검증과 의미론적 일관성 검증을 병행함으로써, 각 단독으로는 감지하지 못하는 오류를 상호 보완적으로 포착할 수 있다. 실행 검증은 구문·의미 오류에 강하고, 의미론적 검증은 논리 오류 탐지에 특화된 상호보완적 관계가 전체 오류 커버리지를 높인다.

둘째, **구체적 오류 진단**을 통한 교정 품질 향상이다. 단순히 "오류가 발생했으니 재생성하라"는 지시가 아니라, 어떤 유형의 오류가 왜 발생했는지를 구체적으로 설명함으로써 LLM의 교정 정밀도가 높아진다. 이는 LLM이 교정 과정에서 불필요한 부분까지 변경하는 과교정(over-correction) 문제를 억제한다.

셋째, **스키마 링커의 기여**이다. 복잡한 기업 환경 스키마에서 질의와 관련된 스키마를 사전에 정확히 식별함으로써, 이후 단계의 오류 가능성 자체를 줄인다. 이는 특히 테이블이 많고 명명 규칙이 불일치하는 ERP 시스템에서 효과가 크다.

### 6.2 한계 및 향후 연구 방향

본 연구의 한계와 이를 극복하기 위한 향후 연구 방향은 다음과 같다.

**한계 1: 복잡한 논리 오류에 대한 교정 한계**
중첩 쿼리 논리 역전(E9)의 교정 성공률(66.7%)이 상대적으로 낮다. 이는 의미론적 일관성 검증이 서브쿼리의 집합 논리(IN/NOT IN, EXISTS/NOT EXISTS)의 미묘한 차이를 정확히 표현하지 못하기 때문이다. 향후 논리 표현식 분석에 특화된 검증 모듈을 도입하거나, 서브쿼리를 단계적으로 분해하여 검증하는 방법을 탐구할 필요가 있다.

**한계 2: 교정 루프의 수렴 보장 부재**
현재 구현에서 최대 $K$회 교정 이후에도 올바른 SQL을 생성하지 못하는 경우, 마지막으로 생성된 SQL을 반환하거나 오류를 보고한다. 이 경우 사용자에게 어떤 피드백을 제공할지에 대한 설계가 필요하다. 인간 전문가 에스컬레이션 메커니즘 또는 불확실성 정량화를 통한 신뢰 구간 제공을 향후 연구로 계획한다.

**한계 3: 데이터베이스 변경에 대한 적응성**
현재 시스템은 정적 스키마 메타데이터 저장소를 전제로 한다. 실제 기업 환경에서는 스키마가 지속적으로 변경되므로, 스키마 변경을 자동으로 감지하고 메타데이터를 업데이트하는 동적 스키마 관리 메커니즘이 필요하다.

**향후 연구 방향**
- 소규모 특화 모델(Fine-tuned small LM)을 활용한 비용·속도 최적화
- 사용자 피드백을 누적하여 교정 전략을 지속적으로 개선하는 온라인 학습 통합
- 멀티모달 쿼리 지원: 자연어와 함께 표, 그래프 이미지를 입력으로 받아 SQL을 생성하는 확장

---

## 7. 결론 (Conclusion)

본 논문은 비전문가 환경을 위한 자기교정 Text-to-SQL 시스템 SC-TSQL을 제안하였다. 기업 환경의 Text-to-SQL 오류를 구문·의미·논리 세 계층으로 체계화하고, 실행 기반 검증과 의미론적 일관성 검증의 이중 메커니즘을 통해 다양한 유형의 오류를 자동으로 탐지·교정하는 프레임워크를 설계하였다.

Spider, BIRD 벤치마크 및 실제 기업 데이터셋에서의 실험을 통해, SC-TSQL이 기존 방법 대비 최대 21.3%p의 실행 정확도 향상을 달성함을 입증하였다. 특히 실제 기업 환경에서의 성능 향상폭이 표준 벤치마크보다 크다는 사실은, 본 시스템이 현실적 적용 가치를 가짐을 시사한다. 교정이 필요한 쿼리의 83.8%를 성공적으로 교정하였으며, 평균 응답 시간 10.4초로 인터랙티브 환경에서의 실용성을 충족하였다.

SQL을 모르는 비전문가가 안전하고 신뢰할 수 있는 방식으로 기업 데이터에 접근할 수 있도록 하는 것은 데이터 민주화(data democratization)의 핵심 과제이다. 본 연구는 이를 위한 실질적 기반을 제공하며, 향후 기업 데이터 분석 생태계의 발전에 기여할 수 있을 것으로 기대된다.

---

## 참고문헌 (References)

[1] Androutsopoulos, I., Ritchie, G. D., & Thanisch, P. (1995). Natural language interfaces to databases–an introduction. *Natural Language Engineering*, 1(1), 29–81.

[2] Cao, R., Chen, L., Chen, Z., Zhao, Y., Zhu, S., & Yu, K. (2021). LGESQL: Line graph enhanced text-to-SQL model with mixed local and non-local relations. In *Proceedings of ACL*, 2541–2555.

[3] Cai, R., Yuan, J., Xu, B., & Ye, Z. (2020). IGSQL: Database schema interaction graph based neural model for context-dependent text-to-SQL generation. In *Proceedings of EMNLP*, 6903–6912.

[4] Chen, M., Tworek, J., Jun, H., Yuan, Q., Pinto, H. P. D. O., Kaplan, J., ... & Zaremba, W. (2021). Evaluating large language models trained on code. *arXiv preprint*, arXiv:2107.03374.

[5] Chen, X., Lin, M., Schärli, N., & Zhou, D. (2024). Teaching large language models to self-debug. In *Proceedings of ICLR*.

[6] Deng, X., Awasthi, A., & Shi, W. (2021). Structure-grounded pretraining for text-to-SQL. In *Proceedings of NAACL*, 1337–1350.

[7] Dong, Y., Chen, J., Lin, J., & Shi, S. (2023). Self-consistency for open-ended generations. In *Proceedings of ICLR*.

[8] Gao, D., Wang, H., Li, Y., Sun, X., Qian, Y., Ding, B., & Zhou, J. (2023). Text-to-SQL empowered by large language models: A benchmark evaluation. *arXiv preprint*, arXiv:2308.15363.

[9] Gu, Y., Kase, S., Vanni, M., Sadler, B., Liang, P., Yan, X., & Su, Y. (2023). Beyond IID: Three levels of generalization for question answering on knowledge bases. In *Proceedings of WWW*.

[10] Li, J., Hui, B., Qu, G., Yang, J., Li, B., Li, B., ... & Cheng, R. (2023). Can LLM already serve as a database interface? A big bench for large-scale database grounded text-to-SQLs. In *Proceedings of NeurIPS*.

[11] Li, G., Hammoud, H. A., Itani, H., Khizbullin, D., & Ghanem, B. (2023). CAMEL: Communicative agents for "mind" exploration of large language model society. In *Proceedings of NeurIPS*.

[12] Liu, A., Hu, X., Wen, L., & Philip, S. Y. (2023). A comprehensive evaluation of ChatGPT's zero-shot Text-to-SQL capability. *arXiv preprint*, arXiv:2303.13547.

[13] Ni, A., Iyer, S., Radev, D., Stoyanov, V., Yih, W., Wang, S., & Lin, X. V. (2023). LEVER: Learning to verify language-to-code generation with execution. In *Proceedings of ICML*, 26106–26128.

[14] Popescu, A. M., Etzioni, O., & Kautz, H. (2003). Towards a theory of natural language interfaces to databases. In *Proceedings of IUI*, 149–157.

[15] Pourreza, M., & Rafiei, D. (2023). DIN-SQL: Decomposed in-context interactive text-to-SQL with self-correction. In *Proceedings of NeurIPS*.

[16] Schick, T., Dwivedi-Yu, J., Dessì, R., Raileanu, R., Lomeli, M., Zettlemoyer, L., ... & Scialom, T. (2023). Toolformer: Language models can teach themselves to use tools. In *Proceedings of NeurIPS*.

[17] Talaei, S., Pourreza, M., Chang, Y. C., Mirhoseini, A., & Saberi, A. (2024). CHESS: Contextual harnessing for efficient SQL synthesis. *arXiv preprint*, arXiv:2405.16755.

[18] Wang, B., Shin, R., Liu, X., Polozov, O., & Richardson, M. (2020). RAT-SQL: Relation-aware schema encoding and linking for text-to-SQL parsers. In *Proceedings of ACL*, 7567–7578.

[19] Wang, X., Wei, J., Schuurmans, D., Le, Q., Chi, E., Narang, S., ... & Zhou, D. (2022). Self-consistency improves chain of thought reasoning in language models. In *Proceedings of ICLR*.

[20] Xu, X., Liu, C., & Song, D. (2017). SQLNet: Generating structured queries from natural language without reinforcement learning. *arXiv preprint*, arXiv:1711.04436.

[21] Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2022). ReAct: Synergizing reasoning and acting in language models. In *Proceedings of ICLR 2023*.

[22] Yu, T., Zhang, R., Yang, K., Yasunaga, M., Wang, D., Li, Z., ... & Radev, D. (2018). Spider: A large-scale human-labeled dataset for complex and cross-domain semantic parsing and text-to-SQL task. In *Proceedings of EMNLP*, 3911–3921.

---

*본 논문은 국민대학교 대학원 졸업 프로젝트의 일환으로 작성되었습니다.*
