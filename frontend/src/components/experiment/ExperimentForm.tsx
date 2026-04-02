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
} from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import type { ExperimentConfig } from '../../types';

interface ExperimentFormProps {
  onSubmit: (config: ExperimentConfig) => void;
  isRunning: boolean;
  availableModels: string[];
  availableDatasets: Array<{ id: string; label: string; dev_count: number }>;
  defaults: {
    model: string;
    max_rounds: number;
    semantic_threshold: number;
  };
}

export default function ExperimentForm({
  onSubmit,
  isRunning,
  availableModels,
  availableDatasets,
  defaults,
}: ExperimentFormProps) {
  const [config, setConfig] = useState<ExperimentConfig>({
    dataset: 'spider',
    model: defaults.model,
    max_rounds: defaults.max_rounds,
    semantic_threshold: defaults.semantic_threshold,
    sample_count: null,
  });

  const handleSubmit = () => {
    onSubmit(config);
  };

  return (
    <Card title="Experiment Configuration" style={{ marginBottom: 16 }}>
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

        <Form.Item label={`Max Correction Rounds: ${config.max_rounds}`}>
          <Slider
            min={1}
            max={5}
            value={config.max_rounds}
            onChange={(max_rounds) => setConfig((c) => ({ ...c, max_rounds }))}
            disabled={isRunning}
            marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }}
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
            icon={<PlayCircleOutlined />}
            onClick={handleSubmit}
            loading={isRunning}
          >
            Run Experiment
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
