import { useState, useRef, useEffect } from 'react';
import {
  Typography,
  Select,
  Tag,
  Space,
  Alert,
  Collapse,
  Button,
  Tooltip,
} from 'antd';
import {
  CheckCircleFilled,
  ThunderboltFilled,
  DatabaseOutlined,
  RobotOutlined,
  CodeOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useDatabases, useRunQuery } from '../hooks/useApi';
import QueryInput from '../components/query/QueryInput';
import ResultTable from '../components/query/ResultTable';
import SqlDisplay from '../components/query/SqlDisplay';
import CorrectionStepper from '../components/correction/CorrectionStepper';
import SchemaContextDisplay from '../components/query/SchemaContextDisplay';
import type { QueryResult } from '../types';

// ── 예시 질문 ──────────────────────────────────────────────────
const EXAMPLE_QUESTIONS = [
  '부서별 평균 급여를 알려줘',
  '올해 입사한 직원 목록',
  '직책별 인원 현황',
  '가장 최근에 입사한 직원 5명',
  '부서별 퇴사율 추이',
];

// ── 타입 ───────────────────────────────────────────────────────
interface ChatEntry {
  id: string;
  question: string;
  result: QueryResult | null;
  isLoading: boolean;
  error: string | null;
}

// ── 공용 스타일 ────────────────────────────────────────────────
const avatarStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  background: '#f0f5ff',
  border: '1px solid #d6e4ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: '#1677ff',
};

// ── 사용자 말풍선 ──────────────────────────────────────────────
function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
      <div
        style={{
          maxWidth: '72%',
          background: '#1677ff',
          color: '#fff',
          borderRadius: '18px 18px 4px 18px',
          padding: '10px 16px',
          fontSize: 14,
          lineHeight: 1.65,
          wordBreak: 'break-word',
          boxShadow: '0 1px 3px rgba(22,119,255,0.2)',
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ── 로딩 말풍선 (타이핑 인디케이터) ───────────────────────────
function LoadingBubble() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 18,
      }}
    >
      <div style={avatarStyle}>
        <RobotOutlined style={{ fontSize: 14 }} />
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: '4px 18px 18px 18px',
          padding: '14px 18px',
          border: '1px solid #f0f0f0',
          display: 'flex',
          gap: 5,
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#1677ff',
              animation: `sc-bounce 1.2s ${i * 0.18}s infinite`,
              opacity: 0.75,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── 어시스턴트 응답 카드 ───────────────────────────────────────
