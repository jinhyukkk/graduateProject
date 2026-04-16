import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';

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
  placeholder = '데이터베이스에 질문하세요... (Enter 전송 · Shift+Enter 줄바꿈)',
}: QueryInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) onSubmit();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <Input.TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoSize={{ minRows: 1, maxRows: 5 }}
        disabled={isLoading}
        style={{
          fontSize: 14,
          resize: 'none',
          lineHeight: 1.65,
          borderRadius: 22,
          paddingLeft: 18,
          paddingRight: 18,
          paddingTop: 10,
          paddingBottom: 10,
          background: '#f7f8fa',
          border: '1px solid #e0e0e0',
          boxShadow: 'none',
        }}
        autoFocus
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={onSubmit}
        loading={isLoading}
        disabled={!value.trim() || isLoading}
        shape="circle"
        size="large"
        style={{ flexShrink: 0, marginBottom: 1 }}
      />
    </div>
  );
}
