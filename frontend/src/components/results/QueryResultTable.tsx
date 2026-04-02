import { Table, Tag, Radio, Card, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ExperimentDetailedResult } from '../../types';

interface QueryResultTableProps {
  results: ExperimentDetailedResult[];
  total: number;
  page: number;
  pageSize: number;
  filter: string;
  onFilterChange: (filter: string) => void;
  onPageChange: (page: number, pageSize: number) => void;
  onRowClick: (index: number) => void;
  loading?: boolean;
}

export default function QueryResultTable({
  results,
  total,
  page,
  pageSize,
  filter,
  onFilterChange,
  onPageChange,
  onRowClick,
  loading = false,
}: QueryResultTableProps) {
  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 60,
    },
    {
      title: 'DB',
      dataIndex: 'db_id',
      key: 'db_id',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Question',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
    },
    {
      title: 'OK',
      dataIndex: 'correct',
      key: 'correct',
      width: 60,
      align: 'center' as const,
      render: (correct: boolean) =>
        correct ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
        ),
    },
    {
      title: 'Rounds',
      dataIndex: 'correction_rounds',
      key: 'correction_rounds',
      width: 80,
      align: 'center' as const,
      render: (rounds: number) =>
        rounds > 0 ? <Tag color="blue">{rounds}</Tag> : <Tag>0</Tag>,
    },
    {
      title: 'Latency',
      dataIndex: 'latency',
      key: 'latency',
      width: 90,
      align: 'right' as const,
      render: (v: number) => `${v.toFixed(1)}s`,
    },
  ];

  return (
    <Card
      size="small"
      title="Sample Results"
      extra={
        <Radio.Group
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          size="small"
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="all">All</Radio.Button>
          <Radio.Button value="correct">Correct</Radio.Button>
          <Radio.Button value="incorrect">Incorrect</Radio.Button>
          <Radio.Button value="corrected">Corrected</Radio.Button>
        </Radio.Group>
      }
    >
      <Table
        columns={columns}
        dataSource={results}
        rowKey="index"
        size="small"
        loading={loading}
        onRow={(record) => ({
          onClick: () => onRowClick(record.index),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: onPageChange,
          showSizeChanger: true,
          showTotal: (t) => `Total ${t} queries`,
          size: 'small',
        }}
      />
    </Card>
  );
}
