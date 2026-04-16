---
name: implement-experiment
description: 자기교정 Text-to-SQL 논문의 실험 실행 인프라를 구현한다. DAIL-SQL·MAC-SQL 공식 repo를 최소 침습으로 래핑해 GPT-4o 백본으로 교체, HRDB 스키마 이식 및 합성 row 생성, evaluate.py에 베이스라인·어블레이션 플래그 추가. 베이스라인 구현, BIRD 실험 실행 준비, HRDB 데이터 빌드가 필요할 때 반드시 사용.
---

# Implement Experiment — 실험 인프라 구현 가이드

엔지니어가 SC-TSQL 프로젝트의 실험 실행을 가능하게 만들기 위한 구체적 지침.

## 핵심 원칙

**최소 침습 래핑 (Minimum-Invasive Wrapping)**. 공식 베이스라인 구현을 갈아엎지 말고 LLM 호출부와 I/O 포맷만 바꾼다. 이유: (1) 재현성 — 원본과 diff를 명확히 보여야 리뷰어가 신뢰. (2) 공수 — fork 후 어댑터만 추가하면 1~2일. 직접 구현은 5~7일.

## 작업 순서

### 1. 디렉토리 구조

```
src/
├── baselines/
│   ├── __init__.py
│   ├── base.py              — 공통 인터페이스 (predict(question, schema) -> sql)
│   ├── zeroshot.py          — Zero-shot GPT-4o (직접 구현)
│   ├── dail_sql.py          — DAIL-SQL 래퍼
│   └── mac_sql.py           — MAC-SQL 래퍼
├── datasets/
│   ├── bird_loader.py
│   └── hrdb_builder.py      — 신규: 스키마+합성 row+질의 세트
└── ...
third_party/
├── DAIL-SQL/                — git submodule fork
└── MAC-SQL/                 — git submodule fork
```

### 2. 베이스라인 공통 인터페이스

```python
# src/baselines/base.py
class BaselineModel:
    def predict(self, question: str, schema: dict, db_path: str) -> dict:
        """
        Returns: {
          "sql": str,
          "raw_output": str,
          "cost": {"prompt_tokens": int, "completion_tokens": int},
          "error": str | None
        }
        """
```

### 3. 공식 repo 래핑 규칙

- **Fork → submodule로 추가**: `git submodule add https://github.com/.../DAIL-SQL.git third_party/DAIL-SQL`
- **LLM 호출부 교체만**: 원본의 `openai.ChatCompletion.create(...)` 위치를 찾아 **단일 함수**로 추상화하고, 그 함수만 `gpt-4o-2024-11-20` 호출로 교체. 나머지 프롬프트·파이프라인·self-consistency 로직은 그대로.
- **패치 내역 기록**: `third_party/DAIL-SQL/PATCHES.md`에 어떤 파일의 어떤 함수를 바꿨는지 일지 형식으로 기록. 리뷰어가 원본 대비 차이를 추적 가능하게.
- **결정적 실행**: temperature=0, seed=42 고정 (원본이 다른 값을 쓰면 패치 기록에 명시)

### 4. HRDB 빌더

HRDB는 **실데이터 사용 금지**. 빌더는 3단계:

1. **스키마 이식**: Oracle DDL (사용자가 제공) → SQLite `CREATE TABLE` 변환. 테이블 42개, 컬럼 347개 목표.
2. **합성 row 생성**: 각 테이블에 통계적으로 그럴듯한 합성 row 10~1000행. 개인식별정보(이름, 주민번호, 이메일) 배제. 날짜·코드는 업무 규칙(입사일 ≤ 퇴사일 등) 유지.
3. **질의 큐레이션**: 150 질의 (Easy 45 / Medium 60 / Hard 45). gold SQL을 작성자가 직접 검수. 질의마다 주석으로 난이도·대상 오류 유형(E1~E7·E_intent) 매핑.

Oracle 권한 미확보 시: `[BLOCKED: Oracle access]`로 표시하고 `_workspace/engineer_changelog_{date}.md`에 기록. 다른 작업 계속.

### 5. evaluate.py 확장

플래그 추가:
- `--model {sctsql,dail_sql,mac_sql,zeroshot}`
- `--ablation {none,no_nli,no_backtrans,no_type_routing,k1}`
- `--dataset {bird,hrdb}`
- `--output-dir outputs/logs/`

출력: `outputs/logs/{dataset}/{model}_{ablation}.jsonl` — 한 줄당 한 질의:
```json
{"query_id": "bird_0042", "question": "...", "gold_sql": "...", "pred_sql": "...",
 "exec_result": {"correct": true, "rows": [...]}, "ics": 0.87, "error_type": null,
 "round": 2, "latency_ms": 4321, "tokens": {...}}
```

### 6. 재현성 체크리스트

- [ ] config.yaml에 모든 하이퍼파라미터 명시
- [ ] seed=42, temperature=0 (베이스라인 포함)
- [ ] requirements.txt 핀버전
- [ ] API 호출 실패 시 지수 백오프, 3회 재시도, 그래도 실패면 `error` 필드에 기록
- [ ] SQL 실행은 읽기 전용 SQLite, 5초 타임아웃
- [ ] 결과 JSONL은 append 전용, 부분 실행 이어쓰기 가능

## 에러 대응

| 상황 | 대응 |
|------|------|
| 공식 repo가 최신 OpenAI SDK와 비호환 | 최소 패치만 적용, 패치 파일을 PATCHES.md에 diff로 기록 |
| DAIL-SQL few-shot 로직이 BIRD 외 데이터셋(HRDB)에서 실패 | 질의-예시 유사도 계산을 HRDB에 맞게 재인덱싱하는 별도 함수 추가 |
| MAC-SQL 3에이전트 중 Refiner가 무한루프 | max_refine_rounds=3 하드 캡, 넘으면 마지막 후보 반환 |
| GPT-4o rate limit | tenacity로 exponential backoff, 누적 비용을 `_workspace/cost_log.md`에 기록 |
| HRDB gold SQL 검수 불가 | 외부 검수자 투입 전까지 `dev_auto.json`과 `dev_verified.json` 분리 |

## 기록 의무

구현 변경은 반드시 `_workspace/engineer_changelog_{YYYYMMDD}.md`에 일자별로 기록. 최소 필드: 날짜, 변경 대상 파일, 변경 이유, 테스트 결과.
