import { Table } from 'antd';
import type { ExperimentDetail } from '../../types';

interface ComparisonTableProps {
  experiments: ExperimentDetail[];
}

export default function ComparisonTable({ experiments }: ComparisonTableProps) {
  const metrics = [
    { key: 'execution_accuracy', label: 'EX (%)', format: (v: number) => (v * 100).toFixed(1) },
    { key: 'correction_success_rate', label: 'CSR (%)', format: (v: number) => (v * 100).toFixed(1) },
    { key: 'average_latency', label: 'Avg Latency (s)', format: (v: number) => v.toFixed(1) },
    { key: 'total_evaluated', label: 'Total Evaluated', format: (v: number) => String(v) },
  ];

  const columns = [
    {
      title: 'Metric',
      dataIndex: 'metric',
      key: 'metric',
      width: 180,
      fixed: 'left' as const,
    },
    ...experiments.map((exp) => {
      const mode = exp.config.pipeline_mode || 'sc-tsql';
      const k = exp.config.max_rounds;
      const label = `${mode} K=${k}`;
      return {
        title: (
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{exp.dataset}</div>
          </div>
        ),
        dataIndex: exp.id,
        key: exp.id,
        align: 'center' as const,
      };
    }),
  ];

  const dataSource = metrics.map((m) => {
    const row: Record<string, string> = { key: m.key, metric: m.label };
    for (const exp of experiments) {
      const val = exp.metrics?.[m.key as keyof typeof exp.metrics];
      row[exp.id] = val !== undefined ? m.format(val as number) : '-';
    }
    return row;
  });

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      bordered
      size="middle"
      scroll={{ x: 'max-content' }}
    />
  );
}
