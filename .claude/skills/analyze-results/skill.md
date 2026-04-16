---
name: analyze-results
description: 자기교정 Text-to-SQL 논문의 실험 결과를 집계·검정해 논문 본문에 삽입 가능한 표·그림·해석 문장으로 변환한다. EX/VES/EM/ICS 지표 계산, paired bootstrap 95% CI, 어블레이션 기여도 분해(A1~A4), 오류 유형별 성공률, Markdown 표 및 SVG 차트 생성. 실험 로그 분석, 통계검정, 표 그림 작성 시 반드시 사용.
---

# Analyze Results — 실험 결과 분석 가이드

엔지니어 JSONL → 논문 본문 표·해석 문장으로 변환.

## 핵심 원칙

**통계적 방어 가능성이 목표.** 수치는 반드시 (1) 지표 정의 공개, (2) 신뢰구간, (3) 유의성 검정과 함께 제시. "개선됐다"는 주장은 p > 0.05면 쓰지 않는다.

**ICS는 EX와 병기.** Intent Consistency Score는 본 연구 제안 지표이므로 단독 보고 금지. 항상 EX·VES·EM과 함께 제시하고, "ICS는 EX를 대체하지 않으며 의미 일관성을 보완 측정한다"는 문장을 방법 섹션에 포함.

## 분석 단계

### 1. 원시 로그 파싱

입력: `outputs/logs/{dataset}/{model}_{ablation}.jsonl`

검증 체크:
- query_id 중복 없음
- gold_sql·pred_sql 둘 다 존재
- exec_result.correct가 bool
- ics가 [0, 1] 범위
- 파싱 실패율 5% 초과 시 엔지니어에게 반환

### 2. 지표 계산

| 지표 | 공식 | 비고 |
|------|------|------|
| **EX** | `mean(exec_result.correct)` | BIRD/HRDB 공통 |
| **VES** | BIRD 공식 스크립트 결과 | BIRD만 |
| **EM** | `mean(pred_sql == gold_sql)` | 문자열 일치, 참고용 |
| **ICS** | `mean(ics)` | 본 연구 제안 |
| **교정 성공률(CSR)** | 초기 SQL 실패 중 최종 성공 비율 | 자기교정 효과 |

### 3. 통계 검정

- **Paired bootstrap**: 동일 질의 세트에서 모델별 EX 차이의 95% CI 산출. n=1000.
- **유의성 별표 규칙**: p<0.05 *, p<0.01 **, p<0.001 ***
- **다중 비교 보정**: 4 모델 동시 비교 시 Holm-Bonferroni 적용

### 4. 어블레이션 기여도 분해

| 어블레이션 | RQ 대응 | 해석 방식 |
|----------|--------|----------|
| A1: −NLI | **RQ1 주 증거** | SC-TSQL EX − A1 EX = NLI의 독립 기여 |
| A2: −역번역 | RQ1 보강 | NLI는 유지하고 역번역만 빼면 얼마나 무력화? |
| A3: −유형 라우팅 | **RQ2 주 증거** | SC-TSQL − A3 = 유형 분기 지시문의 기여 |
| A4: −반복 루프 | 보조 | K=3 vs K=1 차이 |

해석 원칙: "A1 제거 시 X%p 하락, CI [a, b]" → 하락 폭의 CI가 0을 포함하지 않으면 **독립 기여 주장 가능**.

### 5. 오류 분포 분석

E1~E7 및 E_intent별로:
- 발생률 (초기 SQL 중 비율)
- 교정 성공률 (유형별 교정 지시문 효과)
- 유형별 평균 라운드 수

→ RQ2 증거: "유형별 지시문이 평균 교정 성공률 X%p 상승"

### 6. 표·그림 생성

**Markdown 표**: 논문 본문에 그대로 붙여넣을 수 있는 형태. `_workspace/03_experiment_analysis.md`에 삽입.

**SVG 그림**:
- `_workspace/figures/fig1_pipeline.svg` — 파이프라인 다이어그램
- `_workspace/figures/fig2_ablation.svg` — 어블레이션 바 차트
- `_workspace/figures/fig3_error_dist.svg` — 오류 유형 분포
- `_workspace/figures/fig4_csr_by_type.svg` — 유형별 교정 성공률

### 7. 해석 문장 템플릿

```
제안 기법 SC-TSQL은 BIRD dev에서 EX {X.X}%를 달성하여 최강 베이스라인({baseline}, EX {Y.Y}%)
대비 {Z.Z}%p 향상되었다(paired bootstrap 95% CI [{a}, {b}], p={pval}).
NLI 기반 의미검증 모듈을 제거한 변형 A1은 EX {W.W}%로 {ΔEX}%p 하락하였으며,
이는 자연어 공간 검증이 실행 기반 검증과 **독립적으로 기여**함을 시사한다(RQ1).
```

## 재현성

모든 집계·검정은 `analysis/` 하위 Python 스크립트로 저장. 논문 제출 시 함께 공개.

```
analysis/
├── aggregate.py      — JSONL → 지표 테이블
├── bootstrap.py      — paired bootstrap CI
├── ablation.py       — 기여도 분해
├── error_dist.py     — 오류 분포
└── figures.py        — SVG 생성
```

## 미완 데이터 처리

HRDB 실험이 미수집이면:
- `_workspace/03_experiment_analysis.md`에 **BIRD 결과만** 작성
- HRDB 영역은 `[DATA NEEDED: HRDB {지표명}]` 플레이스홀더
- 집필자가 동일 플레이스홀더를 본문에 유지

## 금지

- 유의하지 않은 차이를 "개선"으로 서술
- ICS 단독 보고
- 실험 미완 상태에서 추정값을 수치처럼 기술 (반드시 `[ESTIMATE]` 태그)
- HRDB 결과를 "기업 일반화"로 확대 해석
