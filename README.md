# SC-TSQL: 자기교정 Text-to-SQL 프레임워크

**기업 데이터 접근성 향상을 위한 자기교정 Text-to-SQL 프레임워크**  
A Self-Correcting Text-to-SQL Framework for Enhancing Enterprise Data Accessibility

국민대학교 대학원 졸업프로젝트 | 박진혁  
한국IT서비스학회(KITS) 제출

---

## 연구 개요

자연어 질문을 SQL로 변환하는 기존 Text-to-SQL 연구는 **실행 가능성** 검증에 집중해 왔다. 그러나 SQL이 오류 없이 실행되더라도 사용자 의도와 다른 결과를 반환하는 **의도 불일치** 문제는 해결하지 못한다.

본 연구는 두 가지 연구 질문(RQ)에 답한다:

- **RQ1.** NLI(자연어 추론) 기반 의미 검증이, 기존 실행 기반 검증과 **별개로** 성능에 기여하는가?
- **RQ2.** 오류 유형별로 **다른 교정 지시문**을 사용하는 것이, 단일 공용 지시문보다 정확한가?

---

## 파이프라인 구조

```
자연어 질문
    │
    ▼
[1] Schema Linker      — 관련 테이블/컬럼 선별 (Section 4.2)
    │
    ▼
[2] SQL Generator      — 초기 SQL 생성 (Section 4.3)
    │
    ▼
[3] Self-Correction Loop (최대 K=3회)  (Section 4.4)
    │
    ├─ [3a] Execution Validator  — 실행 기반 검증 (Section 4.4.1)
    │
    ├─ [3b] Semantic Verifier    — NLI 의도 일치 검증 (Section 4.4.2) ← RQ1
    │
    └─ [3c] Corrector            — 오류 유형별 교정 지시문 (Section 4.4.3) ← RQ2
    │
    ▼
[4] Result Explainer   — 결과 자연어 설명 (Section 4.5)
```

---

## 디렉토리 구조

```
.
├── src/
│   ├── sc_tsql.py              # 메인 파이프라인 오케스트레이터
│   ├── schema_linker.py        # 스키마 링킹
│   ├── sql_generator.py        # SQL 생성
│   ├── execution_validator.py  # 실행 기반 검증
│   ├── semantic_verifier.py    # NLI 의도 일치 검증 (RQ1 핵심)
│   ├── corrector.py            # 오류 유형별 교정 지시문 라우팅 (RQ2 핵심)
│   ├── metrics.py              # 평가 지표 (EX, CSR, ICS, Latency)
│   ├── result_explainer.py     # 결과 자연어 설명 생성
│   └── baselines/
│       ├── zeroshot.py         # Zero-shot 베이스라인
│       ├── dail_sql.py         # DAIL-SQL (Gao et al., VLDB 2024)
│       └── mac_sql.py          # MAC-SQL (Wang et al., EMNLP 2024)
├── configs/
│   ├── config.yaml             # 기본 설정 (GPT-4o)
│   └── config_gpt5mini.yaml    # 경량 모델 설정
├── data/
│   └── raw/
│       ├── bird/               # BIRD 벤치마크 (dev.json)
│       └── hrdb/               # 기업 인사 DB (스키마-온리 + 합성 데이터)
├── evaluate.py                 # 평가 진입점
├── backend/                    # FastAPI 데모 백엔드
├── frontend/                   # Vite + React 데모 프런트엔드
├── docker/
│   └── nginx.conf              # nginx SPA + 프록시 설정
├── Dockerfile.backend          # 백엔드 Docker 이미지
├── Dockerfile.frontend         # 프런트엔드 Docker 이미지
├── docker-compose.yml          # 서비스 오케스트레이션
├── .env.example                # 환경변수 템플릿
├── docs/                       # 논문·기획서·프롬프트 정의
├── outputs/
│   ├── logs/                   # 실험 로그
│   └── checkpoints/            # 체크포인트
└── environment.yml
```

---

## 설치 및 환경 구성

### 1. 환경 생성

```bash
conda env create -f environment.yml
conda activate sc_tsql_env
```

### 2. API 키 설정

```bash
bash setup_env.sh
```

`.env` 파일에 OpenAI API 키를 설정한다:

```
OPENAI_API_KEY=sk-...
```

---

## 실험 실행

### BIRD 벤치마크 평가

```bash
python evaluate.py --config configs/config.yaml --dataset bird
```

### HRDB 기업 DB 평가

```bash
python evaluate.py --config configs/config.yaml --dataset hrdb
```

### 베이스라인 비교 실행

`evaluate.py`는 `--model` 플래그로 모델을 선택한다:

