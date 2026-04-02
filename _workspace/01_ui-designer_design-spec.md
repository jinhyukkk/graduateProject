# SC-TSQL Dashboard UI Design Spec

## 1. 화면 목록 및 흐름도

### 라우팅 구조

| Route | 화면 | 설명 |
|---|---|---|
| `/` | Query Interface | 자연어 질의 입력, SQL 생성, 교정 시각화, 결과 표시 |
| `/experiment` | Experiment Runner | 실험 파라미터 설정 및 평가 실행 |
| `/results/:id` | Results Viewer | 실험 결과 메트릭 카드, 차트, 샘플별 목록 |
| `/results/:id/query/:qid` | Query Detail | 개별 쿼리의 교정 히스토리 상세 |

### 전체 흐름도

```
[App Layout: Header + Sidebar + Main Content]
   |
   +-- / (Query Interface)
   |     사용자가 자연어 입력 + DB 선택
   |         -> POST /api/query
   |         -> 파이프라인 단계별 결과 표시
   |         -> 교정 루프 스테퍼 (라운드별 Before/After)
   |         -> 실행 결과 테이블
   |         -> 자연어 설명
   |
   +-- /experiment (Experiment Runner)
   |     파라미터 폼 (모델, K, theta, 데이터셋, 샘플 수)
   |         -> POST /api/experiments
   |         -> WebSocket /ws/experiments/{id}/progress
   |         -> 실시간 진행 바 + 로그 스트림
   |         -> 완료 시 /results/{id}로 이동
   |
   +-- /results/:id (Results Viewer)
   |     메트릭 카드 (EX, CSR, Avg Latency)
   |     교정 단계별 정확도 라인 차트
   |     샘플별 성공/실패 테이블
   |         -> 클릭 시 /results/:id/query/:qid
   |
   +-- /results/:id/query/:qid (Query Detail)
         교정 라운드별 SQL diff
         Validation/Verification 결과
         최종 결과 테이블
```

---

## 2. 컴포넌트 트리 (계층 구조)

```
<App>
  <AppLayout>
    <Header />
    <Sidebar>
      <NavItem to="/">Query</NavItem>
      <NavItem to="/experiment">Experiment</NavItem>
      <NavItem to="/results">Results</NavItem>
    </Sidebar>
    <MainContent>
      <Routes>

        {/* Query Interface */}
        <Route path="/">
          <QueryPage>
            <QueryInputPanel>
              <DatabaseSelector />
              <QueryInput />
              <SubmitButton />
            </QueryInputPanel>
            <PipelineVisualizer>
              <PipelineStep label="Schema Linking">
                <SchemaContextDisplay />
              </PipelineStep>
              <PipelineStep label="SQL Generation">
                <SqlDisplay />
              </PipelineStep>
              <PipelineStep label="Self-Correction">
                <CorrectionStepper>
                  <CorrectionRound />   {/* x N rounds */}
                </CorrectionStepper>
              </PipelineStep>
              <PipelineStep label="Result">
                <ResultTable />
                <ResultExplanation />
              </PipelineStep>
            </PipelineVisualizer>
          </QueryPage>
        </Route>

        {/* Experiment Runner */}
        <Route path="/experiment">
          <ExperimentPage>
            <ExperimentForm>
              <ModelSelector />
              <DatasetSelector />
              <CorrectionParamsInput />
              <SampleCountInput />
              <RunButton />
            </ExperimentForm>
            <ExperimentProgress>
              <ProgressBar />
              <LogStream />
            </ExperimentProgress>
          </ExperimentPage>
        </Route>

        {/* Results Viewer */}
        <Route path="/results/:id">
          <ResultsPage>
            <ExperimentSelector />
            <MetricsPanel>
              <MetricCard />  {/* EX */}
              <MetricCard />  {/* CSR */}
              <MetricCard />  {/* Avg Latency */}
            </MetricsPanel>
            <ChartsPanel>
              <CorrectionLineChart />
              <ErrorTypeBarChart />
            </ChartsPanel>
            <QueryResultTable />
          </ResultsPage>
        </Route>

        {/* Query Detail */}
        <Route path="/results/:id/query/:qid">
          <QueryDetailPage>
            <QueryInfoCard />
            <CorrectionTimeline>
              <CorrectionRoundDetail />  {/* x N */}
            </CorrectionTimeline>
            <FinalResultPanel>
              <SqlDisplay />
              <ResultTable />
            </FinalResultPanel>
          </QueryDetailPage>
        </Route>

      </Routes>
    </MainContent>
  </AppLayout>
</App>
```

