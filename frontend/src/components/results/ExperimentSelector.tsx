import { Select } from 'antd';
import dayjs from 'dayjs';
import type { ExperimentSummary } from '../../types';

interface ExperimentSelectorProps {
  experiments: ExperimentSummary[];
  selectedId: string | null;
  onChange: (id: string) => void;
  loading?: boolean;
}

export default function ExperimentSelector({
  experiments,
  selectedId,
  onChange,
  loading,
}: ExperimentSelectorProps) {
  return (
    <Select
      value={selectedId ?? undefined}
      onChange={onChange}
      loading={loading}
      placeholder="Select an experiment"
      style={{ width: 420, marginBottom: 16 }}
      options={experiments.map((exp) => ({
        value: exp.id,
        label: `${dayjs(exp.created_at).format('YYYY-MM-DD HH:mm')} | ${exp.dataset.toUpperCase()} | ${exp.config.model} | K=${exp.config.max_rounds} [${exp.status}]`,
      }))}
    />
  );
}
