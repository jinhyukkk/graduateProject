---
name: improve-abstract
description: Text-to-SQL 자기교정 논문의 초록을 선행연구 정밀 대조 기반으로 개선하는 오케스트레이터. 선행연구 추출 → gap 분석 → 포지셔닝 자동 선택 → 초록 재작성의 4단계 파이프라인을 자동 실행. '초록 개선', '논문 방향 재검토', '선행연구 대조' 요청 시 반드시 사용. HR 스키마-온리 실험 제약 포함.
---

# Improve Abstract (Orchestrator)

선행연구 폴더와 현재 초록을 입력으로, 진짜 research gap을 도출하고 초록을 재작성하는 **1회성 파이프라인 오케스트레이터**.

## 언제 사용하는가

- Text-to-SQL 자기교정 논문의 초록 방향이 의심스러울 때
- 선행연구를 뒤늦게 추가했는데 기존 초록이 그 연구들과 겹치는지 검증해야 할 때
- 초록 차별점을 재설계해야 할 때
- 사용자 요청 예시: "초록 개선해줘", "선행연구 대조해서 초록 다시 써줘", "논문 방향 재검토해줘"

## 입력과 출력

**입력:**
- `선행연구/` 폴더의 PDF들 (필수)
- `초록_KITS.md` (필수)

**산출물 (모두 `_workspace/` 하위):**
- `_workspace/prior_work_table.md` (중간)
- `_workspace/gap_matrix.md` (중간)
- `_workspace/positioning_decision.md` (중간)
- `_workspace/abstract_v2.md` (**최종 사용자 산출물**)

**원본 `초록_KITS.md` 는 절대 건드리지 않는다.** 최종 병합은 사용자가 수동으로.

## 실행 모드

**서브 에이전트 모드 (파이프라인)**. 각 단계가 이전 단계 파일에 엄격히 의존하므로 팀 모드의 실시간 조율이 불필요. 단계 간 파일 전달로 충분.

## 파이프라인

```
선행연구/*.pdf           초록_KITS.md
      │                      │
      ▼                      │
┌──────────────────┐         │
│ Stage 1          │         │
│ prior-work-      │         │
│  extractor       │         │
│ (extract-prior-  │         │
│  work skill)     │         │
└──────┬───────────┘         │
       │                     │
       ▼                     │
prior_work_table.md ─────────┤
                             │
      ┌──────────────────────┘
      │
      ▼
┌──────────────────┐
│ Stage 2          │
│ gap-analyzer     │
│ (contribution-   │
│  diff skill)     │
└──────┬───────────┘
       │
       ▼
 gap_matrix.md
       │
       ▼
┌──────────────────┐
│ Stage 3          │
│ positioning-     │
│  advisor         │
│ (research-       │
│  positioning)    │
└──────┬───────────┘
       │
       ▼
positioning_decision.md
       │
       ▼
┌──────────────────┐
│ Stage 4          │
│ abstract-        │
│  rewriter        │
│ (abstract-       │
│  refine skill)   │
└──────┬───────────┘
       │
       ▼
 abstract_v2.md  ◀── 최종
```

## 단계별 실행 프로토콜

### 사전 준비
1. `_workspace/` 디렉토리가 없으면 생성
2. `선행연구/` 폴더 존재 확인. 없으면 중단하고 사용자에게 고지
3. `초록_KITS.md` 존재 확인. 없으면 중단

### Stage 1: Prior Work Extraction

`Agent` 도구로 `prior-work-extractor` 호출:

```
subagent_type: "general-purpose"
model: "opus"
description: "Extract prior work table"
prompt: |
  당신은 prior-work-extractor 에이전트다. 먼저
  .claude/agents/prior-work-extractor.md 를 읽어 역할과 원칙을 숙지하라.
  그 다음 .claude/skills/extract-prior-work/skill.md 를 읽어 작업 절차를
  따라라. 대상 폴더는 선행연구/ 이고, 출력은 _workspace/prior_work_table.md
  에 저장해야 한다.
```

완료 확인: `_workspace/prior_work_table.md` 존재 및 `NO_INPUT` 플래그 없음.

### Stage 2: Gap Analysis

`_workspace/prior_work_table.md` 에 `UPSTREAM_MISSING` 이나 `NO_INPUT` 이 있으면 중단.

`Agent` 도구로 `gap-analyzer` 호출:

```
subagent_type: "general-purpose"
model: "opus"
description: "Analyze research gaps"
prompt: |
  당신은 gap-analyzer 에이전트다.
  .claude/agents/gap-analyzer.md 와 .claude/skills/contribution-diff/skill.md
  를 읽고 지시대로 수행하라. 입력은 _workspace/prior_work_table.md 와
  초록_KITS.md. 출력은 _workspace/gap_matrix.md.
```

완료 확인: `_workspace/gap_matrix.md` 존재. `UPSTREAM_MISSING` 플래그 없음.

### Stage 3: Positioning Decision

`gap_matrix.md` 에 `NO_REAL_GAP` 가 있더라도 stage 3은 실행한다 (positioning-advisor가 `NEEDS_NEW_ANGLE` 을 반환하며 재검토 결론 생성).

