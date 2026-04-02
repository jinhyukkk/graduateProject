import { Card, Table, Tag, Typography, Collapse } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import type { SchemaContext, SchemaTable, ForeignKey } from '../../types';

interface SchemaContextDisplayProps {
  schema: SchemaContext | null;
}

export default function SchemaContextDisplay({
  schema,
}: SchemaContextDisplayProps) {
  if (!schema) return null;

  const items = schema.tables.map((table: SchemaTable) => ({
    key: table.name,
    label: (
      <Typography.Text strong>
        {table.name}{' '}
        <Tag>{table.columns.length} columns</Tag>
      </Typography.Text>
    ),
    children: (
      <Table
        dataSource={table.columns}
        rowKey="name"
        pagination={false}
        size="small"
        columns={[
          {
            title: 'Column',
            dataIndex: 'name',
            render: (name: string, record) => (
              <span>
                {record.is_primary_key && (
                  <KeyOutlined style={{ color: '#faad14', marginRight: 4 }} />
                )}
                {name}
              </span>
            ),
          },
          {
            title: 'Type',
            dataIndex: 'type',
            render: (type: string) => <Tag>{type}</Tag>,
          },
        ]}
      />
    ),
  }));

  return (
    <Card size="small" title="Linked Schema" style={{ marginBottom: 12 }}>
      <Collapse items={items} size="small" />
      {schema.foreign_keys.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Typography.Text type="secondary" strong>
            Foreign Keys:
          </Typography.Text>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {schema.foreign_keys.map((fk: ForeignKey, i: number) => (
              <li key={i} style={{ fontSize: 12, color: '#666' }}>
                {fk.from_table}.{fk.from_column} → {fk.to_table}.{fk.to_column}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
