import { useState, useMemo } from 'react';
import { Typography, Select, Card, Empty, Space, Spin } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useExperiments, useMultipleExperiments } from '../hooks/useApi';
import ComparisonTable from '../components/comparison/ComparisonTable';
import OverlayAccuracyChart from '../components/comparison/OverlayAccuracyChart';
import ErrorComparisonChart from '../components/comparison/ErrorComparisonChart';
import type { ExperimentDetail } from '../types';

export default function ComparisonPage() {
  const [searchParams] = useSearchParams();
  const idsFromUrl = searchParams.get('ids')?.split(',').filter(Boolean) || [];

  const [selectedIds, setSelectedIds] = useState<string[]>(idsFromUrl);

  // Fetch experiment list for the selector
  const { data: expList } = useExperiments({ limit: 100 });

  // Fetch details for selected experiments
  const detailQueries = useMultipleExperiments(selectedIds);

  const experiments: ExperimentDetail[] = useMemo(
    () =>
      detailQueries
        .filter((q) => q.isSuccess && q.data)
        .map((q) => q.data as ExperimentDetail),
    [detailQueries],
  );

  const isLoading = detailQueries.some((q) => q.isLoading);

  // Build selector options from completed experiments
  const options = useMemo(() => {
    if (!expList?.experiments) return [];
    return expList.experiments
      .filter((e) => e.status === 'completed')
      .map((e) => {
        const mode = e.config.pipeline_mode || 'sc-tsql';
        const k = e.config.max_rounds;
        const ex = e.metrics
          ? `EX=${(e.metrics.execution_accuracy * 100).toFixed(1)}%`
          : '';
        return {
          value: e.id,
          label: `${mode} K=${k} | ${e.dataset} ${ex} (${e.id})`,
        };
      });
  }, [expList]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Typography.Title level={3}>Experiment Comparison</Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Typography.Text strong>Select experiments to compare:</Typography.Text>
        <Select
          mode="multiple"
          style={{ width: '100%', marginTop: 8 }}
          placeholder="Choose 2+ completed experiments"
          value={selectedIds}
          onChange={setSelectedIds}
          options={options}
          optionFilterProp="label"
          maxTagCount={5}
        />
      </Card>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      )}

      {!isLoading && experiments.length === 0 && (
        <Empty description="Select experiments above to compare" />
      )}

      {experiments.length >= 2 && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Metrics Table */}
          <Card title="Metrics Comparison (표 2)">
            <ComparisonTable experiments={experiments} />
          </Card>

          {/* Correction Progress Overlay */}
          <Card title="Correction Progress by Round">
            <OverlayAccuracyChart experiments={experiments} />
          </Card>

          {/* Error Distribution */}
          <Card title="Error Distribution Comparison">
            <ErrorComparisonChart experiments={experiments} />
          </Card>
        </Space>
      )}

      {experiments.length === 1 && (
        <Empty description="Select at least 2 experiments to compare" />
      )}
    </div>
  );
}
