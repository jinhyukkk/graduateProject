import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Row, Col, Spin, Alert, Empty } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  useExperiments,
  useExperiment,
  useExperimentResults,
} from '../hooks/useApi';
import ExperimentSelector from '../components/results/ExperimentSelector';
import MetricCard from '../components/results/MetricCard';
import CorrectionLineChart from '../components/results/CorrectionLineChart';
import ErrorTypeBarChart from '../components/results/ErrorTypeBarChart';
import QueryResultTable from '../components/results/QueryResultTable';

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(id || null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    if (id) setSelectedId(id);
  }, [id]);

  const { data: experimentsData, isLoading: expListLoading } = useExperiments({
    limit: 50,
  });

  const {
    data: experiment,
    isLoading: expLoading,
    error: expError,
  } = useExperiment(selectedId);

  const {
    data: resultsData,
    isLoading: resultsLoading,
  } = useExperimentResults(selectedId, {
    filter,
    page,
    page_size: pageSize,
    sort_by: 'index',
    sort_order: 'asc',
  });

  // Auto-select first experiment if none selected
  useEffect(() => {
    if (
      !selectedId &&
      experimentsData?.experiments.length
    ) {
      const first = experimentsData.experiments[0];
      setSelectedId(first.id);
      navigate(`/results/${first.id}`, { replace: true });
    }
  }, [selectedId, experimentsData, navigate]);

  const handleExperimentChange = (newId: string) => {
    setSelectedId(newId);
    setFilter('all');
    setPage(1);
    navigate(`/results/${newId}`, { replace: true });
  };

  const handleRowClick = (index: number) => {
    if (selectedId) {
      navigate(`/results/${selectedId}/query/${index}`);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Typography.Title level={3}>Results Viewer</Typography.Title>

      <ExperimentSelector
        experiments={experimentsData?.experiments || []}
        selectedId={selectedId}
        onChange={handleExperimentChange}
        loading={expListLoading}
      />

      {expError && (
        <Alert
          message="Failed to load experiment"
          description={String(expError)}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {expLoading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      )}

      {!selectedId && !expListLoading && (
        <Empty description="No experiments yet. Run one from the Experiment page." />
      )}

      {experiment && experiment.metrics && (
        <>
          {/* Metric cards */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <MetricCard
                label="Execution Accuracy"
                value={experiment.metrics.execution_accuracy}
                unit="%"
                icon={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <MetricCard
                label="Correction Success Rate"
                value={experiment.metrics.correction_success_rate}
                unit="%"
                icon={<SyncOutlined />}
              />
            </Col>
            <Col span={8}>
              <MetricCard
                label="Avg Latency"
                value={experiment.metrics.average_latency}
                unit="s"
                icon={<ClockCircleOutlined />}
              />
            </Col>
          </Row>

          {/* Charts */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <CorrectionLineChart
                data={experiment.correction_progress || []}
              />
            </Col>
            <Col span={12}>
              <ErrorTypeBarChart
                data={experiment.error_distribution || []}
              />
            </Col>
          </Row>
        </>
      )}

      {/* Sample results table */}
      {selectedId && (
        <QueryResultTable
          results={resultsData?.results || []}
          total={resultsData?.total || 0}
          page={page}
          pageSize={pageSize}
          filter={filter}
          onFilterChange={(f) => {
            setFilter(f);
            setPage(1);
          }}
          onPageChange={(p, ps) => {
            setPage(p);
            setPageSize(ps);
          }}
          onRowClick={handleRowClick}
          loading={resultsLoading}
        />
      )}
    </div>
  );
}