function AssistantBubble({ entry }: { entry: ChatEntry }) {
  if (entry.isLoading) return <LoadingBubble />;

  if (entry.error) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 18 }}>
        <div style={avatarStyle}>
          <RobotOutlined style={{ fontSize: 14 }} />
        </div>
        <Alert
          message="오류가 발생했습니다"
          description={entry.error}
          type="error"
          showIcon
          style={{
            flex: 1,
            borderRadius: '4px 12px 12px 12px',
            fontSize: 13,
          }}
        />
      </div>
    );
  }

  if (!entry.result) return null;
  const r = entry.result;

  const collapseItems = [
    {
      key: 'sql',
      label: (
        <Typography.Text style={{ fontSize: 12, color: '#595959' }}>
          <CodeOutlined style={{ marginRight: 5 }} />
          생성된 SQL {r.was_corrected ? '· 교정 적용됨' : ''}
        </Typography.Text>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <SqlDisplay sql={r.original_sql} label="생성된 SQL" />
          {r.was_corrected && <SqlDisplay sql={r.final_sql} label="최종 SQL" corrected />}
          <SchemaContextDisplay schema={r.schema_context} />
        </Space>
      ),
    },
    ...(r.correction_steps.length > 0
      ? [
          {
            key: 'corrections',
            label: (
              <Typography.Text style={{ fontSize: 12, color: '#595959' }}>
                <HistoryOutlined style={{ marginRight: 5 }} />
                교정 이력
                <Tag style={{ marginLeft: 6, fontSize: 11 }}>
                  {r.correction_steps.length}회
                </Tag>
              </Typography.Text>
            ),
            children: (
              <CorrectionStepper
                steps={r.correction_steps}
                activeStep={r.correction_steps[0]?.round ?? 1}
                onStepClick={() => {}}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 22,
      }}
    >
      <div style={avatarStyle}>
        <RobotOutlined style={{ fontSize: 14 }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Phase 3: Guardrails 경고 */}
        {r.guardrails?.low_confidence_warning && (
          <Alert
            type="warning"
            showIcon
            message="낮은 신뢰도 경고"
            description={r.guardrails.warning_message}
            style={{ marginBottom: 10, borderRadius: '4px 12px 12px 12px', fontSize: 12 }}
          />
        )}
        {r.guardrails?.rows_truncated && (
          <Alert
            type="info"
            showIcon
            message={`결과가 1,000행으로 제한됨 (전체 ${r.guardrails.original_row_count.toLocaleString()}행)`}
            style={{ marginBottom: 8, borderRadius: '4px 12px 12px 12px', fontSize: 12 }}
          />
        )}

        {/* 자연어 설명 */}
        {r.explanation && (
          <div
            style={{
              background: '#fff',
              borderRadius: '4px 18px 18px 18px',
              padding: '12px 16px',
              border: '1px solid #f0f0f0',
              marginBottom: 10,
              fontSize: 14,
              lineHeight: 1.75,
              color: '#262626',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            {r.explanation}
          </div>
        )}

        {/* 결과 테이블 */}
        {r.result.columns.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <ResultTable
              columns={r.result.columns}
              rows={r.result.rows}
              title="조회 결과"
            />
          </div>
        )}

        {/* 메타데이터 태그 */}
        <Space size={4} wrap style={{ marginBottom: 4 }}>
          <Tag style={{ fontSize: 11 }}>
            {r.result.rows.length.toLocaleString()}행
          </Tag>
          <Tag style={{ fontSize: 11 }}>{r.latency.toFixed(1)}s</Tag>
          {r.was_corrected ? (
            <Tag icon={<CheckCircleFilled />} color="orange" style={{ fontSize: 11 }}>
              교정 완료
            </Tag>
          ) : (
            <Tag icon={<ThunderboltFilled />} color="blue" style={{ fontSize: 11 }}>
              즉시 생성
            </Tag>
          )}
          {r.verification && (
            <Tag
              color={r.verification.is_consistent ? 'green' : 'volcano'}
              style={{ fontSize: 11 }}
            >
              의도 일치 {(r.verification.similarity_score * 100).toFixed(0)}%
            </Tag>
          )}
        </Space>

        {/* SQL / 교정 이력 (접을 수 있는 패널) */}
        {collapseItems.length > 0 && (
          <Collapse
            ghost
            size="small"
            items={collapseItems}
            style={{ marginTop: 4 }}
          />
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function QueryPage() {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedDb, setSelectedDb] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: dbData, isLoading: dbLoading } = useDatabases();
  const mutation = useRunQuery();

  // DB 목록 로드 후 첫 번째 DB 자동 선택
  useEffect(() => {
    if (dbData?.databases.length && !selectedDb) {
      setSelectedDb(dbData.databases[0].id);
    }
  }, [dbData, selectedDb]);

  // 새 메시지 추가 시 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const isAnyLoading = entries.some((e) => e.isLoading);

  const handleSubmit = () => {
    if (!inputText.trim() || !selectedDb || isAnyLoading) return;

    const id = crypto.randomUUID();
    const question = inputText.trim();

    // Phase 3: 이전 성공 턴에서 conversation_history 구성 (최근 3턴)
    const history = entries
      .filter((e) => e.result !== null && !e.error)
      .slice(-3)
      .map((e) => ({
        question: e.question,
        sql: e.result!.final_sql,
        explanation: e.result!.explanation,
      }));

    setEntries((prev) => [
      ...prev,
      { id, question, result: null, isLoading: true, error: null },
    ]);
    setInputText('');

    mutation.mutate(
      {
        query: question,
        db_id: selectedDb,
        dataset:
          dbData?.databases.find((d) => d.id === selectedDb)?.dataset || 'hrdb',
        conversation_history: history,
      },
      {
        onSuccess: (data) => {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, result: data, isLoading: false } : e,
            ),
          );
        },
        onError: (err) => {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id
                ? { ...e, error: (err as Error).message, isLoading: false }
                : e,
            ),
          );
        },
      },
    );
  };

  return (
    <div
      style={{
        height: 'calc(100vh - 112px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 10,
        background: '#f7f8fa',
        border: '1px solid #e8e8e8',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* 타이핑 애니메이션 키프레임 */}
      <style>{`
        @keyframes sc-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-7px); }
        }
      `}</style>

      {/* ── 상단 헤더: DB 선택 ── */}
      <div
        style={{
          padding: '10px 18px',
          borderBottom: '1px solid #ebebeb',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <RobotOutlined style={{ color: '#1677ff', fontSize: 16 }} />
        <Typography.Text style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
          자연어 데이터 조회
        </Typography.Text>
        <DatabaseOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
        <Select
          value={selectedDb || undefined}
          onChange={setSelectedDb}
          loading={dbLoading}
          placeholder="데이터베이스 선택"
          style={{ width: 200 }}
          size="small"
          options={dbData?.databases.map((db) => ({
            value: db.id,
            label: `${db.id}  (${db.table_count}개 테이블)`,
          }))}
        />
        {entries.length > 0 && (
          <Tooltip title="대화 초기화">
            <Button
              size="small"
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => setEntries([])}
              style={{ color: '#bfbfbf' }}
            />
          </Tooltip>
        )}
      </div>

      {/* ── 채팅 영역 ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          scrollBehavior: 'smooth',
        }}
      >
        {/* 빈 상태: 예시 질문 */}
        {entries.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 18,
              userSelect: 'none',
            }}
          >
            <RobotOutlined style={{ fontSize: 44, color: '#c8d8f8' }} />
            <Typography.Text
              type="secondary"
              style={{ fontSize: 15, textAlign: 'center' }}
            >
              자연어로 데이터베이스에 질문하세요
            </Typography.Text>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                maxWidth: 520,
              }}
            >
              {EXAMPLE_QUESTIONS.map((q) => (
                <Tag
                  key={q}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 14,
                    padding: '5px 14px',
                    fontSize: 13,
                    border: '1px solid #d6e4ff',
                    background: '#f0f5ff',
                    color: '#1677ff',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setInputText(q)}
                >
                  {q}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {entries.map((entry) => (
          <div key={entry.id}>
            <UserBubble text={entry.question} />
            <AssistantBubble entry={entry} />
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* ── 입력 영역 ── */}
      <div
        style={{
          padding: '12px 18px 14px',
          borderTop: '1px solid #ebebeb',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <QueryInput
          value={inputText}
          onChange={setInputText}
          onSubmit={handleSubmit}
          isLoading={isAnyLoading}
        />
      </div>
    </div>
  );
}
