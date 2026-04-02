import { Timeline, Card, Tag, Typography, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { CorrectionStep } from '../../types';
import SqlDisplay from '../query/SqlDisplay';

interface CorrectionTimelineProps {
  history: CorrectionStep[];
}

export default function CorrectionTimeline({
  history,
}: CorrectionTimelineProps) {
  if (!history.length) {
    return (
      <Card size="small" title="Correction Timeline">
        <Typography.Text type="secondary">
          No corrections were applied.
        </Typography.Text>
      </Card>
    );
  }

  const items = history.map((step) => ({
    color: step.validation_success ? 'green' : 'red',
    dot: step.validation_success ? (
      <CheckCircleOutlined />
    ) : (
      <CloseCircleOutlined />
    ),
    children: (
      <Card size="small" style={{ marginBottom: 8 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <Typography.Text strong>Round {step.round}</Typography.Text>
            <Tag color="error" style={{ marginLeft: 8 }}>
              {step.error_type}
            </Tag>
          </div>
          <div>
            <Typography.Text type="secondary">
              Validation:{' '}
              {step.validation_success ? (
                <Tag color="success">PASS</Tag>
              ) : (
                <Tag color="error">FAIL</Tag>
              )}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
              Semantic: {step.semantic_score.toFixed(2)}
              {step.semantic_score < 0.75 && (
                <WarningOutlined
                  style={{ color: '#faad14', marginLeft: 4 }}
                />
              )}
            </Typography.Text>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <SqlDisplay sql={step.original_sql} label="Before" />
            <SqlDisplay sql={step.corrected_sql} label="After" corrected />
          </div>
        </Space>
      </Card>
    ),
  }));

  return (
    <Card size="small" title="Correction Timeline" style={{ marginBottom: 12 }}>
      <Timeline items={items} />
    </Card>
  );
}
