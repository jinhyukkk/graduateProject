# 실험 스펙: 기업 데이터 접근성 향상을 위한 자기교정 Text-to-SQL 프레임워크

**대상 논문**: [docs/초록.md](../docs/초록.md)
**버전 기준**: 2026-04-14 확정 초록
**연구 질문**:
- **RQ1**: SQL→NL 역번역 후 자연어 추론(NLI)으로 의미 일치를 판정하는 방식이, 기존 실행 기반 검증과 **별개로** 성능 향상에 기여하는가?
- **RQ2**: 진단된 오류 유형별로 **다른 교정 지시문**을 쓰는 것이, 단일 공용 지시문보다 정확한 교정을 이끌어내는가?

---

## 1. 시스템 아키텍처

SC-TSQL(Self-Correcting Text-to-SQL)은 5개 모듈로 구성된 파이프라인:

```
자연어 질의 q
  → [1] Schema Linker               (임베딩 검색 + LLM 스키마 선택)
  → [2] SQL Generator               (Few-shot + GPT-4o)
  → [3] Self-Correction Loop        (최대 K=3회)
      ├── Execution Validator         (샌드박스 실행 + 오류 분류)
      ├── Semantic Verifier (NLI)     ← RQ1 핵심: SQL→NL 역번역 + NLI
      └── Type-Routed Corrector       ← RQ2 핵심: 오류 유형별 전용 지시문
  → [4] Result Explainer            (결과 요약)
```

### 1.1 Schema Linker ([src/schema_linker.py](../src/schema_linker.py))
- 임베딩: `text-embedding-3-large` (OpenAI)
- 상위 K: 테이블 K=10, 컬럼 K=30
- 코사인 유사도 검색 후 LLM이 필요 스키마(외래키 포함) 최종 선택

### 1.2 SQL Generator ([src/sql_generator.py](../src/sql_generator.py))
- 백본 LLM: **gpt-4o-2024-11-20** (고정)
- Few-shot: 구조 유사도·의미 유사도 가중합(각 0.5)으로 3개 예시 선택 (DAIL-SQL 방식 차용)
- Decoding: temperature=0, seed=42

### 1.3 Execution Validator ([src/execution_validator.py](../src/execution_validator.py))
- 읽기 전용 SQLite 연결, 5초 timeout
- 출력: 실행 성공/실패 + 오류 메시지 + 오류 유형(E1~E7)

### 1.4 Semantic Verifier — **RQ1 핵심** ([src/semantic_verifier.py](../src/semantic_verifier.py))
1. 생성된 SQL을 자연어 문장 `q'`로 **역번역** (LLM 기반 SQL→NL)
2. 원 질의 `q`와 `q'`를 NLI 모델로 entailment 판정
   - 모델: `cross-encoder/nli-deberta-v3-base`
   - 출력: P(entailment), P(neutral), P(contradiction)
3. **Intent Consistency Score (ICS)**: `ICS = P(entailment)`
4. 임계값 θ=0.75 미만이면 "의도 불일치(E_intent)"로 교정 루프 트리거

### 1.5 Type-Routed Corrector — **RQ2 핵심** ([src/corrector.py](../src/corrector.py))
- 오류 유형별 전용 교정 프롬프트 템플릿 사용 (단일 공용 지시문 대체)
- 유형 → 지시문 라우팅 규칙은 §2에서 정의

---

## 2. 오류 유형 분류 체계

| 코드 | 유형 | 감지 근거 | 교정 지시문 전략 |
|------|------|-----------|------------------|
| E1 | Schema Mismatch | 존재하지 않는 테이블/컬럼 참조 | 스키마 재링킹 + 올바른 이름 강조 |
| E2 | Syntax Error | SQLite 파서 에러 | 구문 수정 + 문법 예시 제공 |
| E3 | Join Error | 잘못된 JOIN 키 / 누락된 JOIN | 외래키 관계 명시 + JOIN 경로 재구성 |
| E4 | Aggregation Error | GROUP BY / 집계함수 오류 | 집계 대상·그룹 키 명시 재생성 |
| E5 | Filter Error | WHERE 조건 불일치 | 조건 재해석 + 날짜/범위 규범화 |
| E6 | Projection Error | SELECT 컬럼 불일치 | 요구 출력 컬럼 재확인 |
| E7 | Empty/Timeout | 결과 0행 또는 실행 타임아웃 | 필터 완화 + 인덱스 힌트 |
| **E_intent** | **Intent Mismatch** | **NLI entailment < θ** | **역번역 비교 + 의도 차이 지적** |

- E1~E7은 실행 기반(기존), **E_intent는 본 연구 신규**
- 복수 유형 공존 시 우선순위: E2 > E1 > E3 > E4 > E5 > E6 > E7 > E_intent

---

## 3. 자기교정 루프

