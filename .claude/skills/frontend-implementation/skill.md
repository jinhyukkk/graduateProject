---
name: frontend-implementation
description: "React + TypeScript로 Text-to-SQL 대시보드 프론트엔드를 구현하는 스킬. API 훅, 시각화 컴포넌트, 실험 인터페이스 코드를 생성한다. frontend-developer 에이전트가 사용한다."
---

# Frontend Implementation — React 대시보드 구현

## 구현 시작 전 필독

반드시 읽는다:
- `_workspace/01_ui-designer_design-spec.md` — 컴포넌트 스펙
- `_workspace/01_ui-designer_api-contract.md` — API 계약서

## package.json 의존성

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "@tanstack/react-query": "^5.0.0",
    "recharts": "^2.0.0",
    "tailwindcss": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@types/react": "^18.0.0"
  }
}
```

## API 훅 패턴

훅은 API 계약서의 response shape을 TypeScript 타입으로 정확히 반영한다.

```typescript
// hooks/useQuery.ts 예시
interface QueryResponse {
  id: string;
  originalSql: string;    // snake_case → camelCase 변환 주의
  correctedSql: string;
  wasCorrected: boolean;
  correctionSteps: CorrectionStep[];
  result: { columns: string[]; rows: Record<string, unknown>[] };
  explanation: string;
}

export function useRunQuery() {
  return useMutation({
    mutationFn: async (query: { query: string; dbId: string }) => {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<QueryResponse>;
    },
  });
}
```

**주의:** Python 백엔드는 snake_case를 반환한다. FastAPI에서 alias_generator로 camelCase 변환을 설정하지 않은 경우, 훅 내부에서 변환 레이어를 추가한다.

## WebSocket 연결 패턴

실험 실행 중 진행 상황 스트리밍:

```typescript
// hooks/useExperimentStream.ts
export function useExperimentStream(experimentId: string | null) {
  const [progress, setProgress] = useState<ExperimentProgress | null>(null);
  
  useEffect(() => {
    if (!experimentId) return;
    const ws = new WebSocket(`ws://localhost:8000/ws/experiment/${experimentId}`);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data) as ExperimentProgress;
      setProgress(data);
    };
    return () => ws.close();
  }, [experimentId]);
  
  return progress;
}
```

## 차트 구현 패턴

Recharts를 사용하여 메트릭을 시각화한다:

```typescript
// components/results/AccuracyBarChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  label: string;   // 모델명 또는 설정명
  accuracy: number; // 0~1
}

export function AccuracyBarChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="label" />
        <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
        <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
        <Bar dataKey="accuracy" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## 에러/로딩 상태 처리

모든 컴포넌트는 세 가지 상태를 처리한다:

```typescript
if (isLoading) return <div className="animate-pulse">로딩 중...</div>;
if (isError) return <div className="text-red-500">오류: {error.message}</div>;
if (!data || data.length === 0) return <div className="text-gray-400">결과 없음</div>;
```

## SQL diff 시각화

교정 전/후 SQL을 나란히 표시한다:

```typescript
// components/correction/SqlDiff.tsx
export function SqlDiff({ before, after }: { before: string; after: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="text-sm font-medium text-gray-500 mb-1">교정 전</h4>
        <pre className="bg-red-50 p-3 rounded text-sm overflow-auto">{before}</pre>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-500 mb-1">교정 후</h4>
        <pre className="bg-green-50 p-3 rounded text-sm overflow-auto">{after}</pre>
      </div>
    </div>
  );
}
```

## 라우팅 구조

```typescript
// App.tsx
<Routes>
  <Route path="/" element={<QueryPage />} />
  <Route path="/experiment" element={<ExperimentPage />} />
  <Route path="/results" element={<ResultsListPage />} />
  <Route path="/results/:experimentId" element={<ResultDetailPage />} />
</Routes>
```

라우팅 경로는 ui-designer의 설계 스펙과 반드시 일치해야 한다. 변경 시 qa-inspector에게 알린다.