`Agent` 도구로 `positioning-advisor` 호출:

```
subagent_type: "general-purpose"
model: "opus"
description: "Decide paper positioning"
prompt: |
  당신은 positioning-advisor 에이전트다.
  .claude/agents/positioning-advisor.md 와
  .claude/skills/research-positioning/skill.md 를 읽고 절차를 따라라.
  HR 인사관리 DB는 스키마 구조만 카피하여 실험에 사용한다는 제약을
  포지셔닝에 반드시 통합할 것. 사용자에게 되묻지 말고 자동으로 선택하라.
  입력: _workspace/gap_matrix.md
  출력: _workspace/positioning_decision.md
```

완료 확인: `_workspace/positioning_decision.md` 존재.

### Stage 4: Abstract Rewriting

`positioning_decision.md` 에 `NEEDS_EXPERIMENT_REDESIGN` 또는 `NEEDS_NEW_ANGLE` 플래그가 있으면 abstract-rewriter는 재작성을 보류하지만 여전히 호출한다(플래그를 그대로 전달하여 보고서 생성).

`Agent` 도구로 `abstract-rewriter` 호출:

```
subagent_type: "general-purpose"
model: "opus"
description: "Rewrite abstract"
prompt: |
  당신은 abstract-rewriter 에이전트다.
  .claude/agents/abstract-rewriter.md 와
  .claude/skills/abstract-refine/skill.md 를 읽고 따라라.
  원본 초록_KITS.md 는 절대 수정하지 말 것.
  HR 스키마-온리 실험 설계를 초록에 반드시 명시할 것.
  입력: _workspace/positioning_decision.md, _workspace/gap_matrix.md,
        _workspace/prior_work_table.md, 초록_KITS.md (읽기만)
  출력: _workspace/abstract_v2.md
```

완료 확인: `_workspace/abstract_v2.md` 존재.

### 최종 종합 보고

모든 단계 완료 후 사용자에게 간단 요약 출력:
1. 추출된 선행연구 개수
2. 도출된 진짜 gap 요약 (3개 이하)
3. 자동 선택된 포지셔닝 title + 한 줄 근거
4. `_workspace/abstract_v2.md` 경로 안내 + "원본은 보존되어 있으니 검토 후 수동 병합하세요" 문구

## 에러 핸들링

| 상황 | 처리 |
|---|---|
| `선행연구/` 없음 | 중단. 사용자 고지 |
| Stage 1 `NO_INPUT` | 중단. "PDF 접근 실패" 보고 |
| Stage 2 `UPSTREAM_MISSING` | 중단. Stage 1 실패 원인 보고 |
| Stage 2 `NO_REAL_GAP` | Stage 3 계속 진행 (재검토 결론 유도) |
| Stage 3 `NEEDS_EXPERIMENT_REDESIGN` | Stage 4는 보류 보고만 생성. 파이프라인은 정상 종료 |
| Stage 3 `NEEDS_NEW_ANGLE` | 동일 |
| 서브 에이전트 1회 실패 | 1회 재시도, 재실패 시 해당 단계 결과 없이 사용자에게 어떤 단계가 실패했는지 보고 |

각 단계 실패 시에도 중간 산출물은 `_workspace/` 에 보존하여 사후 검증 가능.

## 원칙

1. **1회성 워크플로우** — 이 오케스트레이터는 반복 실행을 전제하지 않는다. 한번 돌리고 끝내는 설계.
2. **자동 실행, 사용자 개입 최소화** — positioning 선택을 포함한 모든 판단을 에이전트가 수행. 사용자는 최종 결과만 확인.
3. **원본 보호** — `초록_KITS.md` 덮어쓰기 절대 금지. 최종 병합은 사람이 한다.
4. **파일 기반 감사 추적** — 모든 중간 산출물을 `_workspace/` 에 남겨 "왜 이렇게 재작성됐는가" 를 사후에 추적 가능하게 한다.

## 테스트 시나리오

**정상 흐름:**
- `선행연구/` 에 9편의 Text-to-SQL PDF + `초록_KITS.md` 존재
- 4단계 모두 성공
- `_workspace/abstract_v2.md` 에 재작성된 초록 + self-review 결과 포함
- 최종 보고가 "Y개 gap → 선택 포지셔닝 Z" 로 요약됨

**에러 흐름 1 — 모두 이미 존재:**
- Stage 2에서 모든 축이 1.0 으로 커버됨 → `NO_REAL_GAP`
- Stage 3가 `NEEDS_NEW_ANGLE` 결론 생성
- Stage 4는 "재검토 필요" 보고만 생성
- 사용자에게 "초록의 차별점을 다른 각도에서 재발굴 필요" 메시지

**에러 흐름 2 — PDF 텍스트 추출 실패:**
- Stage 1에서 일부 PDF `TEXT_EXTRACTION_FAILED`
- 나머지 논문으로 파이프라인 정상 진행
- 최종 보고에 "N편 중 M편만 분석됨" 명시
