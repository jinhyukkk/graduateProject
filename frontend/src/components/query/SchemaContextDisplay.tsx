import { useState } from 'react';
import { Tag, Typography, Button } from 'antd';
import { DatabaseOutlined, LinkOutlined } from '@ant-design/icons';
import type { SchemaContext, ForeignKey } from '../../types';

interface SchemaContextDisplayProps {
  schema: SchemaContext | null;
}

export default function SchemaContextDisplay({ schema }: SchemaContextDisplayProps) {
  const [fkExpanded, setFkExpanded] = useState(false);

  if (!schema || !schema.tables?.length) return null;

  return (
    <div
      style={{
        padding: '6px 10px',
        background: '#f9f9f9',
        border: '1px solid #f0f0f0',
        borderRadius: 6,
      }}
    >
      {/* 테이블 태그 목록 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <DatabaseOutlined style={{ fontSize: 11, color: '#8c8c8c', flexShrink: 0 }} />
        <Typography.Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
          링크된 테이블
        </Typography.Text>
        {schema.tables.map((t) => (
          <Tag key={t.name} style={{ fontSize: 11, margin: '0 2px 2px 0', lineHeight: '18px' }}>
            {t.name}
            <span style={{ color: '#bfbfbf', marginLeft: 3 }}>{t.columns.length}열</span>
          </Tag>
        ))}

        {/* FK 토글 버튼 */}
        {schema.foreign_keys.length > 0 && (
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            style={{ fontSize: 11, padding: '0 4px', height: 'auto', color: '#8c8c8c' }}
            onClick={() => setFkExpanded((v) => !v)}
          >
            FK {schema.foreign_keys.length}개 {fkExpanded ? '▲' : '▼'}
          </Button>
        )}
      </div>

      {/* FK 상세 (토글) */}
      {fkExpanded && schema.foreign_keys.length > 0 && (
        <div style={{ marginTop: 6, paddingLeft: 16 }}>
          {schema.foreign_keys.map((fk: ForeignKey, i: number) => (
            <Typography.Text
              key={i}
              type="secondary"
              style={{ fontSize: 11, display: 'block', lineHeight: 1.8 }}
            >
              {fk.from_table}.{fk.from_column}
              <span style={{ color: '#bfbfbf', margin: '0 4px' }}>→</span>
              {fk.to_table}.{fk.to_column}
            </Typography.Text>
          ))}
        </div>
      )}
    </div>
  );
}
