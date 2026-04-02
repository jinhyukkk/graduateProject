import { Input, Button, Space } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function QueryInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'Enter your question in natural language...',
}: QueryInputProps) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPressEnter={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        rows={3}
        disabled={isLoading}
        style={{ fontSize: 14 }}
      />
      <div style={{ textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={onSubmit}
          loading={isLoading}
          disabled={!value.trim()}
          size="large"
        >
          Run Query
        </Button>
      </div>
    </Space>
  );
}
