import { Card, Progress, Typography, Space, Tag } from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

interface ProgressBarProps {
  progress: number;
  current: number;
  total: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  estimatedRemaining?: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `~${m}m ${s}s`;
}

function statusIcon(status: string) {
  switch (status) {
    case 'running':
      return <LoadingOutlined spin />;
    case 'completed':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'failed':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    default:
      return <ClockCircleOutlined />;
  }
}

export default function ExperimentProgressBar({
  progress,
  current,
  total,
  status,
  estimatedRemaining,
}: ProgressBarProps) {
  if (status === 'idle') return null;

  const percent = total > 0 ? Math.round((current / total) * 100) : progress;

  return (
    <Card size="small" title="Progress" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Progress
          percent={percent}
          status={
            status === 'failed'
              ? 'exception'
              : status === 'completed'
                ? 'success'
                : 'active'
          }
          format={() => `${percent}%`}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            {statusIcon(status)}
            <Typography.Text>
              {current} / {total}
            </Typography.Text>
            <Tag
              color={
                status === 'running'
                  ? 'processing'
                  : status === 'completed'
                    ? 'success'
                    : status === 'failed'
                      ? 'error'
                      : 'default'
              }
            >
              {status.toUpperCase()}
            </Tag>
          </Space>
          {estimatedRemaining !== undefined && status === 'running' && (
            <Typography.Text type="secondary">
              Estimated remaining: {formatTime(estimatedRemaining)}
            </Typography.Text>
          )}
        </div>
      </Space>
    </Card>
  );
}
