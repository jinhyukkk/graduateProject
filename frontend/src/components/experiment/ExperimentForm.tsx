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
  Collapse,
  Switch,
  Divider,
} from 'antd';
import { PlayCircleOutlined, SettingOutlined } from '@ant-design/icons';
import type { ExperimentConfig, AblationFlags, PipelineMode } from '../../types';

const PIPELINE_PRESETS: Record<
  Exclude<PipelineMode, 'custom'>,
  { label: string; desc: string; max_rounds: number; ablation: AblationFlags }
> = {
  'sc-tsql': {
    label: 'SC-TSQL (Full)',
    desc: '전체 파이프라인',
    max_rounds: 3,
    ablation: {
      disable_schema_linker: false,
      disable_execution_validator: false,
      disable_semantic_verifier: false,
      disable_correction_loop: false,
    },
  },
  chess: {
    label: 'CHESS',
    desc: '교정 1회, 의미검증 OFF',
    max_rounds: 1,
    ablation: {
      disable_schema_linker: false,
      disable_execution_validator: false,
      disable_semantic_verifier: true,
      disable_correction_loop: false,
    },
  },
  'dail-sql': {
    label: 'DAIL-SQL',
    desc: '교정 없음',
    max_rounds: 0,
    ablation: {
      disable_schema_linker: false,
      disable_execution_validator: false,
      disable_semantic_verifier: true,
      disable_correction_loop: true,
    },
  },
  'din-sql': {
    label: 'DIN-SQL',
    desc: '스키마링커만',
    max_rounds: 0,
    ablation: {
      disable_schema_linker: false,
      disable_execution_validator: false,
      disable_semantic_verifier: true,
      disable_correction_loop: true,
    },
  },
  'zero-shot': {
    label: 'Zero-shot',
    desc: '모든 보조 모듈 OFF',
    max_rounds: 0,
    ablation: {
      disable_schema_linker: true,
      disable_execution_validator: false,
      disable_semantic_verifier: true,
      disable_correction_loop: true,
    },
  },
};

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
    dataset: 'hrdb',
    model: defaults.model,
    max_rounds: defaults.max_rounds,
    semantic_threshold: defaults.semantic_threshold,
    sample_count: null,
    pipeline_mode: 'sc-tsql',
    ablation: PIPELINE_PRESETS['sc-tsql'].ablation,
  });

  const handleModeChange = (mode: PipelineMode) => {
    if (mode === 'custom') {
      setConfig((c) => ({ ...c, pipeline_mode: 'custom' }));
      return;
    }
    const preset = PIPELINE_PRESETS[mode];
    setConfig((c) => ({
      ...c,
      pipeline_mode: mode,
      max_rounds: preset.max_rounds,
      ablation: { ...preset.ablation },
    }));
  };

  const handleAblationChange = (key: keyof AblationFlags, value: boolean) => {
    setConfig((c) => ({
      ...c,
      pipeline_mode: 'custom',
      ablation: { ...(c.ablation ?? PIPELINE_PRESETS['sc-tsql'].ablation), [key]: value },
    }));
  };

  const handleSubmit = () => {
    onSubmit(config);
  };

  return (
    <Card title="Experiment Configuration" style={{ marginBottom: 16 }}>
      <Form layout="vertical" style={{ maxWidth: 600 }}>
        {/* Pipeline Mode Selector */}
        <Form.Item label="Pipeline Mode">
          <Radio.Group
            value={config.pipeline_mode}
            onChange={(e) => handleModeChange(e.target.value)}
            disabled={isRunning}
            optionType="button"
            buttonStyle="solid"
          >
            {Object.entries(PIPELINE_PRESETS).map(([key, preset]) => (
              <Radio.Button key={key} value={key}>
                {preset.label}
              </Radio.Button>
            ))}
            <Radio.Button value="custom">Custom</Radio.Button>
          </Radio.Group>
          {config.pipeline_mode && config.pipeline_mode !== 'custom' && (
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              {PIPELINE_PRESETS[config.pipeline_mode as Exclude<PipelineMode, 'custom'>]?.desc}
            </Typography.Text>
          )}
        </Form.Item>

        <Divider />

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
            min={0}
            max={5}
            value={config.max_rounds}
            onChange={(max_rounds) =>
              setConfig((c) => ({ ...c, max_rounds, pipeline_mode: 'custom' }))
            }
            disabled={isRunning}
            marks={{ 0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }}
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

        {/* Ablation Settings */}
        <Collapse
          ghost
          items={[
            {
              key: 'ablation',
              label: (
                <Space>
                  <SettingOutlined />
                  Ablation Settings
                </Space>
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Schema Linker</span>
                    <Switch
                      checked={!config.ablation?.disable_schema_linker}
                      onChange={(v) => handleAblationChange('disable_schema_linker', !v)}
                      disabled={isRunning}
                      checkedChildren="ON"
                      unCheckedChildren="OFF"
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Execution Validator</span>
                    <Switch
                      checked={!config.ablation?.disable_execution_validator}
                      onChange={(v) => handleAblationChange('disable_execution_validator', !v)}
                      disabled={isRunning}
                      checkedChildren="ON"
                      unCheckedChildren="OFF"
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Semantic Verifier</span>
                    <Switch
                      checked={!config.ablation?.disable_semantic_verifier}
                      onChange={(v) => handleAblationChange('disable_semantic_verifier', !v)}
                      disabled={isRunning}
                      checkedChildren="ON"
                      unCheckedChildren="OFF"
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Correction Loop</span>
                    <Switch
                      checked={!config.ablation?.disable_correction_loop}
                      onChange={(v) => handleAblationChange('disable_correction_loop', !v)}
                      disabled={isRunning}
                      checkedChildren="ON"
                      unCheckedChildren="OFF"
                    />
                  </div>
                </Space>
              ),
            },
          ]}
        />

        <Form.Item style={{ marginTop: 16 }}>
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
