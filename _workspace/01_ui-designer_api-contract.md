# SC-TSQL Dashboard API Contract

프론트엔드와 백엔드 간 공유 API 계약서.
Base URL: `http://localhost:8000`

---

## 1. Query Interface

### GET /api/databases

사용 가능한 데이터베이스 목록을 반환한다.

**Response 200:**
```json
{
  "databases": [
    {
      "id": "concert_singer",
      "dataset": "spider",
      "table_count": 4,
      "path": "data/raw/spider/database/concert_singer/concert_singer.sqlite"
    }
  ]
}
```

**Response 500:**
```json
{ "detail": "Failed to scan database directories" }
```

---

### POST /api/query

자연어 질의를 받아 SC-TSQL 파이프라인을 실행하고 결과를 반환한다.

**Request:**
```json
{
  "query": "How many singers are there?",
  "db_id": "concert_singer",
  "dataset": "spider"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `query` | string | Y | 자연어 질의 |
| `db_id` | string | Y | 데이터베이스 ID |
| `dataset` | string | N | "spider" \| "bird", 기본 "spider" |

**Response 200:**
```json
{
  "id": "q_20260402_143201_abc123",
  "query": "How many singers are there?",
  "db_id": "concert_singer",
  "original_sql": "SELECT COUNT(*) FROM singer",
  "final_sql": "SELECT COUNT(*) FROM singer",
  "was_corrected": false,
  "correction_steps": [],
  "schema_context": {
    "tables": [
      {
        "name": "singer",
        "columns": [
          { "name": "singer_id", "type": "INTEGER", "is_primary_key": true },
          { "name": "name", "type": "TEXT", "is_primary_key": false }
        ]
      }
    ],
    "foreign_keys": []
  },
  "result": {
    "columns": ["COUNT(*)"],
    "rows": [{ "COUNT(*)": 6 }]
  },
  "explanation": "There are 6 singers in the database.",
  "latency": 2.34,
  "validation": {
    "success": true,
    "error_type": null,
    "error_message": null,
    "is_empty": false,
    "is_excessive": false,
    "row_count": 1
  },
  "verification": {
    "back_translation": "How many singers exist in the singer table?",
    "similarity_score": 0.94,
    "is_consistent": true,
    "mismatch_diagnosis": null
  }
}
```

**CorrectionStep 구조** (교정이 발생한 경우):
```json
{
  "round": 1,
  "error_type": "E3_NO_SUCH_COLUMN",
  "original_sql": "SELECT COUNT(*) FROM singers",
  "corrected_sql": "SELECT COUNT(*) FROM singer",
  "validation_success": false,
  "semantic_score": 0.0
}
```

**Response 422:**
```json
{ "detail": "query field is required" }
```

**Response 500:**
```json
{ "detail": "Pipeline execution failed: <error message>" }
```

---

## 2. Experiment Management

### POST /api/experiments

새 실험을 생성하고 백그라운드에서 평가를 실행한다.

**Request:**
```json
{
  "dataset": "spider",
  "model": "gpt-4o-2024-11-20",
  "max_rounds": 3,
  "semantic_threshold": 0.75,
  "sample_count": null
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `dataset` | string | Y | "spider" \| "bird" |
| `model` | string | N | LLM 모델명, 기본 config.yaml의 llm.model |
| `max_rounds` | integer | N | 교정 최대 횟수 (1~5), 기본 3 |
| `semantic_threshold` | float | N | 의미 검증 임계값 (0.0~1.0), 기본 0.75 |
| `sample_count` | integer \| null | N | 평가할 샘플 수, null = 전체 |

**Response 201:**
```json
{
  "id": "exp_20260402_143500",
  "status": "running",
  "dataset": "spider",
  "config": {
    "dataset": "spider",
    "model": "gpt-4o-2024-11-20",
    "max_rounds": 3,
    "semantic_threshold": 0.75,
    "sample_count": null
  },
  "created_at": "2026-04-02T14:35:00Z",
  "total_samples": 1034
}
```

**Response 409:**
```json
{ "detail": "An experiment is already running" }
```

**Response 422:**
```json
{ "detail": "Invalid dataset. Must be 'spider' or 'bird'" }
```

---

### GET /api/experiments

실험 목록을 반환한다.

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `status` | string | N | "running" \| "completed" \| "failed" 필터 |
| `limit` | integer | N | 반환할 최대 수, 기본 20 |
| `offset` | integer | N | 페이지네이션 오프셋, 기본 0 |

**Response 200:**
```json
{
  "experiments": [
    {
      "id": "exp_20260402_143500",
      "dataset": "spider",
      "status": "completed",
      "config": {
        "dataset": "spider",
        "model": "gpt-4o-2024-11-20",
        "max_rounds": 3,
        "semantic_threshold": 0.75,
        "sample_count": null
      },
      "created_at": "2026-04-02T14:35:00Z",
      "metrics": {
        "execution_accuracy": 0.784,
        "correction_success_rate": 0.621,
        "average_latency": 2.8,
        "total_evaluated": 1034
      }
    }
  ],
  "total": 5
}
```

---

### GET /api/experiments/{experiment_id}

특정 실험의 상세 정보를 반환한다.

**Response 200:**
```json
{
  "id": "exp_20260402_143500",
  "dataset": "spider",
  "status": "completed",
  "config": {
    "dataset": "spider",
    "model": "gpt-4o-2024-11-20",
    "max_rounds": 3,
    "semantic_threshold": 0.75,
    "sample_count": null
  },
  "created_at": "2026-04-02T14:35:00Z",
  "metrics": {
    "execution_accuracy": 0.784,
    "correction_success_rate": 0.621,
    "average_latency": 2.8,
    "total_evaluated": 1034
  },
  "correction_progress": [
    { "round": 0, "cumulative_accuracy": 0.652, "newly_corrected": 0 },
    { "round": 1, "cumulative_accuracy": 0.741, "newly_corrected": 92 },
    { "round": 2, "cumulative_accuracy": 0.773, "newly_corrected": 33 },
    { "round": 3, "cumulative_accuracy": 0.784, "newly_corrected": 11 }
  ],
  "error_distribution": [
    { "error_type": "E1_SYNTAX", "count": 23 },
    { "error_type": "E3_NO_SUCH_COLUMN", "count": 18 },
    { "error_type": "E7_EMPTY_RESULT", "count": 12 },
    { "error_type": "SEMANTIC_MISMATCH", "count": 9 },
    { "error_type": "E2_NO_SUCH_TABLE", "count": 5 },
    { "error_type": "E8_EXCESSIVE_RESULT", "count": 3 }
  ]
}
```

**Response 404:**
```json
{ "detail": "Experiment not found" }
```

---

### GET /api/experiments/{experiment_id}/results

실험의 샘플별 상세 결과를 반환한다.

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `filter` | string | N | "all" \| "correct" \| "incorrect" \| "corrected" |
| `sort_by` | string | N | "index" \| "latency" \| "correction_rounds", 기본 "index" |
| `sort_order` | string | N | "asc" \| "desc", 기본 "asc" |
| `page` | integer | N | 페이지 번호, 기본 1 |
| `page_size` | integer | N | 페이지 크기, 기본 50 |

**Response 200:**
```json
{
  "results": [
    {
      "index": 0,
      "db_id": "concert_singer",
      "question": "How many singers are there?",
      "gold_sql": "SELECT COUNT(*) FROM singer",
      "predicted_sql": "SELECT COUNT(*) FROM singer",
      "correct": true,
      "latency": 1.2,
      "correction_rounds": 0,
      "correction_history": []
    },
    {
      "index": 1,
      "db_id": "world_1",
      "question": "What is the population of the largest city?",
      "gold_sql": "SELECT population FROM city ORDER BY population DESC LIMIT 1",
      "predicted_sql": "SELECT MAX(population) FROM city",
      "correct": true,
      "latency": 4.5,
      "correction_rounds": 2,
      "correction_history": [
        {
          "round": 1,
          "error_type": "E7_EMPTY_RESULT",
          "original_sql": "SELECT population FROM city WHERE name = 'largest'",
          "corrected_sql": "SELECT MAX(population) FROM city",
          "validation_success": true,
          "semantic_score": 0.42
        },
        {
          "round": 2,
          "error_type": "SEMANTIC_MISMATCH",
          "original_sql": "SELECT MAX(population) FROM city",
          "corrected_sql": "SELECT population FROM city ORDER BY population DESC LIMIT 1",
          "validation_success": true,
          "semantic_score": 0.68
        }
      ]
    }
  ],
  "total": 1034,
  "page": 1,
  "page_size": 50
}
```

---

### GET /api/experiments/{experiment_id}/results/{query_index}

실험 내 특정 쿼리의 상세 결과를 반환한다.

**Response 200:**
```json
{
  "index": 1,
  "db_id": "world_1",
  "question": "What is the population of the largest city?",
  "gold_sql": "SELECT population FROM city ORDER BY population DESC LIMIT 1",
  "predicted_sql": "SELECT population FROM city ORDER BY population DESC LIMIT 1",
  "correct": true,
  "latency": 4.5,
  "correction_rounds": 2,
  "correction_history": [
    {
      "round": 1,
      "error_type": "E7_EMPTY_RESULT",
      "original_sql": "SELECT population FROM city WHERE name = 'largest'",
      "corrected_sql": "SELECT MAX(population) FROM city",
      "validation_success": true,
      "semantic_score": 0.42
    }
  ],
  "final_validation": {
    "success": true,
    "error_type": null,
    "error_message": null,
    "is_empty": false,
    "is_excessive": false,
    "row_count": 1
  },
  "final_verification": {
    "back_translation": "What is the population of the city with the highest population?",
    "similarity_score": 0.91,
    "is_consistent": true,
    "mismatch_diagnosis": null
  },
  "result": {
    "columns": ["population"],
    "rows": [{ "population": 10500000 }]
  }
}
```

**Response 404:**
```json
{ "detail": "Query result not found" }
```

---

## 3. WebSocket

### WS /ws/experiments/{experiment_id}/progress

실험 실행 중 실시간 진행 상황을 스트리밍한다.

**서버 -> 클라이언트 메시지:**

#### Progress 메시지
```json
{
  "type": "progress",
  "current": 340,
  "total": 1034,
  "status": "running",
  "current_item": {
    "index": 340,
    "db_id": "concert_singer",
    "question": "How many singers...",
    "correct": true,
    "latency": 2.3,
    "correction_rounds": 1
  }
}
```

#### Log 메시지
```json
{
  "type": "log",
  "entry": {
    "timestamp": "2026-04-02T14:35:30Z",
    "level": "info",
    "message": "[340/1034] OK - concert_singer: How many singers... (corrected x1) (2.3s)"
  }
}
```

#### Completed 메시지
```json
{
  "type": "completed",
  "metrics": {
    "execution_accuracy": 0.784,
    "correction_success_rate": 0.621,
    "average_latency": 2.8,
    "total_evaluated": 1034
  }
}
```

#### Error 메시지
```json
{
  "type": "error",
  "message": "Evaluation failed: OpenAI API rate limit exceeded"
}
```

**연결 프로토콜:**
- 클라이언트는 실험 생성 후 즉시 WebSocket 연결
- 서버는 각 쿼리 처리 완료 시 progress + log 메시지 전송
- 실험 완료 시 completed 메시지 전송 후 연결 종료
- 클라이언트 연결 해제 시 실험은 계속 실행됨 (재연결 가능)
- 이미 완료된 실험에 연결 시 즉시 completed 메시지 전송 후 종료

---

## 4. Configuration

### GET /api/config

현재 시스템 설정을 반환한다 (config.yaml 기반).

**Response 200:**
```json
{
  "llm": {
    "model": "gpt-4o-2024-11-20",
    "temperature": 0.0,
    "max_tokens": 1024
  },
  "correction": {
    "max_rounds": 3,
    "semantic_threshold": 0.75
  },
  "available_models": [
    "gpt-4o-2024-11-20",
    "gpt-4o-mini",
    "gpt-4-turbo"
  ],
  "available_datasets": [
    { "id": "spider", "label": "Spider", "dev_count": 1034 },
    { "id": "bird", "label": "BIRD", "dev_count": 1534 }
  ]
}
```

---

## 5. Health Check

### GET /api/health

서버 상태 확인.

**Response 200:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-04-02T14:30:00Z"
}
```

---

## 6. 공통 에러 응답

모든 엔드포인트에서 공통으로 사용하는 에러 형식:

```json
{
  "detail": "Human-readable error message"
}
```

| HTTP 코드 | 용도 |
|---|---|
| 200 | 정상 응답 |
| 201 | 리소스 생성 성공 (POST /api/experiments) |
| 400 | 잘못된 요청 파라미터 |
| 404 | 리소스를 찾을 수 없음 |
| 409 | 충돌 (이미 실행 중인 실험) |
| 422 | 유효성 검증 실패 |
| 500 | 서버 내부 오류 |

---

## 7. CORS 설정

개발 환경 기준:
- Allowed Origins: `http://localhost:5173` (Vite 기본 포트)
- Allowed Methods: GET, POST, OPTIONS
- Allowed Headers: Content-Type
- WebSocket: 동일 오리진 정책 적용

---

## 8. API 엔드포인트 요약

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/health` | 서버 상태 확인 |
| GET | `/api/config` | 시스템 설정 조회 |
| GET | `/api/databases` | DB 목록 조회 |
| POST | `/api/query` | 자연어 질의 실행 |
| POST | `/api/experiments` | 실험 생성 및 실행 |
| GET | `/api/experiments` | 실험 목록 조회 |
| GET | `/api/experiments/{id}` | 실험 상세 조회 |
| GET | `/api/experiments/{id}/results` | 실험 샘플별 결과 조회 |
| GET | `/api/experiments/{id}/results/{qid}` | 개별 쿼리 상세 조회 |
| WS | `/ws/experiments/{id}/progress` | 실험 진행 실시간 스트리밍 |
