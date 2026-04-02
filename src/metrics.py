"""
평가 메트릭 (Section 5)
EX (Execution Accuracy), CSR (Correction Success Rate), Avg Latency.
"""


def execution_accuracy(pred_results: list, gold_results: list) -> float:
    """
    Section 5: EX (Execution Accuracy) 계산.
    예측 실행 결과와 정답 실행 결과의 일치율.

    Args:
        pred_results: 예측 SQL 실행 결과 리스트 (각 항목은 set of tuples 또는 list of tuples)
        gold_results: 정답 SQL 실행 결과 리스트

    Returns:
        EX 정확도 (0.0 ~ 1.0)
    """
    if not gold_results:
        return 0.0

    correct = 0
    total = len(gold_results)

    for pred, gold in zip(pred_results, gold_results):
        # set 변환으로 순서 무관 비교
        pred_set = set(pred) if pred is not None else set()
        gold_set = set(gold) if gold is not None else set()
        if pred_set == gold_set:
            correct += 1

    return correct / total


def correction_success_rate(correction_logs: list[dict]) -> float:
    """
    Section 5: CSR (Correction Success Rate) 계산.
    초기 오류 쿼리 중 교정에 성공한 비율.

    Args:
        correction_logs: 각 항목은 {"had_error": bool, "corrected_successfully": bool}

    Returns:
        CSR (0.0 ~ 1.0), 오류가 없었으면 0.0 반환
    """
    error_cases = [log for log in correction_logs if log.get("had_error", False)]
    if not error_cases:
        return 0.0

    success_count = sum(
        1 for log in error_cases if log.get("corrected_successfully", False)
    )
    return success_count / len(error_cases)


def average_latency(latency_logs: list[float]) -> float:
    """
    Section 5: 평균 응답 시간 (초).

    Args:
        latency_logs: 각 질의의 소요 시간 (초) 리스트

    Returns:
        평균 소요 시간 (초), 빈 리스트이면 0.0
    """
    if not latency_logs:
        return 0.0
    return sum(latency_logs) / len(latency_logs)
