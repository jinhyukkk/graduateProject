import { Tabs, Tag, Typography, Card, Space, Badge } from 'antd';
import type { CorrectionStep } from '../../types';
import SqlDisplay from '../query/SqlDisplay';

interface CorrectionStepperProps {
  steps: CorrectionStep[];
  activeStep: number;
  onStepClick: (step: number) => void;
}

export default function CorrectionStepper({
  steps,
  activeStep,
  onStepClick,
}: CorrectionStepperProps) {
  if (!steps.length) return null;

  const items = steps.map((step) => ({
    key: String(step.round),
    label: (
      <span>
        Round {step.round}{' '}
        <Badge
          color={step.validation_success ? 'green' : 'red'}
          style={{ marginLeft: 4 }}
        />
      </span>
    ),
    children: <CorrectionRound step={step} />,
  }));

  return (
    <Card size="small" title="Correction History" style={{ marginBottom: 12 }}>
      <Tabs
        activeKey={String(activeStep)}
        onChange={(key) => onStepClick(Number(key))}
        items={items}
        size="small"
      />
    </Card>
  );
}

function CorrectionRound({ step }: { step: CorrectionStep }) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div>
        <Tag color="error">{step.error_type}</Tag>
        <Typography.Text type="secondary">
          Semantic Score: {step.semantic_score.toFixed(2)}
        </Typography.Text>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Before
          </Typography.Text>
          <SqlDisplay sql={step.original_sql} label="Original" />
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            After
          </Typography.Text>
          <SqlDisplay sql={step.corrected_sql} label="Corrected" corrected />
        </div>
      </div>
    </Space>
  );
}
