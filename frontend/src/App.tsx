import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import AppLayout from './components/layout/AppLayout';
import QueryPage from './pages/QueryPage';
import ExperimentPage from './pages/ExperimentPage';
import ResultsPage from './pages/ResultsPage';
import QueryDetailPage from './pages/QueryDetailPage';
import ComparisonPage from './pages/ComparisonPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<QueryPage />} />
              <Route path="/experiment" element={<ExperimentPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/results/:id" element={<ResultsPage />} />
              <Route
                path="/results/:id/query/:qid"
                element={<QueryDetailPage />}
              />
              <Route path="/comparison" element={<ComparisonPage />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
