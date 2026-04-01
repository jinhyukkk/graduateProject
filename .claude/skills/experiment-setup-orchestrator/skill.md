---
name: experiment-setup-orchestrator
description: "논문을 입력받아 바로 실행 가능한 ML/AI 실험 환경을 자동으로 구축하는 오케스트레이터. '이 논문 실험 환경 구축해줘', '논문 재현 코드 만들어줘', '이 논문으로 실험 셋업해줘', '논문 첨부할게 코드 짜줘' 등의 요청 시 반드시 이 스킬을 사용할 것. 논문 PDF나 텍스트 파일을 받아 실험 스펙 추출 → 환경 구성 → 코드 구현 → 동작 검증까지 에이전트 팀이 자동 처리한다."
---

# Experiment Setup Orchestrator

논문을 입력받아 바로 실험 가능한 상태까지 자동으로 구축하는 에이전트 팀 오케스트레이터.

## 실행 모드: 에이전트 팀

## 에이전트 구성

| 팀원 | 에이전트 파일 | 역할 | 스킬 | 주요 출력 |
|------|------------|------|------|---------|
| paper-analyst | paper-analyst.md | 논문 분석, 스펙 추출 | paper-analysis | `_workspace/01_experiment_spec.md` |
| env-builder | env-builder.md | 환경 구성 스크립트 작성 | env-setup | `setup_env.sh`, `requirements.txt` |
| code-implementer | code-implementer.md | 실험 코드 구현 | code-implementation | `src/`, `train.py`, `configs/` |
| experiment-verifier | experiment-verifier.md | 동작 검증 및 버그 수정 | experiment-verification | `_workspace/04_verification_report.md` |

## 워크플로우

### Phase 1: 입력 분석 및 준비

1. 논문 경로/텍스트 수신 및 파일 존재 확인
2. 출력 디렉토리 결정: 논문 제목에서 약어 추출 → `experiment/` 또는 사용자 지정 경로
3. `_workspace/` 디렉토리 생성
4. 논문 파일을 `_workspace/00_paper.[ext]`로 복사

### Phase 2: 팀 구성

```
TeamCreate(
  team_name: "paper-experiment-team",
  members: [
    {
      name: "paper-analyst",
      agent_type: "paper-analyst",
      model: "opus",
      prompt: "
        당신은 paper-analyst입니다. paper-analysis 스킬을 사용하세요.
        분석할 논문: _workspace/00_paper.[ext]
        출력:
          - _workspace/01_experiment_spec.md (구조화된 실험 스펙)
          - _workspace/01_requirements.txt (Python 의존성)
          - _workspace/01_ambiguities.md (불명확한 항목)
        완료 후 env-builder와 code-implementer에게 각각 SendMessage로 핵심 정보를 전달하세요.
      "
    },
    {
      name: "env-builder",
      agent_type: "env-builder",
      model: "opus",
      prompt: "
        당신은 env-builder입니다. env-setup 스킬을 사용하세요.
        paper-analyst의 완료 알림을 받은 후 시작하세요.
        입력: _workspace/01_experiment_spec.md, _workspace/01_requirements.txt
        출력: setup_env.sh, requirements.txt, environment.yml, 디렉토리 구조, _workspace/02_env_report.md
        완료 후 code-implementer와 experiment-verifier에게 SendMessage로 알리세요.
      "
    },
    {
      name: "code-implementer",
      agent_type: "code-implementer",
      model: "opus",
      prompt: "
        당신은 code-implementer입니다. code-implementation 스킬을 사용하세요.
        paper-analyst의 완료 알림을 받은 후 시작하세요. env-builder와 패키지 의존성을 조율하세요.
        입력: _workspace/01_experiment_spec.md, _workspace/02_env_report.md (env-builder 완료 후)
        출력: src/, train.py, evaluate.py, configs/config.yaml, _workspace/03_code_structure.md
        완료 후 experiment-verifier에게 SendMessage로 실행 방법 안내하세요.
      "
    },
    {
      name: "experiment-verifier",
      agent_type: "experiment-verifier",
      model: "opus",
      prompt: "
        당신은 experiment-verifier입니다. experiment-verification 스킬을 사용하세요.
        code-implementer와 env-builder 모두 완료된 후 시작하세요.
        입력: src/, train.py, evaluate.py, configs/, _workspace/01_experiment_spec.md
        버그 발견 시 code-implementer에게 SendMessage로 수정 요청하세요 (최대 2회).
        출력: _workspace/04_verification_report.md
      "
    }
  ]
)
```

### Phase 3: 작업 등록

```
TaskCreate(tasks: [
  {
    title: "논문 분석 및 실험 스펙 추출",
    description: "_workspace/00_paper 파일을 분석하여 실험 스펙, requirements, 불명확 항목 추출",
    assignee: "paper-analyst"
  },
  {
    title: "실험 환경 구성",
    description: "실험 스펙 기반으로 conda 환경 스크립트, requirements.txt, 디렉토리 구조 생성",
    assignee: "env-builder",
    depends_on: ["논문 분석 및 실험 스펙 추출"]
  },
  {
    title: "실험 코드 구현",
    description: "실험 스펙 기반으로 데이터 로더, 모델, 학습 루프, 평가 코드 구현",
    assignee: "code-implementer",
    depends_on: ["논문 분석 및 실험 스펙 추출"]
  },
  {
    title: "코드 동작 검증",
    description: "import 검사, forward pass 검증, 스모크 테스트, 검증 보고서 작성",
    assignee: "experiment-verifier",
    depends_on: ["실험 환경 구성", "실험 코드 구현"]
  }
])
```

