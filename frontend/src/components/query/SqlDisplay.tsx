import { Card, Tag } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SqlDisplayProps {
  sql: string;
  label?: string;
  corrected?: boolean;
}

export default function SqlDisplay({
  sql,
  label = 'SQL',
  corrected,
}: SqlDisplayProps) {
  return (
    <Card
      size="small"
      title={
        <span>
          {label}{' '}
          {corrected && <Tag color="success">Corrected</Tag>}
        </span>
      }
      style={{ marginBottom: 12 }}
    >
      <SyntaxHighlighter
        language="sql"
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          background: '#fafafa',
        }}
        wrapLongLines
      >
        {sql}
      </SyntaxHighlighter>
    </Card>
  );
}
