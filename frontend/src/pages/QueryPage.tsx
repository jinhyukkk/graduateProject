import { useState } from 'react';
import { Typography, Alert, Spin, Space } from 'antd';
import { useDatabases, useRunQuery } from '../hooks/useApi';
import DatabaseSelector from '../components/query/DatabaseSelector';
import QueryInput from '../components/query/QueryInput';
import PipelineVisualizer from '../components/query/PipelineVisualizer';
import SchemaContextDisplay from '../components/query/SchemaContextDisplay';
import SqlDisplay from '../components/query/SqlDisplay';
import CorrectionStepper from '../components/correction/CorrectionStepper';
import ResultTable from '../components/query/ResultTable';
import ResultExplanation from '../components/query/ResultExplanation';
import type { QueryResult } from '../types';

export default function QueryPage() {
  const [queryText, setQueryText] = useState('');
  const [selectedDb, setSelectedDb] = useState('');
  const [activeCorrectionStep, setActiveCorrectionStep] = useState(1);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [result, setResult] = useState<QueryResult | null>(null);

  const {
    data: dbData,
    isLoading: dbLoading,
    error: dbError,
  } = useDatabases();

  const mutation = useRunQuery();

  // Auto-select first database
  if (dbData?.databases.length && !selectedDb) {
    setSelectedDb(dbData.databases[0].id);
  }

  const handleSubmit = () => {
    if (!queryText.trim() || !selectedDb) return;
    setResult(null);
    setPipelineStep(1);

    mutation.mutate(
      {
        query: queryText,
        db_id: selectedDb,
        dataset:
          dbData?.databases.find((d) => d.id === selectedDb)?.dataset || 'spider',
      },
      {
        onSuccess: (data) => {
          setResult(data);
          setPipelineStep(4);
          if (data.correction_steps.length > 0) {
            setActiveCorrectionStep(data.correction_steps[0].round);
          }
        },
        onError: () => {
          setPipelineStep(0);
        },
      },
    );
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Typography.Title level={3}>Query Interface</Typography.Title>

      {dbError && (
        <Alert
          message="Failed to load databases"
          description={String(dbError)}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Input panel */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 20,
          marginBottom: 16,
          border: '1px solid #f0f0f0',
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <DatabaseSelector
            databases={dbData?.databases || []}
            selected={selectedDb}
            onChange={setSelectedDb}
            loading={dbLoading}
          />
          <QueryInput
            value={queryText}
            onChange={setQueryText}
            onSubmit={handleSubmit}
            isLoading={mutation.isPending}
          />
        </Space>
      </div>

      {/* Pipeline progress */}
      <PipelineVisualizer
        currentStep={mutation.isPending ? 2 : pipelineStep}
        isLoading={mutation.isPending}
      />

      {/* Error */}
      {mutation.isError && (
        <Alert
          message="Query execution failed"
          description={mutation.error?.message}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Loading */}
      {mutation.isPending && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" tip="Running pipeline..." />
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Schema */}
          <SchemaContextDisplay schema={result.schema_context} />

          {/* Generated SQL */}
          <SqlDisplay
            sql={result.original_sql}
            label="Generated SQL"
          />

          {/* Final SQL (if corrected) */}
          {result.was_corrected && (
            <SqlDisplay
              sql={result.final_sql}
              label="Final SQL"
              corrected
            />
          )}

          {/* Correction History */}
          {result.correction_steps.length > 0 && (
            <CorrectionStepper
              steps={result.correction_steps}
              activeStep={activeCorrectionStep}
              onStepClick={setActiveCorrectionStep}
            />
          )}

          {/* Result Table */}
          <ResultTable
            columns={result.result.columns}
            rows={result.result.rows}
          />

          {/* Explanation */}
          {result.explanation && (
            <ResultExplanation explanation={result.explanation} />
          )}
        </>
      )}
    </div>
  );
}
