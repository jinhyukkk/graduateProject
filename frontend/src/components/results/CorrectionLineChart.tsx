import { Card } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Bar,
  ComposedChart,
} from 'recharts';
import type { CorrectionProgress } from '../../types';

interface CorrectionLineChartProps {
  data: CorrectionProgress[];
}

export default function CorrectionLineChart({
  data,
}: CorrectionLineChartProps) {
  const chartData = data.map((d) => ({
    name: `R${d.round}`,
    accuracy: +(d.cumulative_accuracy * 100).toFixed(1),
    newly_corrected: d.newly_corrected,
  }));

  return (
    <Card size="small" title="Correction Accuracy by Round">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'accuracy') return [`${value}%`, 'Cumulative Accuracy'];
              return [value, 'Newly Corrected'];
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="accuracy"
            stroke="#1677ff"
            strokeWidth={2}
            dot={{ r: 5 }}
            name="Cumulative Accuracy"
          />
          <Bar
            yAxisId="right"
            dataKey="newly_corrected"
            fill="#95de64"
            name="Newly Corrected"
            barSize={30}
            opacity={0.7}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
