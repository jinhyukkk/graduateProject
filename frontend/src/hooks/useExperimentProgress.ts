import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  WsMessage,
  LogEntry,
  ExperimentMetrics,
} from '../types';

export interface ExperimentProgressState {
  current: number;
  total: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  logs: LogEntry[];
  metrics: ExperimentMetrics | null;
  errorMessage: string | null;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;
const MAX_LOGS = 500;

export function useExperimentProgress(experimentId: string | null) {
  const [state, setState] = useState<ExperimentProgressState>({
    current: 0,
    total: 0,
    status: 'idle',
    logs: [],
    metrics: null,
    errorMessage: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!experimentId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/experiments/${experimentId}/progress`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setState((prev) => ({ ...prev, status: 'running', errorMessage: null }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as WsMessage;

      switch (data.type) {
        case 'progress':
          setState((prev) => ({
            ...prev,
            current: data.current,
            total: data.total,
            status: 'running',
          }));
          break;

        case 'log':
          setState((prev) => ({
            ...prev,
            logs: [...prev.logs.slice(-(MAX_LOGS - 1)), data.entry],
          }));
          break;

        case 'completed':
          setState((prev) => ({
            ...prev,
            status: 'completed',
            metrics: data.metrics,
          }));
          break;

        case 'error':
          setState((prev) => ({
            ...prev,
            status: 'failed',
            errorMessage: data.message,
          }));
          break;
      }
    };

    ws.onclose = () => {
      if (
        reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS &&
        state.status === 'running'
      ) {
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [experimentId, state.status]);

  useEffect(() => {
    if (!experimentId) {
      setState({
        current: 0,
        total: 0,
        status: 'idle',
        logs: [],
        metrics: null,
        errorMessage: null,
      });
      return;
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [experimentId, connect]);

  const reset = useCallback(() => {
    setState({
      current: 0,
      total: 0,
      status: 'idle',
      logs: [],
      metrics: null,
      errorMessage: null,
    });
  }, []);

  return { ...state, reset };
}
