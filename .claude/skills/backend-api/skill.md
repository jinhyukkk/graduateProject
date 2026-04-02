---
name: backend-api
description: "FastAPI로 Text-to-SQL 실험 백엔드 API를 구현하는 스킬. 기존 src/ Python 모듈을 REST 엔드포인트로 래핑하고, 실험 실행 및 WebSocket 스트리밍을 구현한다. backend-developer 에이전트가 사용한다."
---

# Backend API — FastAPI 구현

## 구현 시작 전 필독

반드시 읽는다:
- `_workspace/01_ui-designer_api-contract.md` — API 계약서
- `src/sc_tsql.py` — 메인 파이프라인 진입점
- `configs/config.yaml` — 실험 파라미터 구조

## main.py 기본 구조

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import query, experiment, results, config

app = FastAPI(title="Text-to-SQL Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query.router, prefix="/api")
app.include_router(experiment.router, prefix="/api")
app.include_router(results.router, prefix="/api")
app.include_router(config.router, prefix="/api")
```

## Pydantic 모델 작성 원칙

API 계약서의 shape을 Pydantic v2 모델로 정확히 구현한다. Python snake_case를 React 프론트에서 camelCase로 받을 수 있도록 alias_generator를 설정한다:

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class CorrectionStep(BaseSchema):
    step: int
    sql: str
    error: str | None = None
    action: str

class QueryResponse(BaseSchema):
    id: str
    original_sql: str
    corrected_sql: str
    was_corrected: bool
    correction_steps: list[CorrectionStep]
    result: dict  # {"columns": [...], "rows": [...]}
    explanation: str
```

## src/ 모듈 래핑 패턴

src/ 모듈을 수정하지 않고, services/ 레이어에서 래핑한다:

```python
# services/tsql_service.py
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from sc_tsql import SelfCorrectingTextToSQL
from metrics import compute_metrics

class TsqlService:
    def __init__(self, config_path: str):
        self.pipeline = SelfCorrectingTextToSQL(config_path)
    
    def run_query(self, query: str, db_id: str) -> dict:
        result = self.pipeline.run(query, db_id)
        # result 구조를 QueryResponse schema에 맞게 변환
        return {
            "id": str(uuid4()),
            "original_sql": result.get("initial_sql", ""),
            "corrected_sql": result.get("final_sql", ""),
            "was_corrected": result.get("corrected", False),
            "correction_steps": result.get("steps", []),
            "result": result.get("execution_result", {"columns": [], "rows": []}),
            "explanation": result.get("explanation", ""),
        }
```

src/ 모듈의 실제 반환 구조는 직접 읽어서 파악한다. 위 예시는 참고용이다.

## 실험 실행 (BackgroundTasks + WebSocket)

장시간 실행되는 실험은 백그라운드 태스크로 처리한다:

```python
# routers/experiment.py
from fastapi import WebSocket
import asyncio

experiment_progress: dict[str, dict] = {}  # 메모리 내 상태 저장

@router.post("/experiment/run")
async def run_experiment(config: ExperimentConfig, background_tasks: BackgroundTasks):
    exp_id = str(uuid4())
    experiment_progress[exp_id] = {"status": "running", "current": 0, "total": 0}
    background_tasks.add_task(execute_experiment, exp_id, config)
    return {"experiment_id": exp_id}

@router.websocket("/ws/experiment/{experiment_id}")
async def experiment_ws(websocket: WebSocket, experiment_id: str):
    await websocket.accept()
    while True:
        progress = experiment_progress.get(experiment_id, {})
        await websocket.send_json(progress)
        if progress.get("status") in ("completed", "failed"):
            break
        await asyncio.sleep(1)
    await websocket.close()
```

## 설정 관리

config.yaml을 읽어 파라미터를 반환하고 업데이트한다:

```python
# routers/config.py
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent.parent / "configs" / "config.yaml"

@router.get("/config")
def get_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)

@router.put("/config")
def update_config(updates: dict):
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)
    config.update(updates)
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)
    return config
```

## requirements.txt

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
pydantic>=2.0.0
pyyaml>=6.0
python-multipart
```

## 구현 완료 후 기록

`_workspace/02_backend-developer_api-list.md`에 구현된 모든 엔드포인트를 기록한다:
- HTTP method + path
- 실제 request body shape (Pydantic 모델명)
- 실제 response shape (필드명 포함)
- camelCase 변환 여부