---

## 3. 컴포넌트 Props TypeScript Interfaces

### 3.1 공통 타입

```typescript
// --- 도메인 모델 ---

interface CorrectionStep {
  round: number;
  error_type: string;              // "E1_SYNTAX" | "E2_NO_SUCH_TABLE" | ... | "SEMANTIC_MISMATCH"
  original_sql: string;
  corrected_sql: string;
  validation_success: boolean;
  semantic_score: number;
}

interface ValidationResult {
  success: boolean;
  error_type: string | null;
  error_message: string | null;
  is_empty: boolean;
  is_excessive: boolean;
  row_count: number;
}

interface VerificationResult {
  back_translation: string;
  similarity_score: number;
  is_consistent: boolean;
  mismatch_diagnosis: string | null;
}

interface SchemaContext {
  tables: SchemaTable[];
  foreign_keys: ForeignKey[];
}

interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

interface SchemaColumn {
  name: string;
  type: string;
  is_primary_key: boolean;
}

interface ForeignKey {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
}

interface QueryResult {
  id: string;
  original_sql: string;
  final_sql: string;
  was_corrected: boolean;
  correction_steps: CorrectionStep[];
  result: { columns: string[]; rows: Record<string, unknown>[] };
  explanation: string;
  schema_context: SchemaContext;
  latency: number;
  validation: ValidationResult;
  verification: VerificationResult;
}

interface ExperimentConfig {
  dataset: "spider" | "bird";
  model: string;
  max_rounds: number;
  semantic_threshold: number;
  sample_count: number | null;       // null = 전체
}

interface ExperimentSummary {
  id: string;
  dataset: string;
  status: "running" | "completed" | "failed";
  config: ExperimentConfig;
  created_at: string;
  metrics: ExperimentMetrics | null;
}

interface ExperimentMetrics {
  execution_accuracy: number;
  correction_success_rate: number;
  average_latency: number;
  total_evaluated: number;
}

interface ExperimentDetailedResult {
  index: number;
  db_id: string;
  question: string;
  gold_sql: string;
  predicted_sql: string;
  correct: boolean;
  latency: number;
  correction_rounds: number;
  correction_history: CorrectionStep[];
}

// --- 차트 데이터 ---

interface ChartDataPoint {
  label: string;
  value: number;
}

interface CorrectionProgress {
  round: number;
  cumulative_accuracy: number;
  newly_corrected: number;
}
```

### 3.2 Query Interface 컴포넌트

```typescript
// DatabaseSelector: DB 선택 드롭다운
interface DatabaseSelectorProps {
  databases: string[];                // GET /api/databases에서 가져온 목록
  selected: string;
  onChange: (dbId: string) => void;
}

// QueryInput: 자연어 질의 입력
interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;              // 기본: "자연어로 질문을 입력하세요..."
}

// PipelineVisualizer: 파이프라인 단계별 진행 표시
interface PipelineVisualizerProps {
  currentStep: number;               // 0=대기, 1=Schema, 2=SQL Gen, 3=Correction, 4=Result
  result: QueryResult | null;
  isLoading: boolean;
}

// PipelineStep: 개별 파이프라인 단계
interface PipelineStepProps {
  label: string;
  stepIndex: number;
  currentStep: number;
  status: "pending" | "active" | "completed" | "error";
  children: React.ReactNode;
}

// SchemaContextDisplay: 링크된 스키마 시각화
interface SchemaContextDisplayProps {
  schema: SchemaContext | null;
}

// SqlDisplay: SQL 코드 하이라이팅 표시
interface SqlDisplayProps {
  sql: string;
  label?: string;                    // "Generated SQL" | "Corrected SQL"
  corrected?: boolean;               // true이면 녹색 배지 표시
  language?: string;                 // 기본: "sql"
}

// CorrectionStepper: 교정 라운드 탭/스테퍼
interface CorrectionStepperProps {
  steps: CorrectionStep[];
  activeStep: number;
  onStepClick: (step: number) => void;
}

// CorrectionRound: 단일 교정 라운드 상세
interface CorrectionRoundProps {
  step: CorrectionStep;
  roundNumber: number;
}

// ResultTable: SQL 실행 결과 데이터 테이블
interface ResultTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  maxRows?: number;                  // 기본: 100
  isLoading?: boolean;
}

// ResultExplanation: 자연어 결과 설명
interface ResultExplanationProps {
  explanation: string;
}
```

