# Backend API Implementation Summary

구현 완료된 FastAPI 백엔드 엔드포인트 목록 및 실제 응답 shape.

Base URL: `http://localhost:8000`

---

## 구현 파일 구조

```
backend/
├── __init__.py
├── main.py                  # FastAPI 앱 진입점, CORS 설정
├── requirements.txt         # fastapi, uvicorn, pydantic, pyyaml, websockets
├── routers/
│   ├── __init__.py
│   ├── config.py            # GET /api/health, GET /api/config
│   ├── query.py             # GET /api/databases, POST /api/query
│   └── experiment.py        # experiments CRUD + WebSocket
├── schemas/
│   ├── __init__.py
│   ├── config.py            # HealthResponse, ConfigResponse
│   ├── query.py             # QueryRequest, QueryResponse, DatabaseListResponse
│   └── experiment.py        # ExperimentCreate*, ExperimentDetail*, Results*
└── services/
    ├── __init__.py
    └── tsql_service.py      # src/ 모듈 래핑 서비스 레이어
```

---

## 실행 방법

```bash
# 프로젝트 루트에서
uvicorn backend.main:app --reload --port 8000

# 또는 backend/ 디렉토리에서
cd backend
uvicorn main:app --reload --port 8000
```

---

## 엔드포인트 목록 (10개)

| # | Method | Path | Status | 설명 |
|---|--------|------|--------|------|
| 1 | GET | `/api/health` | 200 | 서버 상태 확인 |
| 2 | GET | `/api/config` | 200 | 시스템 설정 조회 (config.yaml 기반) |
| 3 | GET | `/api/databases` | 200 | SQLite DB 목록 (spider + bird 자동 스캔) |
| 4 | POST | `/api/query` | 200 | SC-TSQL 파이프라인 단건 실행 |
| 5 | POST | `/api/experiments` | 201 | 실험 생성 + 백그라운드 실행 |
| 6 | GET | `/api/experiments` | 200 | 실험 목록 (필터/페이지네이션) |
| 7 | GET | `/api/experiments/{id}` | 200 | 실험 상세 (메트릭 + 교정 진행 + 에러 분포) |
| 8 | GET | `/api/experiments/{id}/results` | 200 | 샘플별 결과 (필터/정렬/페이지네이션) |
| 9 | GET | `/api/experiments/{id}/results/{qid}` | 200 | 개별 쿼리 상세 |
| 10 | WS | `/ws/experiments/{id}/progress` | - | 실험 진행 실시간 스트리밍 |

---

## 검증 결과

- `/api/health` -> `{"status":"ok","version":"1.0.0","timestamp":"..."}`
- `/api/config` -> LLM/correction 설정 + available_models + available_datasets 반환 확인
- `/api/databases` -> BIRD dev_databases 11개 DB 자동 스캔 확인 (Spider DB 파일 부재 시 BIRD만 반환)
- `/api/experiments` -> 빈 목록 정상 반환 `{"experiments":[],"total":0}`

---

## CORS 설정

- Origins: `http://localhost:5173`, `http://127.0.0.1:5173`
- Methods: GET, POST, PUT, OPTIONS
- Headers: Content-Type
- Credentials: allowed

---

## src/ 모듈 연동

- `src.sc_tsql.SCTSQL` -> `POST /api/query` (단건 파이프라인 실행)
- `src.metrics.*` -> 실험 완료 시 EX, CSR, Avg Latency 계산
- `evaluate.load_spider_dev`, `evaluate.load_bird_dev` -> 실험 데이터 로드
- `evaluate.get_db_path`, `evaluate.execute_gold_sql` -> 골드 SQL 실행 비교
- src/ import 실패 시 `SRC_AVAILABLE=False` 플래그로 graceful degradation

---

## WebSocket 프로토콜

연결: `ws://localhost:8000/ws/experiments/{id}/progress`

메시지 타입:
- `progress` - 현재 진행 상황 (current/total + current_item)
- `log` - 로그 엔트리 (timestamp, level, message)
- `completed` - 실험 완료 (metrics 포함)
- `error` - 실험 실패
- `ping` - keep-alive (30초마다)

완료된 실험에 연결 시 즉시 `completed` 메시지 전송 후 종료.
