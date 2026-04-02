# Frontend Component List

## Tech Stack
- React 18 + TypeScript
- Vite 6, React Router v6, TanStack Query v5
- Ant Design 5, Recharts 2
- react-syntax-highlighter (Prism)
- WebSocket (native API)

## Project Structure

```
frontend/src/
  types/index.ts                          -- All TypeScript interfaces
  hooks/useApi.ts                         -- TanStack Query hooks (REST)
  hooks/useExperimentProgress.ts          -- WebSocket hook (experiment streaming)
  components/layout/AppLayout.tsx         -- Sider + Header layout shell
  components/query/DatabaseSelector.tsx   -- DB dropdown (Ant Select)
  components/query/QueryInput.tsx         -- NL input textarea + submit
  components/query/PipelineVisualizer.tsx -- Pipeline Steps indicator
  components/query/SchemaContextDisplay.tsx -- Linked schema accordion
  components/query/SqlDisplay.tsx         -- SQL syntax-highlighted card
  components/query/ResultTable.tsx        -- Query result data table
  components/query/ResultExplanation.tsx  -- NL explanation card
  components/correction/CorrectionStepper.tsx -- Tabbed correction rounds
  components/correction/CorrectionTimeline.tsx -- Timeline for query detail
  components/experiment/ExperimentForm.tsx -- Param form (model, K, theta, etc.)
  components/experiment/ProgressBar.tsx   -- Progress bar + status
  components/experiment/LogStream.tsx     -- Real-time log terminal
  components/results/MetricCard.tsx       -- Single metric statistic card
  components/results/CorrectionLineChart.tsx -- Accuracy by round (composed)
  components/results/ErrorTypeBarChart.tsx -- Horizontal error dist. bar chart
  components/results/QueryResultTable.tsx -- Paginated sample results table
  components/results/ExperimentSelector.tsx -- Experiment dropdown
  pages/QueryPage.tsx                     -- / route
  pages/ExperimentPage.tsx                -- /experiment route
  pages/ResultsPage.tsx                   -- /results/:id route
  pages/QueryDetailPage.tsx               -- /results/:id/query/:qid route
  App.tsx                                 -- Router + QueryClient + ConfigProvider
  main.tsx                                -- Entry point
```

## API Hooks Summary

| Hook | Type | Endpoint |
|---|---|---|
| `useDatabases` | Query | GET /api/databases |
| `useConfig` | Query | GET /api/config |
| `useRunQuery` | Mutation | POST /api/query |
| `useExperiments` | Query | GET /api/experiments |
| `useExperiment` | Query | GET /api/experiments/{id} |
| `useExperimentResults` | Query | GET /api/experiments/{id}/results |
| `useExperimentQueryDetail` | Query | GET /api/experiments/{id}/results/{qid} |
| `useCreateExperiment` | Mutation | POST /api/experiments |
| `useExperimentProgress` | WebSocket | WS /ws/experiments/{id}/progress |

## Build Verification
- `npm install` -- 253 packages, no errors
- `npx tsc --noEmit` -- 0 errors
- `npx vite build` -- success (2.2 MB bundle)
