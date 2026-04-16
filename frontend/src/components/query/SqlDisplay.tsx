import { Card, Tag, Button, Tooltip, message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SqlDisplayProps {
  sql: string;
  label?: string;
  corrected?: boolean;
}

export default function SqlDisplay({ sql, label = 'SQL', corrected }: SqlDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      messageApi.success('클립보드에 복사되었습니다');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card
      size="small"
      title={
        <span>
          {label}
          {corrected && (
            <Tag color="success" style={{ marginLeft: 8 }}>
              교정됨
            </Tag>
          )}
        </span>
      }
      extra={
        <Tooltip title={copied ? '복사됨' : 'SQL 복사'}>
          <Button
            type="text"
            size="small"
            icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
            onClick={handleCopy}
          />
        </Tooltip>
      }
      style={{ marginBottom: 8 }}
    >
      {contextHolder}
      <SyntaxHighlighter
        language="sql"
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: '10px 12px',
          borderRadius: 6,
          fontSize: 12.5,
          background: '#fafafa',
          lineHeight: 1.6,
        }}
        wrapLongLines
      >
        {sql}
      </SyntaxHighlighter>
    </Card>
  );
}
