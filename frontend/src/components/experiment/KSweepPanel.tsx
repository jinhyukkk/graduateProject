import { useState } from 'react';
import {
  Card,
  Form,
  Select,
  Radio,
  Slider,
  InputNumber,
  Button,
  Space,
  Typography,
  Checkbox,
  Progress,
  Tag,
} from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import type { KSweepConfig, BatchExperiment } from '../../types';

interface KSweepPanelProps {
  onSubmit: (config: KSweepConfig) => void;
  isRunning: boolean;
  batch: BatchExperiment | null;
  availableModels: string[];
  availableDatasets: Array<{ id: string; label: string; dev_count: number }>;
  defaults: {
    model: string;
    semantic_threshold: number;
  };
}

const ALL_K_VALUES = [0, 1, 2, 3, 4, 5];

export default function KSweepPanel({
  onSubmit,
  isRunning,
  batch,
  availableModels,
  availableDatasets,
  defaults,
}: KSweepPanelProps) {
  const [config, setConfig] = useState<KSweepConfig>({
    dataset: 'hrdb',
    model: defaults.model,
    semantic_threshold: defaults.semantic_threshold,
    sample_count: null,
    k_values: ALL_K_VALUES,
  });

  const handleSubmit = () => {
    onSubmit(config);
  };

  const batchProgress = batch
    ? Math.round(((batch.completed_count ?? 0) / batch.k_values.length) * 100)
    : 0;

  return (
    <Card title="K-Sweep Experiment" style={{ marginBottom: 16 }}>
      <Typography.Paragraph type="secondary">
        K=0~5까지 자동으로 반복 실행하여 교정 반복 횟수별 성능을 비교합니다. (논문 표 5)
      </Typography.Paragraph>

      <Form layout="vertical" style={{ maxWidth: 600 }}>
        <Form.Item label="Model">
          <Select
            value={config.model}
            onChange={(model) => setConfig((c) => ({ ...c, model }))}
            options={availableModels.map((m) => ({ value: m, label: m }))}
            disabled={isRunning}
          />
        </Form.Item>

        <Form.Item label="Dataset">
          <Radio.Group
            value={config.dataset}
            onChange={(e) =>
              setConfig((c) => ({ ...c, dataset: e.target.value }))
            }
            disabled={isRunning}
          >
            {availableDatasets.map((ds) => (
              <Radio.Button key={ds.id} value={ds.id}>
                {ds.label} ({ds.dev_count})
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item label="K Values">
          <Checkbox.Group
            value={config.k_values}
            onChange={(values) =>
              setConfig((c) => ({ ...c, k_values: (values as number[]).sort() }))
            }
            disabled={isRunning}
            options={ALL_K_VALUES.map((k) => ({
              label: `K=${k}`,
              value: k,
            }))}
          />
        </Form.Item>

        <Form.Item
          label={`Semantic Threshold: ${config.semantic_threshold.toFixed(2)}`}
        >
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={config.semantic_threshold}
            onChange={(semantic_threshold) =>
              setConfig((c) => ({ ...c, semantic_threshold }))
            }
            disabled={isRunning}
          />
        </Form.Item>

        <Form.Item label="Sample Count">
          <Space>
            <InputNumber
              min={1}
              max={5000}
              value={config.sample_count ?? undefined}
              onChange={(val) =>
                setConfig((c) => ({ ...c, sample_count: val ?? null }))
              }
              placeholder="All samples"
              disabled={isRunning}
              style={{ width: 160 }}
            />
            <Typography.Text type="secondary">
              Leave empty for all samples
            </Typography.Text>
          </Space>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            size="large"
            icon={<ExperimentOutlined />}
            onClick={handleSubmit}
            loading={isRunning}
            disabled={config.k_values.length === 0}
          >
            Run K-Sweep ({config.k_values.length} experiments)
          </Button>
        </Form.Item>
      </Form>

      {/* Batch Progress */}
      {batch && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>Batch Progress</Typography.Text>
          <Progress percent={batchProgress} status={batch.status === 'failed' ? 'exception' : undefined} />
          <Space wrap style={{ marginTop: 8 }}>
            {batch.k_values.map((k, i) => {
              const expId = batch.experiment_ids[i];
              const isDone = (batch.completed_count ?? 0) > i;
              const isCurrent = batch.current_k === k;
              return (
                <Tag
                  key={k}
                  color={isDone ? 'green' : isCurrent ? 'processing' : 'default'}
                >
                  K={k} {isDone ? '✓' : isCurrent ? '...' : ''}
                </Tag>
              );
            })}
          </Space>
        </div>
      )}
    </Card>
  );
}