### 3.3 Experiment Runner 컴포넌트

```typescript
// ExperimentForm: 실험 파라미터 입력 폼
interface ExperimentFormProps {
  onSubmit: (config: ExperimentConfig) => void;
  isRunning: boolean;
  availableModels: string[];          // GET /api/models에서 가져옴
}

// ModelSelector: LLM 모델 선택
interface ModelSelectorProps {
  models: string[];
  selected: string;
  onChange: (model: string) => void;
}

// DatasetSelector: 데이터셋 선택
interface DatasetSelectorProps {
  datasets: Array<{ id: string; label: string; count: number }>;
  selected: string;
  onChange: (dataset: string) => void;
}

// CorrectionParamsInput: 교정 파라미터 (K, theta)
interface CorrectionParamsInputProps {
  maxRounds: number;                 // 1~5, 기본 3
  semanticThreshold: number;         // 0.0~1.0, 기본 0.75
  onMaxRoundsChange: (v: number) => void;
  onThresholdChange: (v: number) => void;
}

// ProgressBar: 실험 진행률
interface ProgressBarProps {
  progress: number;                  // 0~100
  current: number;                   // 현재 처리 중인 인덱스
  total: number;                     // 전체 샘플 수
  status: "idle" | "running" | "completed" | "failed";
  estimatedRemaining?: number;       // 남은 시간 (초)
}

// LogStream: 실시간 로그
interface LogStreamProps {
  logs: LogEntry[];
  maxLines?: number;                 // 기본: 500
  autoScroll?: boolean;              // 기본: true
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
}
```

### 3.4 Results Viewer 컴포넌트

```typescript
// ExperimentSelector: 실험 목록 드롭다운
interface ExperimentSelectorProps {
  experiments: ExperimentSummary[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

// MetricCard: 단일 메트릭 표시 카드
interface MetricCardProps {
  label: string;                     // "Execution Accuracy" | "Correction Success Rate" | "Avg Latency"
  value: number;
  unit: string;                      // "%" | "s"
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

// CorrectionLineChart: 교정 단계별 누적 정확도 라인 차트
interface CorrectionLineChartProps {
  data: CorrectionProgress[];
}

// ErrorTypeBarChart: 오류 유형별 분포 막대 차트
interface ErrorTypeBarChartProps {
  data: ChartDataPoint[];            // label = error_type, value = count
}

// QueryResultTable: 샘플별 결과 목록 (정렬/필터 가능)
interface QueryResultTableProps {
  results: ExperimentDetailedResult[];
  onRowClick: (index: number) => void;
  filter?: "all" | "correct" | "incorrect" | "corrected";
}
```

### 3.5 Query Detail 컴포넌트

```typescript
// QueryInfoCard: 쿼리 기본 정보
interface QueryInfoCardProps {
  question: string;
  dbId: string;
  goldSql: string;
  predictedSql: string;
  correct: boolean;
  latency: number;
}

// CorrectionTimeline: 교정 과정 타임라인
interface CorrectionTimelineProps {
  history: CorrectionStep[];
}

// CorrectionRoundDetail: 단일 교정 라운드 상세
interface CorrectionRoundDetailProps {
  step: CorrectionStep;
  validation: ValidationResult;
  verification: VerificationResult;
}
```

---

## 4. 상태 관리 전략

### 4.1 전역 상태 (React Context 또는 Zustand)

| 상태 | 타입 | 설명 |
|---|---|---|
| `databases` | `string[]` | 사용 가능한 DB 목록 (앱 초기화 시 로드) |
| `currentExperiment` | `ExperimentSummary \| null` | 현재 실행/조회 중인 실험 |
| `experiments` | `ExperimentSummary[]` | 실험 목록 캐시 |

