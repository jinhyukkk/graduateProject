import { Card } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { ErrorDistribution } from '../../types';

interface ErrorTypeBarChartProps {
  data: ErrorDistribution[];
}

const COLORS = [
  '#ff4d4f',
  '#ff7a45',
  '#ffa940',
  '#ffc53d',
  '#73d13d',
  '#36cfc9',
  '#597ef7',
  '#9254de',
];

export default function ErrorTypeBarChart({ data }: ErrorTypeBarChartProps) {
  const chartData = [...data].sort((a, b) => b.count - a.count);

  return (
    <Card size="small" title="Error Type Distribution">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="error_type"
            width={140}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Bar dataKey="count" name="Count" barSize={20}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
