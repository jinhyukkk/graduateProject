"""
Router: /api/experiments, /ws/experiments/{id}/progress
"""

import asyncio

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, WebSocket, WebSocketDisconnect

from backend.schemas.experiment import (
    BatchExperimentResponse,
    BatchStatusResponse,
    ExperimentCreateRequest,
    ExperimentCreateResponse,
    ExperimentConfig,
    ExperimentDetailResponse,
    ExperimentListItem,
    ExperimentListResponse,
    ExperimentQueryDetail,
    ExperimentResultItem,
    ExperimentResultsResponse,
    KSweepRequest,
    MetricsSummary,
)
from backend.services.tsql_service import (
    create_experiment,
    create_k_sweep,
    get_batch,
    get_experiment,
    is_experiment_running,
    list_experiments,
    run_experiment,
    run_k_sweep,
)

router = APIRouter(tags=["experiment"])


# ── POST /api/experiments ──

@router.post("/api/experiments", response_model=ExperimentCreateResponse, status_code=201)
async def create_new_experiment(req: ExperimentCreateRequest, background_tasks: BackgroundTasks):
    """Create a new experiment and start evaluation in the background."""
    if req.dataset not in ("hrdb", "bird"):
        raise HTTPException(status_code=422, detail="Invalid dataset. Must be 'hrdb' or 'bird'")

    if is_experiment_running():
        raise HTTPException(status_code=409, detail="An experiment is already running")

    try:
        exp = create_experiment(
            dataset=req.dataset,
            model=req.model,
            max_rounds=req.max_rounds,
            semantic_threshold=req.semantic_threshold,
            sample_count=req.sample_count,
            pipeline_mode=req.pipeline_mode,
            ablation=req.ablation.model_dump() if req.ablation else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    # Start background evaluation
    # We use asyncio.create_task instead of BackgroundTasks because
    # run_experiment is async and needs the event loop for WebSocket broadcasting.
    asyncio.create_task(run_experiment(exp.id))

    return ExperimentCreateResponse(
        id=exp.id,
        status=exp.status,
        dataset=exp.dataset,
        config=ExperimentConfig(**exp.config),
        created_at=exp.created_at,
        total_samples=exp.total_samples,
    )


# ── POST /api/experiments/k-sweep ──

@router.post("/api/experiments/k-sweep", response_model=BatchExperimentResponse, status_code=201)
async def create_k_sweep_experiment(req: KSweepRequest):
    """Create a K-sweep batch experiment (runs K=0,1,2,...,5 sequentially)."""
    if req.dataset not in ("hrdb", "bird"):
        raise HTTPException(status_code=422, detail="Invalid dataset. Must be 'hrdb' or 'bird'")

    if is_experiment_running():
        raise HTTPException(status_code=409, detail="An experiment is already running")

    try:
        batch = create_k_sweep(
            dataset=req.dataset,
            model=req.model,
            semantic_threshold=req.semantic_threshold,
            sample_count=req.sample_count,
            k_values=req.k_values,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    asyncio.create_task(run_k_sweep(batch.batch_id))

    return BatchExperimentResponse(
        batch_id=batch.batch_id,
        experiment_ids=batch.experiment_ids,
        k_values=batch.k_values,
        status=batch.status,
    )


# ── GET /api/experiments/batch/{batch_id} ──

@router.get("/api/experiments/batch/{batch_id}", response_model=BatchStatusResponse)
async def get_batch_status(batch_id: str):
    """Return batch (K-sweep) status."""
    batch = get_batch(batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")

    return BatchStatusResponse(
        batch_id=batch.batch_id,
        status=batch.status,
        k_values=batch.k_values,
        experiment_ids=batch.experiment_ids,
        current_k=batch.current_k,
        completed_count=batch.completed_count,
    )


# ── GET /api/experiments ──

@router.get("/api/experiments", response_model=ExperimentListResponse)
async def get_experiments(
    status: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """List experiments with optional filtering and pagination."""
    exps, total = list_experiments(status=status, limit=limit, offset=offset)
    items = []
    for e in exps:
        items.append(ExperimentListItem(
            id=e.id,
            dataset=e.dataset,
            status=e.status,
            config=ExperimentConfig(**e.config),
            created_at=e.created_at,
            metrics=MetricsSummary(**e.metrics) if e.metrics else None,
        ))
    return ExperimentListResponse(experiments=items, total=total)


# ── GET /api/experiments/{experiment_id} ──

@router.get("/api/experiments/{experiment_id}", response_model=ExperimentDetailResponse)
async def get_experiment_detail(experiment_id: str):
    """Return detailed information about a specific experiment."""
    exp = get_experiment(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")

    return ExperimentDetailResponse(
        id=exp.id,
        dataset=exp.dataset,
        status=exp.status,
        config=ExperimentConfig(**exp.config),
        created_at=exp.created_at,
        metrics=MetricsSummary(**exp.metrics) if exp.metrics else None,
        correction_progress=exp.correction_progress,
        error_distribution=exp.error_distribution,
    )


# ── GET /api/experiments/{experiment_id}/results ──

@router.get("/api/experiments/{experiment_id}/results", response_model=ExperimentResultsResponse)
async def get_experiment_results(
    experiment_id: str,
    filter: str = Query(default="all"),
    sort_by: str = Query(default="index"),
    sort_order: str = Query(default="asc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """Return sample-level results for an experiment."""
    exp = get_experiment(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")

    results = list(exp.detailed_results)

    # Filter
    if filter == "correct":
        results = [r for r in results if r.get("correct")]
    elif filter == "incorrect":
        results = [r for r in results if not r.get("correct")]
    elif filter == "corrected":
        results = [r for r in results if r.get("correction_rounds", 0) > 0]

    # Sort
    sort_key = sort_by if sort_by in ("index", "latency", "correction_rounds") else "index"
    reverse = sort_order == "desc"
    results.sort(key=lambda r: r.get(sort_key, 0), reverse=reverse)

    total = len(results)

    # Paginate
    start = (page - 1) * page_size
    end = start + page_size
    page_results = results[start:end]

    items = []
    for r in page_results:
        items.append(ExperimentResultItem(
            index=r["index"],
            db_id=r["db_id"],
            question=r["question"],
            gold_sql=r["gold_sql"],
            predicted_sql=r["predicted_sql"],
            correct=r["correct"],
            latency=r["latency"],
            correction_rounds=r["correction_rounds"],
            correction_history=r.get("correction_history", []),
        ))

    return ExperimentResultsResponse(
        results=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ── GET /api/experiments/{experiment_id}/results/{query_index} ──

@router.get(
    "/api/experiments/{experiment_id}/results/{query_index}",
    response_model=ExperimentQueryDetail,
)
async def get_experiment_query_detail(experiment_id: str, query_index: int):
    """Return detailed result for a specific query within an experiment."""
    exp = get_experiment(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")

    # Find the result by index
    detail = None
    for r in exp.detailed_results:
        if r["index"] == query_index:
            detail = r
            break

    if detail is None:
        raise HTTPException(status_code=404, detail="Query result not found")

    return ExperimentQueryDetail(
        index=detail["index"],
        db_id=detail["db_id"],
        question=detail["question"],
        gold_sql=detail["gold_sql"],
        predicted_sql=detail["predicted_sql"],
        correct=detail["correct"],
        latency=detail["latency"],
        correction_rounds=detail["correction_rounds"],
        correction_history=detail.get("correction_history", []),
        final_validation=detail.get("final_validation"),
        final_verification=detail.get("final_verification"),
        result=detail.get("result"),
    )


# ── WebSocket /ws/experiments/{experiment_id}/progress ──

@router.websocket("/ws/experiments/{experiment_id}/progress")
async def experiment_progress_ws(websocket: WebSocket, experiment_id: str):
    """Stream experiment progress in real-time via WebSocket."""
    await websocket.accept()

    exp = get_experiment(experiment_id)
    if exp is None:
        await websocket.send_json({"type": "error", "message": "Experiment not found"})
        await websocket.close()
        return

    # If already completed, send completed message immediately
    if exp.status == "completed":
        await websocket.send_json({
            "type": "completed",
            "metrics": exp.metrics,
        })
        await websocket.close()
        return

    if exp.status == "failed":
        await websocket.send_json({
            "type": "error",
            "message": f"Experiment failed: {exp.error_message or 'Unknown error'}",
        })
        await websocket.close()
        return

    # Subscribe to updates
    exp.ws_subscribers.append(websocket)

    try:
        # Keep connection open until client disconnects or experiment ends
        while True:
            # Wait for client messages (ping/pong or disconnect)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                # Send a ping to keep the connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
                continue

            # If client sends "close", break
            if data == "close":
                break

    except WebSocketDisconnect:
        pass
    finally:
        if websocket in exp.ws_subscribers:
            exp.ws_subscribers.remove(websocket)