### 4.2 페이지별 로컬 상태

#### Query Interface

| 상태 | 타입 | 초기값 |
|---|---|---|
| `queryText` | `string` | `""` |
| `selectedDb` | `string` | `databases[0]` |
| `isLoading` | `boolean` | `false` |
| `queryResult` | `QueryResult \| null` | `null` |
| `currentPipelineStep` | `number` | `0` |
| `activeCorrectionStep` | `number` | `0` |

#### Experiment Runner

| 상태 | 타입 | 초기값 |
|---|---|---|
| `config` | `ExperimentConfig` | `{ dataset: "spider", model: "gpt-4o-2024-11-20", max_rounds: 3, semantic_threshold: 0.75, sample_count: null }` |
| `isRunning` | `boolean` | `false` |
| `progress` | `{ current: number, total: number }` | `{ current: 0, total: 0 }` |
| `logs` | `LogEntry[]` | `[]` |
| `experimentId` | `string \| null` | `null` |

#### Results Viewer

| 상태 | 타입 | 초기값 |
|---|---|---|
| `selectedExperimentId` | `string \| null` | URL param `:id` |
| `metrics` | `ExperimentMetrics \| null` | `null` |
| `detailedResults` | `ExperimentDetailedResult[]` | `[]` |
| `filter` | `"all" \| "correct" \| "incorrect" \| "corrected"` | `"all"` |
| `sortBy` | `string` | `"index"` |
| `sortOrder` | `"asc" \| "desc"` | `"asc"` |

### 4.3 데이터 패칭

React Query (TanStack Query) 사용 권장:

```typescript
// 쿼리 키 설계
const queryKeys = {
  databases: ["databases"] as const,
  query: (params: { query: string; db_id: string }) => ["query", params] as const,
  experiments: ["experiments"] as const,
  experiment: (id: string) => ["experiments", id] as const,
  experimentResults: (id: string) => ["experiments", id, "results"] as const,
  experimentQuery: (expId: string, qid: number) => ["experiments", expId, "query", qid] as const,
};
```

### 4.4 WebSocket 연결 (실험 진행)

```typescript
// useExperimentProgress 커스텀 훅
function useExperimentProgress(experimentId: string | null) {
  // WebSocket: ws://host/ws/experiments/{id}/progress
  // 수신 메시지 형태:
  //   { type: "progress", current: number, total: number, status: string }
  //   { type: "log", entry: LogEntry }
  //   { type: "completed", metrics: ExperimentMetrics }
  //   { type: "error", message: string }
}
```

---

## 5. 와이어프레임 텍스트 스펙

### 5.1 Query Interface (`/`)

```
+==============================================================+
| SC-TSQL Dashboard                    [Query] [Experiment] [Results] |
+==============================================================+
|                                                                |
| +----------------------------------------------------------+ |
| | Database: [concert_singer    v]                          | |
| +----------------------------------------------------------+ |
| | Enter your question in natural language...                | |
| |                                                          | |
| |                                                          | |
| |                                          [Run Query -->] | |
| +----------------------------------------------------------+ |
|                                                                |
| Pipeline Progress:                                             |
| (1) Schema Linking  ->  (2) SQL Generation  ->                |
| (3) Self-Correction  ->  (4) Result                           |
|                                                                |
| +--- Generated SQL ----------------------------------------+ |
| | SELECT T1.name, COUNT(*)                                 | |
| | FROM singer AS T1                                        | |
| | JOIN song AS T2 ON T1.singer_id = T2.singer_id          | |
| | GROUP BY T1.name                                         | |
| +----------------------------------------------------------+ |
|                                                                |
| +--- Correction History -----------------------------------+ |
| | [Round 1] [Round 2]                                      | |
| | +------------------------------------------------------+ | |
| | | Error: E3_NO_SUCH_COLUMN (singer_id)                 | | |
| | | Before: ... T1.singer_id = T2.singer_id              | | |
| | | After:  ... T1.id = T2.singer_id                     | | |
| | | Semantic Score: 0.82                                  | | |
| | +------------------------------------------------------+ | |
| +----------------------------------------------------------+ |
|                                                                |
| +--- Result (3 rows) --------------------------------------+ |
| | name           | song_count                               | |
| |----------------|------------------------------------------| |
| | John           | 5                                        | |
| | Jane           | 3                                        | |
| | Bob            | 2                                        | |
| +----------------------------------------------------------+ |
|                                                                |
| +--- Explanation -------------------------------------------+ |
| | The query found 3 singers and the number of songs each   | |
| | has performed. John has the most songs (5), followed by   | |
| | Jane (3) and Bob (2). Note: the original SQL had a       | |
| | column name error which was automatically corrected.      | |
| +----------------------------------------------------------+ |
+================================================================+
```

