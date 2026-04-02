---
name: ui-design
description: "Text-to-SQL 대시보드 UI/UX 설계 스킬. 컴포넌트 트리, API 계약서, 와이어프레임 스펙을 생성한다. ui-designer 에이전트가 사용한다."
---

# UI Design — Text-to-SQL 대시보드 설계

## 설계 전 필수 탐색

설계 시작 전 반드시 다음을 읽는다:
1. `src/sc_tsql.py` — 메인 파이프라인 흐름 파악 (입력/출력 구조)
2. `src/metrics.py` — 사용 가능한 메트릭 목록
3. `src/corrector.py` — 교정 단계 구조 (교정 이력 데이터 형태)
4. `configs/config.yaml` — 조정 가능한 파라미터 목록

## 화면 구성

### 1. Query Interface (메인 화면)

```
[자연어 입력창] [실행 버튼]
        ↓
[생성된 SQL 표시 패널]   [교정 단계 스테퍼]
        ↓                      ↓
[실행 결과 테이블]       [각 단계 Before/After SQL diff]
        ↓
[결과 설명 (result_explainer)]
```

**컴포넌트:**
- `QueryInput`: textarea + 실행 버튼. props: `onSubmit(query: string)`
- `SqlDisplay`: 생성된 SQL 코드 하이라이팅. props: `sql: string, corrected: boolean`
- `CorrectionStepper`: 단계별 교정 과정. props: `steps: CorrectionStep[]`
- `ResultTable`: 쿼리 실행 결과. props: `columns: string[], rows: Record<string, unknown>[]`
- `ResultExplanation`: 자연어 결과 설명. props: `explanation: string`

### 2. Experiment Runner

```
[파라미터 폼]          [데이터셋 선택]
  - 모델 선택            - Spider / BIRD / Custom
  - 교정 반복 횟수       - 샘플 수
  - 검증 임계값
        ↓
[실험 실행 버튼]
        ↓
[실시간 진행 상황 바]  [로그 스트림]
        ↓
[완료 시 결과 보기 링크]
```

**컴포넌트:**
- `ExperimentForm`: 파라미터 입력 폼. props: `config: ExperimentConfig, onSubmit`
- `ProgressBar`: WebSocket 연결 진행 상황. props: `progress: number, current: number, total: number`
- `LogStream`: 실시간 로그. props: `logs: string[]`

### 3. Results Viewer

```
[실험 선택 드롭다운]
        ↓
[핵심 메트릭 카드]  [Execution Accuracy / 교정률 / 평균 교정 횟수]
        ↓
[성능 비교 바 차트]  [교정 단계별 정확도 라인 차트]
        ↓
[개별 쿼리 결과 테이블] (샘플별 성공/실패/교정 여부)
```

**컴포넌트:**
- `MetricCard`: 단일 메트릭 표시. props: `label: string, value: number, unit: string`
- `AccuracyBarChart`: 모델/설정별 비교. props: `data: ChartDataPoint[]`
- `CorrectionLineChart`: 교정 단계별 누적 정확도. props: `data: CorrectionProgress[]`
- `QueryResultTable`: 샘플별 결과 목록. props: `results: QueryResult[]`

## API 계약서 작성 기준

API 계약서(`_workspace/01_ui-designer_api-contract.md`)는 다음 형식으로 작성한다:

```markdown
## POST /api/query
Request:
  { "query": string, "db_id": string }

Response 200:
  {
    "id": string,
    "original_sql": string,
    "corrected_sql": string,
    "was_corrected": boolean,
    "correction_steps": CorrectionStep[],
    "result": { "columns": string[], "rows": object[] },
    "explanation": string
  }

CorrectionStep:
  { "step": number, "sql": string, "error": string | null, "action": string }
```

모든 엔드포인트에 대해 이 형식을 유지한다.

## 설계 산출물 구조

`_workspace/01_ui-designer_design-spec.md`에 포함할 섹션:
1. 화면 목록 및 흐름도
2. 컴포넌트 트리 (계층 구조)
3. 각 컴포넌트의 props TypeScript interface
4. 라우팅 구조 (`/`, `/experiment`, `/results/:id`, `/results/:id/query/:qid`)
5. 상태 관리 전략
