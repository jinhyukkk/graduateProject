import { Table, Card, Empty, Typography } from 'antd';
import { TableOutlined } from '@ant-design/icons';

interface ResultTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  maxRows?: number;
  isLoading?: boolean;
  title?: string;
}

export default function ResultTable({
  columns,
  rows,
  maxRows = 100,
  isLoading = false,
  title = '쿼리 결과',
}: ResultTableProps) {
  if (!columns.length && !isLoading) {
    return (
      <Empty
        description={
          <Typography.Text type="secondary">
            조건에 맞는 결과가 없습니다
          </Typography.Text>
        }
        style={{ padding: 48 }}
      />
    );
  }

  const tableColumns = columns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    render: (val: unknown) =>
      val === null ? (
        <span style={{ color: '#bfbfbf', fontStyle: 'italic', fontSize: 12 }}>NULL</span>
      ) : (
        String(val)
      ),
  }));

  const dataSource = rows.slice(0, maxRows).map((row, idx) => ({
    ...row,
    _key: idx,
  }));

  return (
    <Card
      size="small"
      title={
        <span>
          <TableOutlined style={{ marginRight: 6, color: '#1677ff' }} />
          {title}
        </span>
      }
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {rows.length.toLocaleString()}행
        </Typography.Text>
      }
    >
      <Table
        columns={tableColumns}
        dataSource={dataSource}
        rowKey="_key"
        size="small"
        loading={isLoading}
        pagination={
          rows.length > 10
            ? { pageSize: 10, size: 'small', showSizeChanger: false }
            : false
        }
        scroll={{ x: 'max-content' }}
        style={{ fontSize: 13 }}
      />
    </Card>
  );
}
