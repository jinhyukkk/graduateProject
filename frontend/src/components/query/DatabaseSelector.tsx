import { Select } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import type { DatabaseInfo } from '../../types';

interface DatabaseSelectorProps {
  databases: DatabaseInfo[];
  selected: string;
  onChange: (dbId: string) => void;
  loading?: boolean;
}

export default function DatabaseSelector({
  databases,
  selected,
  onChange,
  loading,
}: DatabaseSelectorProps) {
  return (
    <Select
      value={selected || undefined}
      onChange={onChange}
      loading={loading}
      placeholder="Select database"
      style={{ width: 280 }}
      suffixIcon={<DatabaseOutlined />}
      showSearch
      optionFilterProp="label"
      options={databases.map((db) => ({
        value: db.id,
        label: `${db.id} (${db.dataset}, ${db.table_count} tables)`,
      }))}
    />
  );
}
