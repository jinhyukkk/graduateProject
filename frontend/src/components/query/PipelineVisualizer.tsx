import { Typography } from 'antd';
import {
  DatabaseOutlined,
  CodeOutlined,
  PlayCircleOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

interface PipelineVisualizerProps {
  currentStep: number; // 0=idle, 1=schema, 2=sql, 3=validate, 4=verify, 5=done
  isLoading: boolean;
}

const STEPS = [
  { label: 'Schema Link',  sub: '관련 테이블 탐색',    icon: DatabaseOutlined },
  { label: 'SQL 생성',     sub: 'Few-shot 프롬프팅',   icon: CodeOutlined },
  { label: '실행 검증',    sub: 'SQL 실행 오류 확인',   icon: PlayCircleOutlined },
  { label: '의미 검증',    sub: 'NLI 의도 일치 판정',   icon: BranchesOutlined },
  { label: '완료',         sub: '결과 반환',            icon: CheckCircleOutlined },
];

export default function PipelineVisualizer({ currentStep, isLoading }: PipelineVisualizerProps) {
  if (currentStep === 0 && !isLoading) return null;

  // currentStep: 1=running step1 ... 5=running step5, >5 or !isLoading = all done
  const activeIndex = isLoading ? currentStep - 1 : STEPS.length;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 14,
        border: '1px solid #f0f0f0',
      }}
    >
      <Typography.Text
        type="secondary"
        style={{ fontSize: 11, display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}
      >
        파이프라인
      </Typography.Text>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isActive = idx === activeIndex;
          const isPending = idx > activeIndex;

          const Icon = isActive ? LoadingOutlined : step.icon;
          const iconColor = isDone
            ? '#52c41a'
            : isActive
            ? '#1677ff'
            : '#d9d9d9';

          const lineColor = isDone ? '#52c41a' : '#f0f0f0';

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* 아이콘 + 연결선 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: isDone ? '#f6ffed' : isActive ? '#e6f4ff' : '#fafafa',
                    border: `1px solid ${iconColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    style={{ fontSize: 10, color: iconColor }}
                    spin={isActive}
                  />
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{ width: 1, height: 22, background: lineColor, marginTop: 2 }} />
                )}
              </div>

              {/* 텍스트 */}
              <div style={{ paddingBottom: idx < STEPS.length - 1 ? 8 : 0, paddingTop: 1 }}>
                <Typography.Text
                  style={{
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    color: isPending ? '#bfbfbf' : isDone ? '#262626' : '#1677ff',
                    display: 'block',
                    lineHeight: 1.4,
                  }}
                >
                  {step.label}
                </Typography.Text>
                <Typography.Text
                  style={{ fontSize: 11, color: isPending ? '#d9d9d9' : '#8c8c8c', lineHeight: 1.4 }}
                >
                  {step.sub}
                </Typography.Text>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
