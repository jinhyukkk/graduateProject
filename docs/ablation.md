# Ablation 조건 정의 (docs/ablation.md)

## 실험 조건 C1~C5

| 조건 | 이름 | Error Classifier | Corrector | 목적 |
|------|------|-----------------|-----------|------|
| C1 | No Correction (Baseline) | OFF | OFF | 순수 NL2SQL 성능 기준선 |
| C2 | Naive Retry | OFF | 동일 프롬프트 재시도 | 단순 재시도 효과 측정 |
| C3 | Fixed CoT | OFF | CoT 일괄 적용 | CoT 교정 단독 효과 |
| C4 | Fixed RAG | OFF | RAG 일괄 적용 | RAG 교정 단독 효과 |
| C5 | Adaptive (Proposed) | ON | 유형별 분기 | 제안 방법 (주요 실험) |

## 조건별 LangGraph 흐름

```
C1: schema_rag → nl2sql → validator → executor

C2: schema_rag → nl2sql → validator
      → [틀린 경우] naive_retry → executor
      → [맞은 경우] executor

C3: schema_rag → nl2sql → validator
      → [틀린 경우] cot_corrector → executor
      → [맞은 경우] executor

C4: schema_rag → nl2sql → validator
      → [틀린 경우] rag_corrector → executor
      → [맞은 경우] executor

C5: schema_rag → nl2sql → validator
      → [맞은 경우] executor
      → [틀린 경우] error_classifier
            → Schema/Join/Aggregation → cot_corrector → executor
            → Condition/Logic         → rag_corrector → executor
```

## 오류 유형 정의

| 유형 | 정의 | 교정 전략 |
|------|------|---------|
| Schema | 테이블명·컬럼명·데이터타입 오참조 | CoT |
| Join | 조인 관계 누락 또는 잘못된 조인 조건 | CoT |
| Aggregation | COUNT/SUM/AVG 선택·범위·DISTINCT 오류 | CoT |
| Condition | WHERE 필터값 오류 (약어, 코드값, 날짜 형식) | RAG |
| Logic | 질문 의도 해석 오류 (쿼리 구조 자체가 틀림) | RAG |

## 교정 전략 분류 근거

- **CoT (Schema/Join/Aggregation)**: 스키마 정보만으로 분석·수정 가능한 구조적 오류.
  LLM이 DDL을 보고 단계적 추론으로 수정 가능.
- **RAG (Condition/Logic)**: 도메인 지식·외부 값(약어, 코드)이 필요한 오류.
  BIRD external evidence를 주입해야 정확한 수정 가능.

## 실험 설정

- 데이터셋: BIRD dev set, 600개 stratified sampling (seed=42)
- 난이도 분포: simple / moderate / challenging 원본 비율 유지
- 입력 파일: `data/bird/dev_600.json`
- 결과 형식: `data/results/{C1~C5}_{YYYYMMDD}.csv`
- 교정 루프: 1회만 수행 (2회 이상 효과 미미, 비용 급증)

## 평가 지표

- **EX (Execution Accuracy)**: 정답과 동일한 실행 결과 / 전체 600개
- **ECR (Error Correction Rate)**: 교정 성공 수 / C1 오류 발생 수
- 두 지표 모두 난이도별(simple/moderate/challenging)·오류 유형별로 분해 보고

## 실행 명령어

```bash
# 파일럿 (50개)
python experiments/run_condition.py --condition C5 --sample 50

# 단일 조건 전체
python experiments/run_condition.py --condition C1 --sample 600

# C1~C5 전체
python experiments/run_all.py --sample 600
```