- 최대 반복: **K=3** (`correction.max_rounds`)
- 종료 조건: (a) Execution Validator 통과 AND (b) ICS ≥ 0.75
- 각 라운드 로그: SQL, 실행 결과, ICS, 선택된 교정 지시문 유형

---

## 4. 데이터셋

### 4.1 BIRD (공정 비교용)
- 버전: BIRD dev set (1,534 질의)
- 용도: 공개 벤치마크에서 동일 GPT-4o 환경으로 베이스라인과 공정 비교
- 평가 스크립트: BIRD 공식 EX, VES

### 4.2 HRDB (스키마-온리, 실무형 환경)
- **실데이터 미사용**: 기업 인사시스템(예: SAP HR, 더존, 영림원)의 테이블·컬럼·관계 **구조만** 이식
- 규모: 42 테이블 / 347 컬럼
- Row: 합성 데이터 생성기로 생성 (개인식별정보 배제)
- 질의 세트: 150개 (Easy 45 / Medium 60 / Hard 45)
- 목적: "스키마 구조가 유발하는 오류 패턴"을 스키마-온리 조건에서 검증

---

## 5. 베이스라인 (모두 **GPT-4o 재실행**)

| 모델 | 구현 | 역할 |
|------|------|------|
| Zero-shot GPT-4o | 직접 구현 | 하한선 |
| **DAIL-SQL** (Gao et al., 2024) | 공식 구현 래핑 | 주 비교군 |
| **MAC-SQL** (Wang et al., 2024) | 공식 구현 래핑 | 주 비교군 |
| **SC-TSQL (제안)** | [src/sc_tsql.py](../src/sc_tsql.py) | 본 연구 |

- 모든 베이스라인을 **GPT-4o-2024-11-20**으로 재실행 (인용 수치 사용 금지)
- 동일 seed, 동일 temperature=0, 동일 BIRD/HRDB 질의 세트

---

## 6. 평가 지표

| 지표 | 정의 | 역할 |
|------|------|------|
| **EX** (Execution Accuracy) | 실행 결과가 gold SQL 결과와 일치하는 비율 | 주 지표 (유지) |
| **VES** (Valid Efficiency Score) | BIRD 공식 효율성 지표 | 보조 (BIRD만) |
| **EM** (Exact Match) | SQL 문자열 일치 | 참고 |
| **ICS** (Intent Consistency Score) | NLI entailment 확률 평균 | **본 연구 제안 — EX와 병기** |

원칙: ICS는 EX를 **대체하지 않으며** 반드시 병기.

---

## 7. 실험 계획

### 7.1 주 실험
- 전 데이터셋 × 전 모델 × 전 지표 (4 모델 × 2 데이터셋 × 4 지표)

### 7.2 어블레이션 (SC-TSQL 내부)
| 변형 | 제거 항목 | RQ 대응 |
|------|-----------|---------|
| A1: −NLI | Semantic Verifier 제거, 실행 기반만 | **RQ1** |
| A2: −역번역 | NLI 유지, 역번역 없이 원 SQL vs 원 질의 | RQ1 보강 |
| A3: −유형 라우팅 | 단일 공용 교정 지시문만 사용 | **RQ2** |
| A4: −반복 루프 | K=1 | 교정 횟수 민감도 |

### 7.3 통계 검정
- Paired bootstrap (n=1000), α=0.05
- 지표별 95% CI 보고

---

## 8. 하이퍼파라미터 고정값 (재현성)

| 항목 | 값 | 출처 |
|------|----|----|
| LLM | `gpt-4o-2024-11-20` | [configs/config.yaml](../configs/config.yaml) |
| temperature | 0.0 | config.yaml |
| seed | 42 | config.yaml |
| NLI 모델 | `cross-encoder/nli-deberta-v3-base` | config.yaml |
| max_rounds (K) | 3 | config.yaml |
| semantic_threshold (θ) | 0.75 | config.yaml |
| top_k_tables | 10 | config.yaml |
| top_k_columns | 30 | config.yaml |
| few_shot_k | 3 | config.yaml |
| SQLite timeout | 5s | execution_validator.py |

---

## 9. 실험 산출물 경로

- 로그: `outputs/logs/` (현재 비어있음 — 실험 미실행)
- 체크포인트: `outputs/checkpoints/`
- 진입점: `python evaluate.py --config configs/config.yaml --dataset {bird,hrdb}`

---

## 10. 제약 및 한계 (초록 연동)

- HRDB는 **스키마-온리**로, 실데이터 분포 일반화는 주장 범위 밖. "스키마 구조가 의미검증에 미치는 영향"만 주장.
- 단일 LLM(GPT-4o) 의존 — 타 모델 일반화는 추후 과제.
- NLI 모델은 영어 기반 → 한국어 도메인 용어는 전처리 단계에서 컬럼명→NL 정규화로 완화.
