import { Select, Typography } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import type { DatabaseInfo } from '../../types';

interface DatabaseSelectorProps {
  databases: DatabaseInfo[];
  selected: string;
  onChange: (dbId: string) => void;
  loading?: boolean;
}

const DATASET_LABEL: Record<string, string> = {
  hrdb: '인사 DB',
  bird: 'BIRD 벤치마크',
};

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
      placeholder="데이터베이스 선택"
      style={{ width: '100%' }}
      suffixIcon={<DatabaseOutlined />}
      showSearch
      optionFilterProp="label"
      optionLabelProp="label"
      options={databases.map((db) => ({
        value: db.id,
        label: db.id,
        dataset: db.dataset,
        table_count: db.table_count,
      }))}
      optionRender={(option) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text>{option.data.label}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {DATASET_LABEL[option.data.dataset] ?? option.data.dataset}
            {' · '}
            {option.data.table_count}개 테이블
          </Typography.Text>
        </div>
      )}
    />
  );
}
