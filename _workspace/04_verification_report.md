# SC-TSQL 코드 동작 검증 보고서

**작성일**: 2026-04-01
**검증 결과**: **PASS**

---

## 1. 검증 요약

SC-TSQL 파이프라인의 모든 소스 파일에 대해 문법 검사, Import 검사, 기능 단위 테스트, config 로드 검사, 코드 품질 검토를 수행하였다. 모든 항목이 통과하였으며 실행을 차단하는 버그는 발견되지 않았다.

---

## 2. 체크리스트 결과

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | Python 문법 검사 (`py_compile`) | PASS | 9개 파일 전체 통과 |
| 2 | 모듈 Import 검사 | PASS | 초기 faiss-cpu, sentence-transformers 미설치 → 설치 후 통과 |
| 3 | SQLite 샌드박스 실행 | PASS | 인메모리 DB 생성/삽입/조회 정상 |
| 4 | config.yaml 로드 | PASS | K=3, θ=0.75, LLM=gpt-4o-2024-11-20 확인 |
| 5 | ExecutionValidator 기능 테스트 | PASS | 정상 SQL, 오류 SQL(E2), 빈 결과(E7) 모두 정상 분류 |
| 6 | 메트릭 단위 테스트 (EX, CSR, Latency) | PASS | 기대값과 일치 |
| 7 | 논문 섹션 번호 주석 | PASS | 모든 모듈에 Section 4.x 주석 존재 |
| 8 | 하이퍼파라미터 config 로드 | PASS | 하드코딩 없음, 모두 config dict에서 로드 |
| 9 | OpenAI API 키 환경변수 로드 | PASS | `os.environ["OPENAI_API_KEY"]` 사용 |
| 10 | 5단계 파이프라인 구조 | PASS | SchemaLinker → SQLGenerator → Self-Correction Loop → ResultExplainer |
| 11 | 교정 루프 최대 K회 반복 | PASS | `range(1, self.max_rounds + 1)` 구조 확인 |

---

## 3. 코드 품질 검토 상세

### 3.1 논문 섹션 번호 주석

| 모듈 | 파일 | 섹션 주석 |
|------|------|-----------|
| SchemaLinker | `src/schema_linker.py` | Section 4.2 (docstring, build_index, link, _retrieve_candidates) |
| SQLGenerator | `src/sql_generator.py` | Section 4.3 (docstring, _select_few_shot, generate) |
| ExecutionValidator | `src/execution_validator.py` | Section 4.4.1 (docstring, validate, _classify_error, ERROR_PATTERNS) |
| SemanticVerifier | `src/semantic_verifier.py` | Section 4.4.2 (docstring, _back_translate, _compute_nli_score, verify) |
| Corrector | `src/corrector.py` | Section 4.4.3 (docstring, correct) |
| ResultExplainer | `src/result_explainer.py` | Section 4.5 (docstring, explain) |
| SCTSQL | `src/sc_tsql.py` | Section 4 전체 (docstring, run 메서드 내 각 단계) |
| Metrics | `src/metrics.py` | Section 5 (각 메트릭 함수) |

### 3.2 하이퍼파라미터 외부화

- `max_rounds` (K=3): `config["correction"]["max_rounds"]`에서 로드
- `semantic_threshold` (θ=0.75): `config["correction"]["semantic_threshold"]`에서 로드
- `top_k_tables`, `top_k_columns`: `config["schema_linker"]`에서 로드
- `few_shot_k`: `config["sql_generator"]["few_shot_k"]`에서 로드
- LLM model, temperature, max_tokens: `config["llm"]`에서 로드
- NLI model: `config["nli"]["model"]`에서 로드

### 3.3 파이프라인 구조 (sc_tsql.py)

```
Step 1: SchemaLinker.link(query)           — Section 4.2
Step 2: SQLGenerator.generate(query, ctx)  — Section 4.3
Step 3: Self-Correction Loop (최대 K회)     — Section 4.4
  3a: ExecutionValidator.validate()         — Section 4.4.1
  3b: SemanticVerifier.verify()             — Section 4.4.2
  3c: Corrector.correct() (오류 시)          — Section 4.4.3
Step 4: ResultExplainer.explain()           — Section 4.5
```

교정 루프는 `for round_num in range(1, self.max_rounds + 1)` 구조로, 교정이 불필요하면 `break`으로 조기 종료한다. `_needs_correction()` 메서드가 실행 실패/빈 결과/과대 결과/의미 불일치 4가지 조건을 검사한다.

### 3.4 보안 관행

- OpenAI API 키: `os.environ["OPENAI_API_KEY"]`에서 로드 (하드코딩 없음)
- SQLite 읽기 전용 연결: `file:{db_path}?mode=ro` URI + `PRAGMA query_only = ON`
- 실행 timeout: 5초

---

## 4. 발견된 문제 및 조치

| # | 문제 | 심각도 | 조치 |
|---|------|--------|------|
| 1 | `faiss-cpu` 패키지 미설치 | 중 | `pip install faiss-cpu==1.8.0` 으로 해결 |
| 2 | `sentence-transformers` 패키지 미설치 | 중 | `pip install sentence-transformers==3.1.1` 으로 해결 |
| 3 | NumPy 2.x와 faiss-cpu 1.8.0 비호환 | 중 | `pip install "numpy<2"` → numpy 1.26.4로 다운그레이드하여 해결 |

위 문제들은 모두 환경 설정 관련이며, 코드 자체의 버그는 발견되지 않았다.

---

## 5. 실행 방법

### 환경 설정

```bash
# 1. conda 환경 활성화 (setup_env.sh로 사전 구성됨)
conda activate sc_tsql_env

# 2. 프로젝트 디렉토리 이동
cd /Users/jinhyukpark/Documents/국민대학원/졸업프로젝트2

# 3. (최초 1회) 의존성 설치 — setup_env.sh가 미실행된 경우
pip install -r requirements.txt

# 4. OpenAI API 키 설정
export OPENAI_API_KEY="sk-..."
```

### 평가 실행

```bash
# Spider dev set 평가
python evaluate.py --config configs/config.yaml --dataset spider

# BIRD dev set 평가
python evaluate.py --config configs/config.yaml --dataset bird
```

---

## 6. 주의사항

1. **OpenAI API 키 필수**: `OPENAI_API_KEY` 환경변수가 설정되지 않으면 모든 LLM/임베딩 호출이 실패한다.
2. **데이터셋 수동 다운로드 필요**: Spider/BIRD dev set은 `data/raw/spider/dev.json`, `data/raw/bird/dev.json` 경로에 수동으로 배치해야 한다. 해당 데이터셋의 SQLite DB 파일도 함께 필요하다.
3. **NLI 모델 최초 다운로드**: `cross-encoder/nli-deberta-v3-base` 모델이 최초 실행 시 HuggingFace Hub에서 다운로드된다 (약 900MB).
4. **API 비용**: GPT-4o + text-embedding-3-large API 호출 비용이 발생한다. Spider dev set (1,034건) 전체 평가 시 상당한 비용이 예상된다.
5. **NumPy 버전**: faiss-cpu 1.8.0은 NumPy 2.x와 호환되지 않으므로 numpy<2를 유지해야 한다.
