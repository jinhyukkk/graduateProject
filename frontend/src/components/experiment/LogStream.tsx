import { useRef, useEffect, useState } from 'react';
import { Card, Switch, Typography, Tag } from 'antd';
import type { LogEntry } from '../../types';

interface LogStreamProps {
  logs: LogEntry[];
  maxLines?: number;
  autoScroll?: boolean;
}

const levelColors: Record<string, string> = {
  info: 'blue',
  warn: 'orange',
  error: 'red',
  success: 'green',
};

export default function LogStream({
  logs,
  maxLines = 500,
  autoScroll: defaultAutoScroll = true,
}: LogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(defaultAutoScroll);

  const displayLogs = logs.slice(-maxLines);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayLogs.length, autoScroll]);

  return (
    <Card
      size="small"
      title="Log"
      extra={
        <span>
          <Typography.Text type="secondary" style={{ marginRight: 8, fontSize: 12 }}>
            Auto-scroll
          </Typography.Text>
          <Switch
            size="small"
            checked={autoScroll}
            onChange={setAutoScroll}
          />
        </span>
      }
    >
      <div
        ref={containerRef}
        style={{
          height: 300,
          overflow: 'auto',
          background: '#1e1e1e',
          borderRadius: 6,
          padding: '8px 12px',
          fontFamily: "'Fira Code', 'Consolas', monospace",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {displayLogs.length === 0 && (
          <Typography.Text style={{ color: '#666' }}>
            Waiting for log output...
          </Typography.Text>
        )}
        {displayLogs.map((entry, i) => (
          <div key={i} style={{ whiteSpace: 'pre-wrap' }}>
            <span style={{ color: '#888' }}>
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>{' '}
            <Tag
              color={levelColors[entry.level] || 'default'}
              style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}
            >
              {entry.level.toUpperCase()}
            </Tag>{' '}
            <span
              style={{
                color:
                  entry.level === 'error'
                    ? '#ff6b6b'
                    : entry.level === 'warn'
                      ? '#ffc107'
                      : '#d4d4d4',
              }}
            >
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
