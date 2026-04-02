import { Card, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  icon?: ReactNode;
  precision?: number;
}

export default function MetricCard({
  label,
  value,
  unit,
  icon,
  precision = 1,
}: MetricCardProps) {
  const displayValue = unit === '%' ? value * 100 : value;

  return (
    <Card hoverable style={{ textAlign: 'center' }}>
      <Statistic
        title={label}
        value={displayValue}
        precision={precision}
        suffix={unit}
        prefix={icon}
      />
    </Card>
  );
}
