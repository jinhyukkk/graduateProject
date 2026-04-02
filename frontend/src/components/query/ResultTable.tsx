import { Table, Card, Empty } from 'antd';

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
  title = 'Query Result',
}: ResultTableProps) {
  if (!columns.length && !isLoading) {
    return <Empty description="No results" />;
  }

  const tableColumns = columns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    render: (val: unknown) =>
      val === null ? <span style={{ color: '#ccc' }}>NULL</span> : String(val),
  }));

  const dataSource = rows.slice(0, maxRows).map((row, idx) => ({
    ...row,
    _key: idx,
  }));

  return (
    <Card
      size="small"
      title={`${title} (${rows.length} rows)`}
      style={{ marginBottom: 12 }}
    >
      <Table
        columns={tableColumns}
        dataSource={dataSource}
        rowKey="_key"
        size="small"
        loading={isLoading}
        pagination={rows.length > 10 ? { pageSize: 10, size: 'small' } : false}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
}
