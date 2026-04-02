---
name: ui-dev-orchestrator
description: "Text-to-SQL 대시보드 UI 개발 에이전트 팀을 조율하는 오케스트레이터. '대시보드 만들어줘', '웹 UI 개발해줘', 'React 프론트엔드 구현해줘', '실험 인터페이스 만들어줘' 요청 시 반드시 이 스킬을 사용할 것. ui-designer → frontend-developer + backend-developer 병렬 → qa-inspector 순서로 팀을 조율하여 실행 가능한 웹 대시보드를 산출한다."
---

# UI Dev Orchestrator — Text-to-SQL 대시보드 개발 팀 조율

## 실행 모드: 에이전트 팀

## 에이전트 구성

| 팀원 | 에이전트 타입 | 역할 | 스킬 | 출력 |
|------|------------|------|------|------|
| ui-designer | 커스텀 | UI/UX 설계, API 계약서 작성 | ui-design | `_workspace/01_ui-designer_*.md` |
| frontend-developer | 커스텀 | React 구현 | frontend-implementation | `frontend/` |
| backend-developer | 커스텀 | FastAPI 구현 | backend-api | `backend/` |
| qa-inspector | 커스텀 | 통합 정합성 검증 | — | `_workspace/03_qa-inspector_report.md` |

## 워크플로우

### Phase 1: 준비

1. `_workspace/` 디렉토리 생성 확인
2. 기존 구현 여부 확인 (`frontend/`, `backend/` 디렉토리 존재 여부)
3. src/ 모듈 목록 파악 (팀원 프롬프트에 포함할 컨텍스트)

### Phase 2: 설계 (ui-designer 단독)

```
TeamCreate(
  team_name: "ui-team-design",
  members: [
    {
      name: "ui-designer",
      agent_type: "ui-designer",
      model: "opus",
      prompt: "
        Text-to-SQL 자기교정 시스템의 웹 대시보드를 설계하라.
        
        기존 구현:
        - src/sc_tsql.py: 메인 파이프라인
        - src/corrector.py: 교정 모듈  
        - src/metrics.py: 메트릭 계산
        - src/result_explainer.py: 결과 설명
        - configs/config.yaml: 실험 파라미터
        
        ui-design 스킬을 읽고 설계 스펙과 API 계약서를 작성하라.
        완료 시 _workspace/01_ui-designer_design-spec.md 와
        _workspace/01_ui-designer_api-contract.md 를 생성한다.
      "
    }
  ]
)

TaskCreate(tasks: [
  { title: "UI 설계 및 API 계약서 작성", assignee: "ui-designer" }
])
```

ui-designer 완료 후 Phase 2 팀 정리(TeamDelete) → Phase 3 팀 구성.

### Phase 3: 구현 (frontend-developer + backend-developer 병렬)

```
TeamCreate(
  team_name: "ui-team-build",
  members: [
    {
      name: "frontend-developer",
      agent_type: "frontend-developer",
      model: "opus",
      prompt: "
        _workspace/01_ui-designer_design-spec.md 와
        _workspace/01_ui-designer_api-contract.md 를 읽고
        frontend-implementation 스킬을 따라 React 프론트엔드를 구현하라.
        backend-developer와 API shape을 실시간으로 동기화하라.
        완료 시 qa-inspector에게 SendMessage로 알린다.
      "
    },
    {
      name: "backend-developer",
      agent_type: "backend-developer",
      model: "opus",
      prompt: "
        _workspace/01_ui-designer_api-contract.md 를 읽고
        backend-api 스킬을 따라 FastAPI 백엔드를 구현하라.
        src/ 모듈을 래핑하여 REST 엔드포인트를 생성한다.
        API shape 변경 시 frontend-developer에게 즉시 SendMessage로 알린다.
        완료 시 qa-inspector에게 SendMessage로 알린다.
      "
    },
    {
      name: "qa-inspector",
      agent_type: "qa-inspector",
      model: "opus",
      prompt: "
        frontend-developer와 backend-developer의 완료 알림을 기다린다.
        양쪽 완료 후 통합 정합성 검증을 수행하라.
        _workspace/03_qa-inspector_report.md 에 결과를 기록하고 리더에게 보고한다.
      "
    }
  ]
)

TaskCreate(tasks: [
  { title: "React 프론트엔드 구현", assignee: "frontend-developer" },
  { title: "FastAPI 백엔드 구현", assignee: "backend-developer" },
  { title: "통합 정합성 검증", assignee: "qa-inspector", depends_on: ["React 프론트엔드 구현", "FastAPI 백엔드 구현"] }
])
```

