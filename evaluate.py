"""
메인 평가 스크립트.
HR-DB / BIRD dev set에 대해 SC-TSQL 파이프라인을 실행하고
EX, CSR, Avg Latency를 출력한다.
"""

import argparse
import json
import os
import sqlite3
import time
from datetime import datetime

import yaml

from src.sc_tsql import SCTSQL
from src.execution_validator import ExecutionValidator
from src.metrics import execution_accuracy, correction_success_rate, average_latency


def load_hrdb_dev(dev_path: str) -> list[dict]:
    """
    HR-DB dev set을 로드한다.
    각 항목: {"question": str, "SQL": str, "db_id": "hrdb", "difficulty": str}
    """
    with open(dev_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    examples = []
    for item in data:
        examples.append({
            "question": item["question"],
            "gold_sql": item.get("SQL", item.get("query", "")),
            "db_id": item.get("db_id", "hrdb"),
            "difficulty": item.get("difficulty", ""),
        })
    return examples


def load_bird_dev(dev_path: str) -> list[dict]:
    """
    BIRD dev set을 로드한다.
    각 항목: {"question": str, "SQL": str, "db_id": str}
    """
    with open(dev_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    examples = []
    for item in data:
        examples.append({
            "question": item["question"],
            "gold_sql": item.get("SQL", item.get("query", "")),
            "db_id": item["db_id"],
        })
    return examples


def get_db_path(dataset: str, db_id: str, config: dict) -> str:
    """데이터셋과 db_id로 SQLite DB 파일 경로를 반환한다."""
    if dataset == "hrdb":
        return config["evaluation"]["hrdb_db_path"]
    elif dataset == "bird":
        base_dir = os.path.dirname(config["evaluation"]["bird_dev_path"])
        return os.path.join(base_dir, "databases", db_id, f"{db_id}.sqlite")
    else:
        raise ValueError(f"Unknown dataset: {dataset}")


def execute_gold_sql(sql: str, db_path: str) -> list[tuple]:
    """정답 SQL을 실행하여 결과를 반환한다."""
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=5.0)
        cursor = conn.cursor()
        cursor.execute(sql)
        results = cursor.fetchall()
        conn.close()
        return results
    except Exception:
        return []


def load_few_shot_examples(dataset: str, config: dict) -> list[dict]:
    """
    Few-shot 후보를 학습 데이터에서 로드한다.
    HR-DB: dev set 자체를 활용 (leave-one-out), BIRD: train set.
    """
    if dataset == "hrdb":
        # HR-DB는 별도 train set이 없으므로 dev set을 few-shot 후보로 사용
        train_path = config["evaluation"]["hrdb_dev_path"]
    elif dataset == "bird":
        train_path = os.path.join(
            os.path.dirname(config["evaluation"]["bird_dev_path"]),
            "train.json",
        )
    else:
        return []

    if not os.path.exists(train_path):
        print(f"[WARN] Few-shot train file not found: {train_path}. Proceeding without few-shot examples.")
        return []

    with open(train_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    examples = []
    for item in data:
        examples.append({
            "query": item.get("question", ""),
            "sql": item.get("query", item.get("SQL", "")),
            "schema": "",  # 스키마는 동적으로 로드됨
            "db_id": item.get("db_id", ""),
        })
    return examples


def run_evaluation(config: dict, dataset: str):
    """전체 평가를 실행한다."""
    print(f"=== SC-TSQL Evaluation on {dataset.upper()} ===")
    print(f"Config: max_rounds={config['correction']['max_rounds']}, "
          f"semantic_threshold={config['correction']['semantic_threshold']}")
    print()

    # 데이터 로드
    if dataset == "hrdb":
        examples = load_hrdb_dev(config["evaluation"]["hrdb_dev_path"])
    elif dataset == "bird":
        examples = load_bird_dev(config["evaluation"]["bird_dev_path"])
    else:
        raise ValueError(f"Unknown dataset: {dataset}")

    print(f"Loaded {len(examples)} examples from {dataset}")

    # Few-shot 후보 로드
    few_shot_examples = load_few_shot_examples(dataset, config)
    print(f"Loaded {len(few_shot_examples)} few-shot candidates")
    print()

    # 평가 변수
    pred_results_list = []
    gold_results_list = []
    correction_logs = []
    latency_logs = []
    detailed_results = []

    # DB별로 파이프라인 캐시 (동일 DB는 재사용)
    pipeline_cache = {}
    validator = ExecutionValidator()

    for i, example in enumerate(examples):
        db_id = example["db_id"]
        question = example["question"]
        gold_sql = example["gold_sql"]
        db_path = get_db_path(dataset, db_id, config)

        if not os.path.exists(db_path):
            print(f"[{i+1}/{len(examples)}] SKIP - DB not found: {db_path}")
            continue

        # 파이프라인 초기화 (DB별 캐시)
        if db_id not in pipeline_cache:
            try:
                pipeline_cache[db_id] = SCTSQL(db_path, config, few_shot_examples)
            except Exception as e:
                print(f"[{i+1}/{len(examples)}] SKIP - Pipeline init error for {db_id}: {e}")
                continue

        pipeline = pipeline_cache[db_id]

        # SC-TSQL 실행
        try:
            result = pipeline.run(question)
        except Exception as e:
            print(f"[{i+1}/{len(examples)}] ERROR - {db_id}: {e}")
            pred_results_list.append([])
            gold_results_list.append(execute_gold_sql(gold_sql, db_path))
            latency_logs.append(0.0)
            correction_logs.append({"had_error": True, "corrected_successfully": False})
            continue

        # 정답 SQL 실행
        gold_results = execute_gold_sql(gold_sql, db_path)

        # 결과 수집
        pred_results_list.append(result.results)
        gold_results_list.append(gold_results)
        latency_logs.append(result.latency)

        # 교정 로그
        had_error = result.total_correction_rounds > 0
        pred_set = set(result.results) if result.results else set()
        gold_set = set(gold_results) if gold_results else set()
        corrected_successfully = had_error and (pred_set == gold_set)

        correction_logs.append({
            "had_error": had_error,
            "corrected_successfully": corrected_successfully,
        })

        # 상세 결과 기록
        detailed_results.append({
            "index": i,
            "db_id": db_id,
            "question": question,
            "gold_sql": gold_sql,
            "predicted_sql": result.final_sql,
            "correct": pred_set == gold_set,
            "latency": result.latency,
            "correction_rounds": result.total_correction_rounds,
            "correction_history": result.correction_history,
        })

        # 진행 상황 출력
        status = "OK" if pred_set == gold_set else "FAIL"
        rounds_info = f" (corrected x{result.total_correction_rounds})" if had_error else ""
        print(f"[{i+1}/{len(examples)}] {status} - {db_id}: {question[:60]}...{rounds_info} ({result.latency:.1f}s)")

    # 메트릭 계산
    print()
    print("=" * 60)
    print(f"Results for {dataset.upper()}")
    print("=" * 60)

    ex = execution_accuracy(pred_results_list, gold_results_list)
    csr = correction_success_rate(correction_logs)
    avg_lat = average_latency(latency_logs)

    print(f"EX  (Execution Accuracy):      {ex:.4f} ({ex*100:.1f}%)")
    print(f"CSR (Correction Success Rate): {csr:.4f} ({csr*100:.1f}%)")
    print(f"Avg Latency:                   {avg_lat:.2f}s")
    print(f"Total examples evaluated:      {len(pred_results_list)}")
    print()

    # 결과 저장
    os.makedirs(config["output"]["results_dir"], exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(
        config["output"]["results_dir"],
        f"results_{dataset}_{timestamp}.json",
    )

    output_data = {
        "dataset": dataset,
        "timestamp": timestamp,
        "config": {
            "llm_model": config["llm"]["model"],
            "max_rounds": config["correction"]["max_rounds"],
            "semantic_threshold": config["correction"]["semantic_threshold"],
        },
        "metrics": {
            "execution_accuracy": ex,
            "correction_success_rate": csr,
            "average_latency": avg_lat,
            "total_evaluated": len(pred_results_list),
        },
        "detailed_results": detailed_results,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"Results saved to: {output_path}")
    return output_data


def main():
    parser = argparse.ArgumentParser(description="SC-TSQL Evaluation Script")
    parser.add_argument(
        "--config",
        type=str,
        default="configs/config.yaml",
        help="Path to config YAML file",
    )
    parser.add_argument(
        "--dataset",
        type=str,
        choices=["hrdb", "bird"],
        default="hrdb",
        help="Dataset to evaluate on (hrdb or bird)",
    )
    args = parser.parse_args()

    with open(args.config, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    run_evaluation(config, args.dataset)


if __name__ == "__main__":
    main()
