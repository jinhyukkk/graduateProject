"""
평가 메트릭 (Section 5)
EX (Execution Accuracy), CSR (Correction Success Rate), Avg Latency,
Intent-Match Score (RQ1: NLI 기반 의미 일치 점수).
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


def intent_match_score(
    intent_logs: list[dict],
    threshold: float = 0.75,
) -> dict:
    """
    RQ1: 의도 일치 점수 — NLI 기반 의미 일치 점수의 집계 지표.

    초록이 주장하는 "의도 일치 점수"를 평가 시점에 집계한다. 자연어 질의와
    생성된 SQL의 역번역 사이의 NLI 유사도(0~1)를 항목별로 받아
    (1) 평균 점수, (2) 임계값 통과율(consistency rate)을 반환한다.

    Args:
        intent_logs: 각 항목은 {"score": float, "is_consistent": bool}.
            semantic_verifier.VerificationResult에서 수집한 값을 그대로 넣는다.
            의미 검증이 수행되지 않은 항목은 호출 측에서 제외해 전달할 것.
        threshold: 참고용 임계값(θ). 기본 0.75.

    Returns:
        {
            "mean_score": float,        # 평균 NLI 점수
            "consistency_rate": float,  # score >= threshold 비율
            "n": int,                   # 집계된 항목 수
            "threshold": float,
        }
    """
    if not intent_logs:
        return {
            "mean_score": 0.0,
            "consistency_rate": 0.0,
            "n": 0,
            "threshold": threshold,
        }

    scores = [float(log.get("score", 0.0)) for log in intent_logs]
    consistent = sum(1 for log in intent_logs if log.get("is_consistent", False))
    n = len(intent_logs)

    return {
        "mean_score": sum(scores) / n,
        "consistency_rate": consistent / n,
        "n": n,
        "threshold": threshold,
    }


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
