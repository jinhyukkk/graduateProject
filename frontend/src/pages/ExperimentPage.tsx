import { useState, useMemo, useCallback } from 'react';
import { Typography, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useConfig, useCreateExperiment } from '../hooks/useApi';
import { useExperimentProgress } from '../hooks/useExperimentProgress';
import ExperimentForm from '../components/experiment/ExperimentForm';
import ExperimentProgressBar from '../components/experiment/ProgressBar';
import LogStream from '../components/experiment/LogStream';
import type { ExperimentConfig } from '../types';

export default function ExperimentPage() {
  const navigate = useNavigate();
  const { data: config, isLoading: configLoading } = useConfig();
  const createExperiment = useCreateExperiment();
  const [experimentId, setExperimentId] = useState<string | null>(null);

  const progress = useExperimentProgress(experimentId);

  const isRunning = progress.status === 'running' || createExperiment.isPending;

  // Estimate remaining time
  const estimatedRemaining = useMemo(() => {
    if (progress.current <= 0 || progress.total <= 0) return undefined;
    // Simple estimation: avg time per item * remaining
    // We don't have elapsed time in WS, so just show items remaining
    return undefined;
  }, [progress.current, progress.total]);

  const handleSubmit = useCallback(
    (cfg: ExperimentConfig) => {
      createExperiment.mutate(cfg, {
        onSuccess: (data) => {
          setExperimentId(data.id);
        },
      });
    },
    [createExperiment],
  );

  // Navigate to results on completion
  if (progress.status === 'completed' && experimentId) {
    // Small delay to show completion before navigating
    setTimeout(() => {
      navigate(`/results/${experimentId}`);
    }, 2000);
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Typography.Title level={3}>Experiment Runner</Typography.Title>

      {createExperiment.isError && (
        <Alert
          message="Failed to create experiment"
          description={createExperiment.error?.message}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {progress.errorMessage && (
        <Alert
          message="Experiment failed"
          description={progress.errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {progress.status === 'completed' && (
        <Alert
          message="Experiment completed!"
          description={
            progress.metrics
              ? `EX: ${(progress.metrics.execution_accuracy * 100).toFixed(1)}%, CSR: ${(progress.metrics.correction_success_rate * 100).toFixed(1)}%, Avg Latency: ${progress.metrics.average_latency.toFixed(1)}s`
              : 'Redirecting to results...'
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <ExperimentForm
        onSubmit={handleSubmit}
        isRunning={isRunning}
        availableModels={config?.available_models || ['gpt-4o-2024-11-20']}
        availableDatasets={
          config?.available_datasets || [
            { id: 'spider', label: 'Spider', dev_count: 1034 },
            { id: 'bird', label: 'BIRD', dev_count: 1534 },
          ]
        }
        defaults={{
          model: config?.llm.model || 'gpt-4o-2024-11-20',
          max_rounds: config?.correction.max_rounds || 3,
          semantic_threshold: config?.correction.semantic_threshold || 0.75,
        }}
      />

      <ExperimentProgressBar
        progress={
          progress.total > 0
            ? Math.round((progress.current / progress.total) * 100)
            : 0
        }
        current={progress.current}
        total={progress.total}
        status={progress.status}
        estimatedRemaining={estimatedRemaining}
      />

      {(progress.logs.length > 0 || isRunning) && (
        <LogStream logs={progress.logs} />
      )}
    </div>
  );
}