```bash
# SC-TSQL (기본)
python evaluate.py --config configs/config.yaml --dataset bird

# DAIL-SQL 베이스라인
python evaluate.py --config configs/config.yaml --dataset bird --model dail_sql

# MAC-SQL 베이스라인
python evaluate.py --config configs/config.yaml --dataset bird --model mac_sql

# Zero-shot 베이스라인
python evaluate.py --config configs/config.yaml --dataset bird --model zeroshot
```

### 어블레이션 실험

`AblationFlags`를 활용해 구성요소별 기여도를 측정한다:

| 플래그 | 설명 |
|--------|------|
| `disable_semantic_verifier` | NLI 검증 제거 (RQ1 어블레이션) |
| `use_generic_correction_prompt` | 단일 공용 지시문 사용 (RQ2 어블레이션) |
| `disable_execution_validator` | 실행 기반 검증 제거 |
| `disable_correction_loop` | 교정 루프 전체 제거 |

---

## 평가 지표

| 지표 | 설명 |
|------|------|
| **EX** | Execution Accuracy — 실행 결과 일치율 |
| **CSR** | Correction Success Rate — 교정 성공률 |
| **ICS** | Intent Consistency Score — 의도 일치 점수 (본 연구 제안) |
| **Latency** | 평균 응답 시간 (초) |

> ICS는 본 연구가 새로 제안한 지표이며, 기존 EX를 대체하지 않고 **함께** 보고한다.

---

## 베이스라인 구현 현황

| 모델 | 논문 | 구현 상태 | 비고 |
|------|------|-----------|------|
| Zero-shot | — | 완료 | GPT-4o, 직접 SQL 생성 |
| DAIL-SQL | Gao et al., VLDB 2024 | 완료 | DAIL Selection + Code Repr. + DAIL Organization |
| MAC-SQL | Wang et al., EMNLP 2024 | 완료 | Selector(조건부) → Decomposer → Refiner(3라운드) |

> 모든 베이스라인은 **동일한 GPT-4o 백본**으로 재실행해 공정 비교한다.

---

## 데모 UI 실행

### 로컬 개발 환경

```bash
# 백엔드 (FastAPI)
uvicorn backend.main:app --reload

# 프런트엔드 (Vite + React)
cd frontend && npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

### Docker 환경

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 OPENAI_API_KEY 입력

# 2. 빌드 및 실행
docker compose up --build

# 3. 접속
# 프런트엔드:  http://localhost:3000
# 백엔드 API: http://localhost:8000
# API 문서:   http://localhost:8000/docs
```

백그라운드 실행:

```bash
docker compose up -d --build
docker compose logs -f    # 로그 확인
docker compose down       # 종료
```

#### Docker 서비스 구성

| 서비스 | 포트 | 설명 |
|--------|------|------|
| `backend` | 8000 | FastAPI + SC-TSQL 파이프라인 |
| `frontend` | 3000 | React 빌드 → nginx 서빙 |

> **첫 빌드 시** NLI 모델(`cross-encoder/nli-deberta-v3-base`, ~500MB)을 다운로드합니다.  
> 이후 빌드는 Docker 레이어 캐시로 빠르게 진행됩니다.

---

## 주요 설정값 (`configs/config.yaml`)

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `correction.max_rounds` | 3 | 자기교정 최대 반복 횟수 (K) |
| `correction.semantic_threshold` | 0.75 | NLI 의도 일치 임계값 (θ) |
| `nli.model` | `cross-encoder/nli-deberta-v3-base` | NLI 모델 |
| `baselines.dail_sql.few_shot_k` | 9 | DAIL-SQL 예시 수 |
| `baselines.mac_sql.max_refine_rounds` | 3 | MAC-SQL Refiner 최대 교정 횟수 |

---

## 실험 설계 원칙

- **HRDB는 스키마-온리.** 실제 인사 데이터는 보유하지 않으며, 테이블 구조만 가져와 합성 데이터로 채워 사용한다 (개인정보 보호).
- **베이스라인 재실행.** DAIL-SQL, MAC-SQL 인용 수치를 그대로 사용하지 않고 GPT-4o로 재실행해 동일 LLM 환경에서 비교한다.
- **이중 검증.** BIRD dev set → HRDB 실무형 환경 순으로 두 환경 모두에서 보고한다.

---

## 참고 문헌

- Gao et al., *Revisiting the Empirical Evaluation of Text-to-SQL with Real-World Enterprise-Grade Benchmarks*, VLDB 2024 (DAIL-SQL)
- Wang et al., *MAC-SQL: A Multi-Agent Collaborative Framework for Text-to-SQL*, EMNLP 2024
- Li et al., *Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs*, NeurIPS 2023 (BIRD)
