---
name: paper-completion
description: "작성 중인 학술 논문을 끝까지 완성시키는 오케스트레이터. 논문 초안을 입력받아 구조 분석 → 선행연구 보강 + 논거 강화(병렬) → 최종 통합 편집의 전 과정을 에이전트 팀이 수행한다. '논문 완성해줘', '논문 마무리해줘', '초안 검토하고 보강해줘', '논문 품질 올려줘', '부족한 부분 채워줘', 'finish my paper', 'complete the draft' 요청 시 반드시 이 스킬을 사용할 것. 기존 academic-paper 스킬이 처음부터 논문을 쓰는 것이라면, 이 스킬은 이미 작성된 초안을 완성하는 데 특화되어 있다."
---

# Paper Completion Orchestrator

작성 중인 학술 논문의 초안을 분석하고, 부족한 부분을 채우며, 논리적 흐름과 학술적 완성도를 높여 최종본을 생성하는 에이전트 팀 오케스트레이터.

## 실행 모드: 에이전트 팀

## 에이전트 구성

| 팀원 | 에이전트 정의 | 역할 | 스킬 | 출력 |
|------|-------------|------|------|------|
| structure-analyst | paper-structure-analyst | 논문 구조·논리 흐름 분석, 갭 식별 | paper-gap-analysis | `_workspace/01_structure-analyst_gap-report.md` |
| lit-researcher | paper-lit-researcher | 선행연구 조사, 참고문헌 보강 | paper-lit-search | `_workspace/02_lit-researcher_references.md` |
| argument-builder | paper-argument-builder | 논거 보완, 약한 섹션 강화 | paper-argument-building | `_workspace/02_argument-builder_enhancements.md` |

## 워크플로우

### Phase 1: 준비

1. 사용자 입력에서 논문 파일 경로를 파악한다
   - 마크다운(.md), PDF(.pdf), 텍스트(.txt) 파일을 지원
   - 경로가 명시되지 않으면 작업 디렉토리에서 논문으로 보이는 파일을 탐색
2. 논문 파일을 Read로 읽어 전체 내용을 파악한다
3. `_workspace/` 디렉토리가 없으면 생성한다
4. 논문의 기본 정보를 정리한다: 제목, 대상(학위/학회), 언어, 현재 완성도

### Phase 2: 팀 구성 — 구조 분석

1. 팀 생성:
   ```
   TeamCreate(
     team_name: "paper-completion-team",
     members: [
       {
         name: "structure-analyst",
         agent_type: "general-purpose",
         model: "opus",
         prompt: "당신은 논문 구조 분석 전문가입니다. .claude/agents/paper-structure-analyst.md의 역할 정의를 읽고, .claude/skills/paper-gap-analysis/skill.md의 워크플로우에 따라 작업하세요. 분석 대상 논문: {논문_파일_경로}. 결과를 _workspace/01_structure-analyst_gap-report.md에 저장하세요."
       },
       {
         name: "lit-researcher",
         agent_type: "general-purpose",
         model: "opus",
         prompt: "당신은 선행연구 조사 전문가입니다. .claude/agents/paper-lit-researcher.md의 역할 정의를 읽고, .claude/skills/paper-lit-search/skill.md의 워크플로우에 따라 작업하세요. 대상 논문: {논문_파일_경로}. structure-analyst의 갭 리포트(_workspace/01_structure-analyst_gap-report.md)가 완성되면 작업을 시작하세요. 결과를 _workspace/02_lit-researcher_references.md에 저장하세요."
       },
       {
         name: "argument-builder",
         agent_type: "general-purpose",
         model: "opus",
         prompt: "당신은 논거 보강 전문가입니다. .claude/agents/paper-argument-builder.md의 역할 정의를 읽고, .claude/skills/paper-argument-building/skill.md의 워크플로우에 따라 작업하세요. 대상 논문: {논문_파일_경로}. structure-analyst의 갭 리포트(_workspace/01_structure-analyst_gap-report.md)가 완성되면 작업을 시작하세요. lit-researcher와 SendMessage로 협력하세요. 결과를 _workspace/02_argument-builder_enhancements.md에 저장하세요."
       }
     ]
   )
   ```