**팀원 간 통신 규칙:**
- frontend-developer ↔ backend-developer: API shape 변경 시 즉시 상호 알림
- qa-inspector: 양쪽 완료 알림 수신 후 검증 시작. 이슈 발견 시 해당 에이전트에게 직접 수정 요청
- 리더: TaskGet으로 진행 상황 모니터링. 팀원이 유휴 상태가 되면 알림 수신

### Phase 4: 통합 검증 및 수정

1. `_workspace/03_qa-inspector_report.md` 읽기
2. 실패 항목이 있으면 해당 팀원에게 SendMessage로 수정 요청
3. 수정 완료 후 qa-inspector에게 재검증 요청 (최대 2회)
4. 최종 결과 요약 사용자에게 보고

### Phase 5: 정리

1. 팀원들에게 SendMessage로 종료 요청
2. TeamDelete
3. `_workspace/` 보존
4. 사용자에게 결과 요약 보고:
   - `frontend/` 디렉토리: React 앱 (`npm run dev`로 실행)
   - `backend/` 디렉토리: FastAPI 서버 (`uvicorn main:app --reload`로 실행)
   - 검증 리포트: `_workspace/03_qa-inspector_report.md`

## 데이터 흐름

```
[리더]
  → Phase 2: TeamCreate(ui-designer)
      → _workspace/01_ui-designer_design-spec.md
      → _workspace/01_ui-designer_api-contract.md
  → TeamDelete → Phase 3: TeamCreate(frontend + backend + qa)
      → frontend-developer ←SendMessage→ backend-developer  (API 동기화)
      → frontend/ 디렉토리 생성
      → backend/ 디렉토리 생성
      → qa-inspector (완료 알림 수신 후)
          → _workspace/03_qa-inspector_report.md
  → 수정 루프 (최대 2회)
  → 최종 결과 보고
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| ui-designer 실패 | 1회 재시작. 재실패 시 사용자에게 요구사항 명확화 요청 |
| frontend/backend 중 1개 실패 | 나머지가 완료될 때까지 대기 후 재시작 시도. QA는 완성된 쪽만 부분 검증 |
| API 계약 충돌 (프론트/백엔드 불일치) | qa-inspector가 이슈 발견 시 양쪽에 수정 요청. 리더가 최종 중재 |
| 수정 후 재검증 2회 실패 | 실패 항목을 사용자에게 보고하고 수동 수정 안내 |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 "대시보드 만들어줘" 요청
2. Phase 2: ui-designer가 설계 스펙 + API 계약서 생성
3. Phase 3: frontend-developer + backend-developer 병렬 구현, API shape 동기화
4. qa-inspector가 통합 정합성 검증 → 모두 통과
5. `frontend/`, `backend/` 디렉토리에 실행 가능한 코드 생성
6. 사용자에게 실행 방법 안내

### 에러 흐름
1. Phase 3에서 backend-developer가 src/ 모듈 임포트 오류로 중단
2. 리더가 유휴 알림 수신 → SendMessage로 Mock 서비스로 대체하여 계속 진행 지시
3. qa-inspector가 검증 시 Mock 처리된 엔드포인트를 리포트에 명시
4. 최종 보고서에 "backend 3개 엔드포인트 Mock 처리됨, 실제 src/ 연동 필요" 명시
