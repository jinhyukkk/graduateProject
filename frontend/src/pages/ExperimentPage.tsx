import { useState, useMemo, useCallback } from 'react';
import { Typography, Alert, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useConfig, useCreateExperiment, useCreateKSweep, useBatchStatus } from '../hooks/useApi';
import { useExperimentProgress } from '../hooks/useExperimentProgress';
import ExperimentForm from '../components/experiment/ExperimentForm';
import KSweepPanel from '../components/experiment/KSweepPanel';
import ExperimentProgressBar from '../components/experiment/ProgressBar';
import LogStream from '../components/experiment/LogStream';
import type { ExperimentConfig, KSweepConfig } from '../types';

export default function ExperimentPage() {
  const navigate = useNavigate();
  const { data: config, isLoading: configLoading } = useConfig();
  const createExperiment = useCreateExperiment();
  const createKSweep = useCreateKSweep();
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  const progress = useExperimentProgress(experimentId);
  const { data: batchStatus } = useBatchStatus(batchId);

  const isRunning = progress.status === 'running' || createExperiment.isPending || createKSweep.isPending;

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

  const handleKSweep = useCallback(
    (cfg: KSweepConfig) => {
      createKSweep.mutate(cfg, {
        onSuccess: (data) => {
          setBatchId(data.batch_id);
          // Track the first experiment for progress display
          if (data.experiment_ids.length > 0) {
            setExperimentId(data.experiment_ids[0]);
          }
        },
      });
    },
    [createKSweep],
  );

  // Navigate to results on completion (single experiment)
  if (progress.status === 'completed' && experimentId && !batchId) {
    setTimeout(() => {
      navigate(`/results/${experimentId}`);
    }, 2000);
  }

  // Navigate to comparison on batch completion
  if (batchStatus?.status === 'completed' && batchId) {
    setTimeout(() => {
      const ids = batchStatus.experiment_ids.join(',');
      navigate(`/comparison?ids=${ids}`);
    }, 2000);
  }

  const defaults = {
    model: config?.llm.model || 'gpt-4o-2024-11-20',
    max_rounds: config?.correction.max_rounds || 3,
    semantic_threshold: config?.correction.semantic_threshold || 0.75,
  };

  const datasets = config?.available_datasets || [
    { id: 'hrdb', label: 'HR-DB', dev_count: 150 },
    { id: 'bird', label: 'BIRD', dev_count: 1534 },
  ];

  const models = config?.available_models || ['gpt-4o-2024-11-20'];

  const error = createExperiment.error || createKSweep.error;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Typography.Title level={3}>Experiment Runner</Typography.Title>

      {error && (
        <Alert
          message="Failed to create experiment"
          description={(error as Error)?.message}
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

      {progress.status === 'completed' && !batchId && (
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

      {batchStatus?.status === 'completed' && (
        <Alert
          message="K-Sweep completed!"
          description={`${batchStatus.k_values.length} experiments finished. Redirecting to comparison...`}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        defaultActiveKey="single"
        items={[
          {
            key: 'single',
            label: 'Single Experiment',
            children: (
              <ExperimentForm
                onSubmit={handleSubmit}
                isRunning={isRunning}
                availableModels={models}
                availableDatasets={datasets}
                defaults={defaults}
              />
            ),
          },
          {
            key: 'ksweep',
            label: 'K-Sweep (표 5)',
            children: (
              <KSweepPanel
                onSubmit={handleKSweep}
                isRunning={isRunning}
                batch={batchStatus ?? null}
                availableModels={models}
                availableDatasets={datasets}
                defaults={defaults}
              />
            ),
          },
        ]}
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
        estimatedRemaining={undefined}
      />

      {(progress.logs.length > 0 || isRunning) && (
        <LogStream logs={progress.logs} />
      )}
    </div>
  );
}
