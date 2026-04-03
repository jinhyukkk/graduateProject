import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ExperimentDetail } from '../../types';

interface OverlayAccuracyChartProps {
  experiments: ExperimentDetail[];
}

const COLORS = ['#1890ff', '#52c41a', '#fa541c', '#722ed1', '#13c2c2', '#eb2f96'];

export default function OverlayAccuracyChart({
  experiments,
}: OverlayAccuracyChartProps) {
  // Build unified chart data: x = round, y = cumulative_accuracy per experiment
  const maxRound = Math.max(
    ...experiments.map((e) =>
      Math.max(...(e.correction_progress?.map((p) => p.round) || [0]), 0),
    ),
    0,
  );

  const data = [];
  for (let r = 0; r <= maxRound; r++) {
    const point: Record<string, number | string> = { round: `Round ${r}` };
    for (const exp of experiments) {
      const mode = exp.config.pipeline_mode || 'sc-tsql';
      const label = `${mode} K=${exp.config.max_rounds}`;
      const cp = exp.correction_progress?.find((p) => p.round === r);
      if (cp) {
        point[label] = +(cp.cumulative_accuracy * 100).toFixed(1);
      }
    }
    data.push(point);
  }

  const lineKeys = experiments.map((exp) => {
    const mode = exp.config.pipeline_mode || 'sc-tsql';
    return `${mode} K=${exp.config.max_rounds}`;
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="round" />
        <YAxis
          domain={[0, 100]}
          label={{ value: 'EX (%)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip />
        <Legend />
        {lineKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
