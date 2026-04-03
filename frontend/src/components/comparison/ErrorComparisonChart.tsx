import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ExperimentDetail } from '../../types';

interface ErrorComparisonChartProps {
  experiments: ExperimentDetail[];
}

const COLORS = ['#1890ff', '#52c41a', '#fa541c', '#722ed1', '#13c2c2', '#eb2f96'];

export default function ErrorComparisonChart({
  experiments,
}: ErrorComparisonChartProps) {
  // Collect all error types across experiments
  const allTypes = new Set<string>();
  for (const exp of experiments) {
    for (const ed of exp.error_distribution || []) {
      allTypes.add(ed.error_type);
    }
  }

  const data = Array.from(allTypes).map((errorType) => {
    const point: Record<string, string | number> = { error_type: errorType };
    for (const exp of experiments) {
      const mode = exp.config.pipeline_mode || 'sc-tsql';
      const label = `${mode} K=${exp.config.max_rounds}`;
      const ed = exp.error_distribution?.find((e) => e.error_type === errorType);
      point[label] = ed?.count || 0;
    }
    return point;
  });

  const barKeys = experiments.map((exp) => {
    const mode = exp.config.pipeline_mode || 'sc-tsql';
    return `${mode} K=${exp.config.max_rounds}`;
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="error_type" angle={-30} textAnchor="end" height={80} />
        <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        {barKeys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