2. 작업 등록:
   ```
   TaskCreate(tasks: [
     { title: "논문 구조 분석 및 갭 리포트 작성", assignee: "structure-analyst" },
     { title: "갭 리포트 기반 선행연구 탐색", assignee: "lit-researcher", depends_on: ["논문 구조 분석 및 갭 리포트 작성"] },
     { title: "갭 리포트 기반 논거 보강 텍스트 작성", assignee: "argument-builder", depends_on: ["논문 구조 분석 및 갭 리포트 작성"] },
     { title: "lit-researcher ↔ argument-builder 교차 검토", assignee: "lit-researcher", depends_on: ["갭 리포트 기반 선행연구 탐색", "갭 리포트 기반 논거 보강 텍스트 작성"] }
   ])
   ```

### Phase 3: 팀 실행

**실행 흐름:**

```
structure-analyst: 갭 리포트 작성
         │
         ▼
    ┌────┴────┐
    ▼         ▼
lit-researcher  argument-builder   ← 병렬 수행, SendMessage로 상호 발견 공유
    │         │
    └────┬────┘
         ▼
   교차 검토 (lit의 논문이 argument에 반영되었는지, argument의 요청이 lit에 충족되었는지)
```

**팀원 간 통신 규칙:**
- structure-analyst → lit-researcher: 선행연구 관련 갭 상세
- structure-analyst → argument-builder: 논거 보강 관련 갭 상세
- lit-researcher → argument-builder: 발견한 논문 중 논거 강화에 활용 가능한 것
- argument-builder → lit-researcher: 특정 주장을 뒷받침할 논문 탐색 요청

**리더 모니터링:**
- TaskGet으로 진행 상황 주기적 확인
- structure-analyst 완료 후 lit-researcher와 argument-builder가 시작되었는지 확인
- 팀원이 막혀있으면 SendMessage로 지시

### Phase 4: 통합 편집

모든 팀원의 작업이 완료되면:

1. 세 산출물을 순서대로 Read:
   - `_workspace/01_structure-analyst_gap-report.md`
   - `_workspace/02_lit-researcher_references.md`
   - `_workspace/02_argument-builder_enhancements.md`

2. 원본 논문을 Read

3. **통합 편집 수행:**
   - argument-builder의 보강 텍스트를 지정된 위치에 삽입/대체
   - lit-researcher의 추가 참고문헌과 인용 텍스트를 반영
   - 섹션 간 논리 흐름을 재점검하고 전환 문장 조정
   - 참고문헌 번호 재정렬
   - 용어 일관성 최종 확인

4. **최종본 저장:**
   - 논문 원본 파일을 Edit으로 업데이트 (원본 직접 수정)
   - `_workspace/03_completion_changelog.md`에 변경 내역 요약 저장

### Phase 5: 정리

1. 팀원들에게 종료 요청 (SendMessage)
2. `_workspace/` 보존 (중간 산출물은 삭제하지 않음)
3. 사용자에게 결과 보고:
   - 수정된 섹션 목록
   - 추가된 참고문헌 수
   - Critical 갭 해소 여부
   - 남아있는 사용자 확인 필요 사항 ([미확인] 논문 등)

## 에러 핸들링

| 에러 유형 | 대응 |
|----------|------|
| 논문 파일 읽기 실패 | 사용자에게 경로 확인 요청 |
| structure-analyst 분석 실패 | 1회 재시도 후, 재실패 시 리더가 직접 간략 분석 수행 |
| lit-researcher WebSearch 실패 | 기존 참고문헌 기반으로만 보강, 보고서에 "[WebSearch 불가]" 명시 |
| argument-builder 톤 불일치 | 리더가 통합 편집 시 톤 조정 |
| 팀원 간 상충 제안 | 리더가 판단하여 하나를 선택, changelog에 선택 근거 기록 |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 "논문 완성해줘" + 논문 파일 경로 제공
2. Phase 1~5 정상 수행
3. 논문에 보강 텍스트 삽입, 참고문헌 추가, 논리 흐름 개선
4. 사용자에게 변경 내역 보고

### 에러 흐름
1. 사용자가 논문 경로 없이 "논문 완성해줘" 입력
2. 작업 디렉토리에서 논문 파일 자동 탐색
3. 후보가 여러 개이면 사용자에게 선택 요청
4. 이후 정상 흐름 진행
