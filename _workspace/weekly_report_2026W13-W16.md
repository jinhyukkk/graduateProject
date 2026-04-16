# 주간 진행 보고서 (2026 W13 – W16)

**작성일:** 2026-04-14
**대상 프로젝트:** Self-Correcting Text-to-SQL (국민대학교 대학원 졸업프로젝트2)
**근거 자료:** Claude Code 세션 로그 (구 `졸업프로젝트` 7개 + 현 `졸업프로젝트2` 20개 세션) 및 `_workspace/` 산출물

---

## W13 (03-23 ~ 03-29): Phase 0 — 환경·데이터 초기 구축 [구 `졸업프로젝트`]

- **03-25** — 개발 환경 설정 메타 확인 (Claude 한도 등).
- **03-26** — Phase 0 사전 준비 점검: BIRD dev set(dev.json, SQLite .db, external evidence) 다운로드 체크리스트. 기존 `../졸업프로젝트/app/` 자산 참조로 작업 이관.
- **03-28**
  - Python `.venv` + 주요 의존성 설치 완료 (langchain, langgraph, openai, streamlit, pandas, faiss-cpu).
  - 폴더 구조 `app/ data/ src/` 확정.
  - `data/bird/dev.json` 점검, stratified sampling 600개 추출 계획, SQLite 연결 테스트.
  - **1주차 주간 진행 현황(3/25–3/31) 최초 작성** — Accomplishments / Activities Planned Next Week / Issues & Risks 개조식 포맷 수립.
- **03-29** — 프로젝트 설정 전반 점검(✅/⚠️/❌), `todo.md` vs 작업일지 포맷 논의, `CLAUDE.md` + `todo.md` 이중 트래킹 체계 채택.

## W14 (03-30 ~ 04-05): 논문 하네스 착수 → 프로젝트2로 분기

- **03-31** — `CLAUDE.md` / `todo.md` / `docs/계획.md` 기반 진행률 재점검, 마감일 확정.
- **04-01 오전** [구 디렉토리 마지막 작업]
  - **논문 작성 하네스** 구성 시작. 에이전트 팀(선행연구 / 연구설계 / 실험분석 / 집필 / 품질검토) + 감독자 구조.
  - **연구 목적 선언**: "비전문가가 자연어로 기업 내부 DB를 조회하도록, 오류 유형을 스스로 인식·교정하는 에이전트 구축".
  - `academic-paper` 스킬 자동 트리거 테스트.
- **04-01 오후** [`졸업프로젝트2`로 전환] — 실험환경 구축 하네스 착수, 학술 논문 초안 생성.
- **04-02** — 실험환경 하네스 + 웹 대시보드 하네스(UI Dev Orchestrator) 분리. `.claude/` 도메인 격리 결정.
- **04-03**
  - 논문 완성 하네스 구성(구조 분석 / 선행연구 조사 / 논거 보완 에이전트).
  - **HR DB 스키마-온리** 방향 최초 확정 (보안상 DB명·컬럼명·데이터 변형, 합성 데이터 사용).
- **04-04** — BIRD 데이터 접근(DataGrip), 실험 결과 0 원인 디버깅, 교수님 설명용 실험 진행 방법 문서(화면별 역할) 작성.

## W15 (04-06 ~ 04-12): 초록 정제 + 베이스라인 재현 가능성

- **04-06** — HR 시스템 스키마 추출 방법, 실험 유의미성 위한 최소 테이블 수 논의.
- **04-07**
  - `abstract_v2.md` / `초록_KITS.md` 과잉/부족 점검, 영문 초록 제거, HR-DB 중심 강조.
  - LLM Text-to-SQL 오류율 근거 수집, `effort` 기능 등 상세 QA.
  - `improve-abstract` 스킬로 prior-work 추출 → gap → positioning → rewrite 전 파이프라인 실행. HR 스키마-온리 제약 통합.
- **04-08** — 초록의 빈 수치(X.X%, Y.Y%) 채울 실험환경 점검. **DIN-SQL / DAIL-SQL / CHESS / MAC-SQL 재현 가능성** 조사.
- **04-09** — NLI 검증기 단독 정밀도·재현율 파일럿 측정 환경 확인.
- **04-11 ~ 04-12** — `docs/초록.md` 기반 `CLAUDE.md` 생성. 전체 프레임워크 실측 가능 여부 대규모 점검(334 메시지).

## W16 (04-13 ~ 04-19, 진행 중)

- **04-14** — 프로젝트 현재 상태 점검, `academic-paper` 스킬 위치/역할 확인, 주간 보고서 정리(본 문서).

---

## 산출물 스냅샷

- **`_workspace/`**: `prior_work_table.md`, `gap_matrix.md`, `positioning_decision.md`, `01_experiment_spec.md`, `abstract_v2.md`, `qa_01~04` 문서 4건, 선행연구 요약(`01_lit_*.md`) 3건, KITS 제출 가이드라인.
- **핵심 커밋**: `Refocus harness on abstract-improvement pipeline`, `Enhance SC-TSQL pipeline, dashboard UI, and paper draft`, `Add SC-TSQL pipeline, web dashboard, and multi-model configs`.
- **핵심 스킬**: `improve-abstract`, `extract-prior-work`, `contribution-diff`, `research-positioning`, `abstract-refine`, `academic-paper`, `harness`.

## 프로젝트 디렉토리 구조 변화

| 디렉토리 | 기간 | 비고 |
|---|---|---|
| `국민대학원/졸업프로젝트` (구) | 03-26 ~ 04-01 오전 | Phase 0, venv/BIRD, 1주차 보고서, 논문 하네스 착수 |
| `국민대학원/졸업프로젝트2` (현) | 04-01 오후 ~ 진행 중 | 실험환경/UI 하네스, 초록 정제, HR 스키마-온리 |
| `~/` 루트 / 기타 Project-* | 비관련 | Wifi, Chrome 원격, MyStock 등 별개 주제 |

## 다음 주(W17) 예상 작업

- HR 스키마-온리 합성 데이터 구성 및 파일럿 실행
- NLI 검증기 단독 정밀도·재현율 측정
- DAIL-SQL / MAC-SQL GPT-4o 재실행으로 초록 수치(X.X%, Y.Y%) 채우기
- BIRD dev + HRDB 이중 검증 리포팅 템플릿 확정