### 5.2 Experiment Runner (`/experiment`)

```
+==============================================================+
| SC-TSQL Dashboard                    [Query] [Experiment] [Results] |
+==============================================================+
|                                                                |
| +--- Experiment Configuration ------------------------------+ |
| |                                                            | |
| | Model:         [gpt-4o-2024-11-20      v]                 | |
| | Dataset:       ( ) Spider   (*) BIRD                       | |
| | Max Rounds:    [---o--------] 3                            | |
| | Threshold:     [------o-----] 0.75                         | |
| | Sample Count:  [____] (empty = all)                        | |
| |                                                            | |
| |                              [Run Experiment -->]          | |
| +------------------------------------------------------------+ |
|                                                                |
| +--- Progress ----------------------------------------------+ |
| | [=================>         ] 68% (340 / 500)              | |
| | Estimated remaining: ~4m 30s                               | |
| +------------------------------------------------------------+ |
|                                                                |
| +--- Log ---------------------------------------------------+ |
| | 14:23:01 [INFO]  [340/500] OK - concert_singer: How many  | |
| |                  singers... (corrected x1) (2.3s)          | |
| | 14:23:04 [WARN]  [341/500] FAIL - world_1: What is the    | |
| |                  population... (3.1s)                       | |
| | 14:23:07 [INFO]  [342/500] OK - car_1: Find all cars...   | |
| |                  (1.8s)                                     | |
| |                                                            | |
| |                              [v Auto-scroll]               | |
| +------------------------------------------------------------+ |
+================================================================+
```

### 5.3 Results Viewer (`/results/:id`)

```
+==============================================================+
| SC-TSQL Dashboard                    [Query] [Experiment] [Results] |
+==============================================================+
|                                                                |
| Experiment: [2026-04-02 Spider gpt-4o K=3  v]                 |
|                                                                |
| +--- Metrics -----------------------------------------------+ |
| | +----------------+ +----------------+ +-----------------+  | |
| | | EX             | | CSR            | | Avg Latency     |  | |
| | |    78.4%       | |    62.1%       | |     2.8s        |  | |
| | | Exec Accuracy  | | Correction Rate| | Per Query       |  | |
| | +----------------+ +----------------+ +-----------------+  | |
| +------------------------------------------------------------+ |
|                                                                |
| +--- Charts ------------------------------------------------+ |
| | Correction Accuracy by Round     | Error Type Distribution | |
| |                                  |                         | |
| |  80|      .--*                   | E1_SYNTAX    ||||| 23  | |
| |  70|   .-'                       | E3_COLUMN    |||| 18   | |
| |  60| .-'                         | E7_EMPTY     ||| 12    | |
| |  50|*                            | SEMANTIC     || 9      | |
| |    +------+------+              | E2_TABLE     | 5       | |
| |    R0     R1     R2              |                         | |
| +------------------------------------------------------------+ |
|                                                                |
| +--- Sample Results ----------------------------------------+ |
| | Filter: [All v] [Correct] [Incorrect] [Corrected]         | |
| | +---+----------+---------------------------+----+---+---+ | |
| | | # | DB       | Question                  | OK | R | s  | | |
| | |---|----------|---------------------------|----+---+---| | |
| | | 1 | concert  | How many singers...       | Y  | 0 |1.2| | |
| | | 2 | world_1  | What is the population... | N  | 3 |4.5| | |
| | | 3 | car_1    | Find all cars with...     | Y  | 1 |2.3| | |
| | +---+----------+---------------------------+----+---+---+ | |
| |                              [< 1 2 3 ... 50 >]           | |
| +------------------------------------------------------------+ |
+================================================================+
```

### 5.4 Query Detail (`/results/:id/query/:qid`)

