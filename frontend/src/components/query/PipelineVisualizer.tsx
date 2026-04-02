import { Steps, Card } from 'antd';
import {
  DatabaseOutlined,
  CodeOutlined,
  SyncOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

interface PipelineVisualizerProps {
  currentStep: number; // 0=idle, 1=schema, 2=sql, 3=correction, 4=result
  isLoading: boolean;
}

const stepItems = [
  { title: 'Schema Linking', icon: <DatabaseOutlined /> },
  { title: 'SQL Generation', icon: <CodeOutlined /> },
  { title: 'Self-Correction', icon: <SyncOutlined /> },
  { title: 'Result', icon: <CheckCircleOutlined /> },
];

export default function PipelineVisualizer({
  currentStep,
  isLoading,
}: PipelineVisualizerProps) {
  if (currentStep === 0 && !isLoading) return null;

  return (
    <Card size="small" title="Pipeline Progress" style={{ marginBottom: 16 }}>
      <Steps
        current={currentStep > 0 ? currentStep - 1 : 0}
        status={isLoading ? 'process' : 'finish'}
        items={stepItems}
        size="small"
      />
    </Card>
  );
}