**의존성 구조:**
```
[논문 분석] → [환경 구성] ─┐
           → [코드 구현] ─┼→ [검증]
```
env-builder와 code-implementer는 병렬 실행, 단 code-implementer는 env-builder 정보를 SendMessage로 받아서 반영.

### Phase 4: 팀 모니터링

리더는 다음을 수행한다:
- TaskGet으로 전체 진행 상황 주기적 확인
- 특정 팀원이 15분 이상 진행이 없으면 SendMessage로 상태 확인
- experiment-verifier가 버그 수정 루프에서 막히면 리더가 직접 code-implementer에게 지시

### Phase 5: 결과 수집 및 정리

1. 모든 팀원의 작업 완료 확인 (TaskGet)
2. 산출물 수집:
   - `_workspace/01_experiment_spec.md` — 실험 스펙
   - `_workspace/04_verification_report.md` — 검증 결과
   - `setup_env.sh`, `requirements.txt` — 환경 설정
   - `src/`, `train.py`, `evaluate.py`, `configs/` — 구현 코드
3. TeamDelete로 팀 정리
4. `_workspace/` 보존 (감사 추적용)
5. 사용자에게 최종 보고

### Phase 6: 사용자 보고 형식

```
## 실험 환경 구축 완료

**논문**: [논문 제목]
**검증 상태**: PASS / PARTIAL / FAIL

### 생성된 파일
- `setup_env.sh` — 환경 설치 스크립트
- `requirements.txt` — Python 의존성
- `src/` — 구현 코드 (모델, 데이터 로더, 유틸)
- `train.py` — 학습 실행 스크립트
- `evaluate.py` — 평가 스크립트
- `configs/config.yaml` — 하이퍼파라미터 설정

### 빠른 시작
```bash
bash setup_env.sh          # 환경 설치
conda activate [env_name]
python train.py --config configs/config.yaml
```

### 주의사항
[_workspace/01_ambiguities.md의 주요 항목 요약]
[검증 보고서의 PARTIAL/FAIL 항목 요약]
```

## 데이터 흐름

```
논문 파일
    ↓
[paper-analyst]
    ├── _workspace/01_experiment_spec.md ──┐
    ├── _workspace/01_requirements.txt ─→ [env-builder]
    └── _workspace/01_ambiguities.md       │
                                           ↓
                              setup_env.sh, requirements.txt
                              _workspace/02_env_report.md
                                    ↕ SendMessage
                              [code-implementer]
                              src/, train.py, configs/
                              _workspace/03_code_structure.md
                                           │
                                           ↓
                              [experiment-verifier]
                              _workspace/04_verification_report.md
```

## 에러 핸들링

| 상황 | 대응 전략 |
|------|---------|
| 논문 파일 없음 | 사용자에게 경로 재요청 후 중단 |
| paper-analyst 스펙 불완전 | ambiguities.md를 팀원에게 공유하고 진행 |
| env-builder 패키지 충돌 | 대안 버전으로 폴백, code-implementer에게 알림 |
| code-implementer 미명시 항목 구현 불가 | 가장 단순한 구현 적용 후 주석 명시 |
| experiment-verifier 2회 수정 후 FAIL | PARTIAL로 보고, 미해결 항목 명시 |
| 팀원 전체 실패 | 현재까지 수집된 산출물로 부분 보고 |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 논문 PDF 경로 또는 텍스트 제공
2. Phase 1: `_workspace/` 생성, 논문 복사
3. Phase 2: 4명 팀 + 4개 작업 등록
4. Phase 3: paper-analyst 완료 → env-builder + code-implementer 병렬 시작
5. code-implementer가 env-builder 결과를 SendMessage로 받아 패키지 맞춰 구현
6. experiment-verifier가 양쪽 완료 후 검증 실행
7. 검증 PASS → Phase 5 정리
8. 최종 보고: PASS, 실행 커맨드 제공

### 에러 흐름 (검증 실패 → 수정 루프)
1. experiment-verifier가 `src/models/main_model.py:45`에서 device 오류 발견
2. code-implementer에게 SendMessage로 수정 요청 (파일명, 라인, 수정 내용)
3. code-implementer가 수정 후 알림
4. experiment-verifier가 재검증 → PASS
5. 2회 후에도 FAIL이면 PARTIAL로 보고

## 트리거 예시

이 스킬은 다음 요청에 반응한다:
- "이 논문 실험 환경 구축해줘" + 파일 첨부
- "논문 재현 코드 만들어줘"
- "이 arXiv 논문 구현해줘"
- "논문 읽고 코드 짜줘"
- "실험 셋업 자동으로 해줘"

다음 요청에는 반응하지 않는다 (near-miss):
- "논문 요약해줘" — 실험 구현이 아닌 내용 요약
- "코드 리뷰해줘" — 기존 코드 검토, 신규 구현 아님
- "이 코드 디버깅해줘" — 기존 코드 수정, 논문 기반 구현 아님
