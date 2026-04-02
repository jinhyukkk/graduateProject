import { Card, Typography } from 'antd';
import { BulbOutlined } from '@ant-design/icons';

interface ResultExplanationProps {
  explanation: string;
}

export default function ResultExplanation({
  explanation,
}: ResultExplanationProps) {
  return (
    <Card
      size="small"
      title={
        <span>
          <BulbOutlined style={{ marginRight: 8 }} />
          Explanation
        </span>
      }
    >
      <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {explanation}
      </Typography.Paragraph>
    </Card>
  );
}