```
+==============================================================+
| SC-TSQL Dashboard                    [Query] [Experiment] [Results] |
+==============================================================+
|                                                                |
| [<- Back to Results]                                           |
|                                                                |
| +--- Query Info --------------------------------------------+ |
| | Question: "What is the population of the largest city?"    | |
| | DB: world_1     Status: [INCORRECT]     Latency: 4.5s     | |
| +------------------------------------------------------------+ |
|                                                                |
| +--- Gold SQL ------+ +--- Predicted SQL ----+               |
| | SELECT ...         | | SELECT ...           |               |
| | FROM city          | | FROM city            |               |
| | ORDER BY           | | WHERE                |               |
| |   population DESC  | |   population > 1000  |               |
| | LIMIT 1            | | ORDER BY pop DESC    |               |
| +--------------------+ +----------------------+               |
|                                                                |
| +--- Correction Timeline -----------------------------------+ |
| |                                                            | |
| | Round 1                                                    | |
| | +--- Error: E7_EMPTY_RESULT ----------------------------+ | |
| | | Validation: PASS (exec ok, 0 rows)                     | | |
| | | Semantic: 0.42 < 0.75 (MISMATCH)                       | | |
| | | Diagnosis: "Query filters too aggressively..."          | | |
| | | Before SQL: SELECT ... WHERE population > 100000 ...    | | |
| | | After SQL:  SELECT ... WHERE population > 1000 ...      | | |
| | +--------------------------------------------------------+ | |
| |                                                            | |
| | Round 2                                                    | |
| | +--- Error: SEMANTIC_MISMATCH --------------------------+ | |
| | | Validation: PASS (exec ok, 245 rows)                    | | |
| | | Semantic: 0.68 < 0.75 (MISMATCH)                       | | |
| | | Diagnosis: "Missing ORDER BY and LIMIT..."              | | |
| | | Before SQL: SELECT ... WHERE population > 1000          | | |
| | | After SQL:  SELECT ... ORDER BY population DESC LIMIT 1 | | |
| | +--------------------------------------------------------+ | |
| |                                                            | |
| | Round 3 - Final (no further correction needed)             | |
| | Validation: PASS | Semantic: 0.91 (CONSISTENT)            | |
| +------------------------------------------------------------+ |
+================================================================+
```

---

## 6. 기술 스택 권장

| 구분 | 기술 | 사유 |
|---|---|---|
| 프레임워크 | React 18 + TypeScript | 타입 안전성, 컴포넌트 재사용 |
| 라우팅 | React Router v6 | 표준 SPA 라우팅 |
| 상태 관리 | TanStack Query + Zustand | 서버 상태/클라이언트 상태 분리 |
| UI 라이브러리 | Ant Design 5 | 데이터 테이블, 폼, 카드 등 엔터프라이즈 컴포넌트 |
| 차트 | Recharts | React 친화적, 라인/바 차트 |
| SQL 하이라이팅 | react-syntax-highlighter (Prism) | SQL 문법 강조 |
| SQL Diff | diff (npm) + 커스텀 렌더러 | Before/After SQL 비교 |
| WebSocket | native WebSocket API | 실험 진행 스트리밍 |
| 빌드 | Vite | 빠른 HMR, 간결한 설정 |

---

## 7. 반응형 레이아웃

- 데스크톱 (1200px 이상): 2컬럼 레이아웃 (사이드바 + 메인)
- 태블릿 (768px~1199px): 사이드바 접힘, 상단 네비게이션
- 모바일: 지원하지 않음 (데이터 분석 도구 특성상 데스크톱 우선)

---

## 8. 에러 처리 UX

| 상황 | 표시 방식 |
|---|---|
| API 응답 지연 (>5초) | 스켈레톤 UI + "처리 중..." 메시지 |
| 네트워크 오류 | 인라인 Alert (빨간색) + "다시 시도" 버튼 |
| SQL 실행 실패 | SqlDisplay에 오류 배지 + 오류 메시지 인라인 표시 |
| WebSocket 연결 끊김 | 자동 재연결 (3초 간격, 최대 5회) + 상태 표시 |
| 실험 실행 실패 | 진행 바에 실패 상태 + 오류 로그 하이라이트 |
