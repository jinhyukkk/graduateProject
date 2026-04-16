# 졸업프로젝트2 — Self-Correcting Text-to-SQL

국민대학교 대학원 졸업 프로젝트. **자연어 추론(NLI) 기반 의도 일치 검증**과 **오류 유형별 전용 교정 지시문**을 결합한 자기교정 Text-to-SQL 프레임워크를 제안하고, 공개 벤치마크(BIRD)와 기업 인사 DB(HRDB, 스키마-온리)에서 검증한다.

핵심 문서: [docs/초록.md](docs/초록.md) — 프로젝트의 모든 결정은 이 초록의 RQ1(NLI 검증의 추가 기여), RQ2(유형별 교정 지시문의 우월성)에 종속된다.

## 연구 질문 (Research Questions)

- **RQ1.** 생성된 SQL을 자연어로 역번역해 NLI로 의미 일치를 판정하는 방식이, 기존 실행 기반 검증과 **별개로** 성능에 기여하는가?
- **RQ2.** 진단된 오류 유형별로 **다른 교정 지시문**을 쓰는 것이, 단일 공용 지시문보다 정확한가?

## 디렉토리 구조

- [src/](src/) — 핵심 파이프라인 모듈
  - [sc_tsql.py](src/sc_tsql.py) — 전체 자기교정 루프 오케스트레이터
  - [schema_linker.py](src/schema_linker.py) · [sql_generator.py](src/sql_generator.py) — 스키마 링킹 → SQL 생성
  - [execution_validator.py](src/execution_validator.py) — 실행 기반 검증 (베이스라인 축)
  - [semantic_verifier.py](src/semantic_verifier.py) — **NLI 의도 일치 검증기** (RQ1 핵심)
  - [corrector.py](src/corrector.py) — **오류 유형별 교정 지시문 라우팅** (RQ2 핵심)
  - [metrics.py](src/metrics.py) · [result_explainer.py](src/result_explainer.py)
- [configs/](configs/) — `config.yaml`(GPT-4o 기본), `config_gpt5mini.yaml` 등 모델별 설정. `correction.max_rounds=3`, `semantic_threshold=0.75`가 기본값.
- [data/raw/](data/raw/) — `bird/`, `hrdb/`, `spider/`. **HRDB는 테이블 구조만 실데이터에서 가져오고 내용은 합성 데이터로 채움** (개인정보 보호).
- [evaluate.py](evaluate.py) — BIRD/HRDB 공정 비교 평가 진입점.
- [backend/](backend/) · [frontend/](frontend/) — FastAPI + Vite 데모 UI (실험 결과 시각화).
- [docs/](docs/) — 초록·기획서·파이프라인·프롬프트·worklog. 학회 제출본은 [docs/한국IT서비스학회 초록.docx](docs/한국IT서비스학회%20초록.docx).
- [_workspace/](_workspace/) — 에이전트 산출물(선행연구표, gap matrix, positioning, QA 문서). 작업 중간 산출물 저장소.
- [선행연구/](선행연구/) — DAIL-SQL, MAC-SQL 등 비교 대상 PDF 원본.
- [.claude/](.claude/) — 프로젝트 전용 에이전트·스킬 정의.

## 실험 설계 관례 (반드시 준수)

- **HR DB는 스키마-온리.** 실제 인사 데이터는 보유하지 않으며, 테이블 구조만 가져와 합성 데이터로 채워 사용한다.
- **베이스라인 재실행 원칙.** DAIL-SQL, MAC-SQL은 인용 수치를 그대로 쓰지 않고 **GPT-4o로 재실행**하여 동일 LLM 환경에서 비교한다.
- **이중 검증.** 평가는 항상 (1) BIRD dev → (2) HRDB 실무형 환경 순으로, 두 환경 모두에서 보고한다.
- **의도 일치 점수**는 본 연구가 새로 제안한 지표이므로, 기존 실행 정확도(EX)와 **함께** 보고하되 절대 대체하지 않는다.

## 주요 명령어

```bash
conda env create -f environment.yml      # 환경 구성
bash setup_env.sh                         # API 키/경로 셋업
python evaluate.py --config configs/config.yaml --dataset bird
python evaluate.py --config configs/config.yaml --dataset hrdb
uvicorn backend.main:app --reload         # 데모 백엔드
cd frontend && npm run dev                # 데모 프런트엔드
```

## 작업 규칙

- **초록 원본 보호.** [docs/초록.md](docs/초록.md), [abstract_v2.md](abstract_v2.md)는 사용자가 명시 요청하지 않는 한 덮어쓰지 않는다. 개선안은 `_workspace/`에 새 파일로 저장.
- **선행연구 대조.** 새 주장(novelty)을 추가할 때는 반드시 [_workspace/prior_work_table.md](_workspace/prior_work_table.md)와 [_workspace/gap_matrix.md](_workspace/gap_matrix.md)를 먼저 확인하고, 4축(오류 분류 / 의미 검증 / 유형별 프롬프트 / 반복 교정 루프) 기준으로 차별점을 검증한다. `improve-abstract` 스킬 사용 권장.
- **학회 톤.** 한국IT서비스학회 양식. 과잉 주장 금지, 한국어 학술 톤 유지.
- **산출물 위치.** 실험 로그는 [outputs/logs/](outputs/logs/), 체크포인트는 [outputs/checkpoints/](outputs/checkpoints/).

## 빠른 컨텍스트 진입

- 프로젝트가 무엇인지: [docs/초록.md](docs/초록.md)
- 파이프라인 구조: [docs/pipeline.md](docs/pipeline.md), [docs/sc_tsql_architecture.svg](docs/sc_tsql_architecture.svg)
- 프롬프트 정의: [docs/prompts.md](docs/prompts.md)
- 현재 실험 사양: [_workspace/01_experiment_spec.md](_workspace/01_experiment_spec.md)
- 포지셔닝 결정 기록: [_workspace/positioning_decision.md](_workspace/positioning_decision.md)
