---
name: complete-paper
description: 자기교정 Text-to-SQL 논문(KITS 제출)을 6인 팀(PM/연구자/엔지니어/분석가/집필자/검토자)으로 완성까지 오케스트레이션한다. 파이프라인 패턴으로 Phase별 에이전트 호출, HRDB 미준비 상태면 BIRD-only 경로 자동 선택, DATA NEEDED 플레이스홀더로 집필 병행. 논문 완성 전체 실행, 팀 조율, 파이프라인 오케스트레이션이 필요할 때 반드시 사용.
---

# Complete Paper — 6인 팀 논문 완성 오케스트레이터

자기교정 Text-to-SQL 논문을 KITS 제출본까지 완성하는 팀 오케스트레이터. 기존 [academic-paper](~/.claude/skills/academic-paper/SKILL.md)는 범용이지만, 본 스킬은 **본 프로젝트 특화 6인 팀**을 호출한다.

## 팀 구성 (프로젝트 특화)

| 에이전트 | 역할 | 주 산출물 |
|---------|------|----------|
| `paper-pm` | 기획자 | 일정·상태·리스크 |
| `paper-researcher` | 연구자 | 02_research_design.md, 포지셔닝·gap |
| `paper-engineer` | 엔지니어 | src/baselines/, outputs/logs/ |
| `paper-analyst` | 분석가 | 03_experiment_analysis.md, figures/ |
| `paper-writer-kr` | 집필자 | 04_paper_draft.md |
| `paper-reviewer-editor` | 검토자/편집자 | 07_paper_final.md |

모든 Agent 호출 시 `subagent_type`은 위 에이전트 이름, `model: "opus"` 필수.

## 실행 모드

**서브 에이전트 + 파이프라인**. 팀 통신(SendMessage) 대신 파일 기반 핸드오프. 이유: 박진혁(1인)이 수동으로 단계별 승인하며 진행하는 시나리오가 기본.

## 워크플로우

### Phase 0: 상태 진단

오케스트레이터가 `paper-pm`을 호출해 현재 상태 진단 및 경로 선택:

```
경로 A (HRDB 준비됨): 풀 파이프라인
경로 B (HRDB 미준비): BIRD-only + DATA NEEDED 집필 병행
```

HRDB 판정 기준:
- `data/raw/hrdb/hrdb.sqlite` 존재
- `data/raw/hrdb/dev.json` 최소 50 질의
둘 다 만족하면 A, 아니면 B.

### Phase 1: 연구 설계 확정

`paper-researcher` 호출 → `_workspace/02_research_design.md` 생성/갱신.

입력:
- `docs/초록.md`
- `_workspace/positioning_decision.md`, `gap_matrix.md`, `prior_work_table.md`
- `_workspace/01_lit_{theory,method,recent}.md`

PM에게 "포지셔닝·가설 확정" 확인 후 다음 Phase.

### Phase 2: 구현 (경로 분기)

**경로 A**:
1. `paper-engineer`: 베이스라인 래퍼(DAIL-SQL, MAC-SQL, Zero-shot) + HRDB 빌더 + evaluate.py 확장
2. 완료 후 BIRD + HRDB 실험 실행

**경로 B**:
1. `paper-engineer`: 베이스라인 래퍼 + Zero-shot만
2. BIRD 실험만 실행
3. HRDB 영역은 `[DATA NEEDED]` 유지

`implement-experiment` 스킬 사용.

### Phase 3: 실험 분석

`paper-analyst` 호출 → `_workspace/03_experiment_analysis.md` + `_workspace/figures/*.svg`.

`analyze-results` 스킬 사용.

경로 B: BIRD 결과만 분석, HRDB는 `[DATA NEEDED: HRDB {지표}]`.

### Phase 4: 집필

`paper-writer-kr` 호출 → `_workspace/04_paper_draft.md`.

`kits-draft` 스킬 사용.

입력: 02_research_design.md, 03_experiment_analysis.md, 01_lit_*.md, 05_KITS_submission_guidelines.md.

### Phase 5: 검토 + 편집

`paper-reviewer-editor` 호출:
1. 방법론·논리·형식 3관점 순차 검토 → `05_review_*.md` 3개 파일
2. 통합 수정 지시서 → `06_revision_guide.md`
3. `paper-writer-kr`에게 재작성 요청 (조건: Critical·Major 지적 반영)
4. 최종 편집 → `07_paper_final.md`

`paper-review` 스킬 사용.

### Phase 6: 제출 준비

`paper-pm`이 체크리스트 점검:
- [ ] `[DATA NEEDED]` 0건 (경로 A) / 명시적 제한사항 (경로 B)
- [ ] KITS 분량 규정 준수
- [ ] `references.bib` 프리프린트→최종 치환 완료
- [ ] 저자·소속·이메일 확인
- [ ] 초록과 본문 모순 없음

통과 시 사용자에게 "제출 가능" 보고.

## 데이터 흐름

```
docs/초록.md (불변)
    ↓
[P0] paper-pm → 경로 판정 (A/B)
    ↓
[P1] paper-researcher → 02_research_design.md
    ↓
[P2] paper-engineer → src/baselines/, outputs/logs/ (경로별 다름)
    ↓
[P3] paper-analyst → 03_experiment_analysis.md, figures/
    ↓
[P4] paper-writer-kr → 04_paper_draft.md
    ↓
[P5] paper-reviewer-editor → 05_review_*.md → 06_revision_guide.md
       → (재호출 paper-writer-kr) → 07_paper_final.md
    ↓
[P6] paper-pm → 제출 체크리스트
```

## 병렬 기회

경로 B에서 Phase 2(엔지니어) ∥ Phase 4-부분(집필자의 비실험 섹션)을 동시 실행 가능. 단, 집필자는 방법·결론만 쓰고 실험 섹션은 대기.

## 에러 핸들링

| 상황 | 대응 |
|------|------|
| 엔지니어 Phase 2 실패 | 실패 원인을 PM에 보고, 복구 가능하면 재시도 1회, 불가 시 경로 B로 전환 |
| 분석가 통계검정 미완 | 집필자에게 `[STATS NEEDED]` 태그로 진행 요청, 완료 후 재병합 |
| 검토자 3관점 중 1개 실패 | 나머지 2개로 편집 진행, 최종본에 누락 관점 명시 |
| 집필자 분량 초과 | 검토자 편집 단계에서 압축 (Introduction → Discussion 순) |
| 초록·본문 모순 | 검토자가 본문 수정, 초록은 절대 변경하지 않음 |
| HRDB가 Phase 2 중간에 준비됨 | 경로 B→A로 전환, 엔지니어 HRDB 빌더 추가 실행, 분석·집필 Phase 재실행 |

## 재실행 규칙

Phase 완료 산출물(`_workspace/0X_*.md`)이 이미 존재하면 덮어쓰지 않음. 갱신 요청 시 `_workspace/0X_*_v2.md`로 저장. 사용자가 명시 승인할 때만 원본 교체.

## 테스트 시나리오

### 정상 흐름 (경로 A)
1. 사용자: "논문 완성해줘, HRDB 준비됐어"
2. P0: PM이 경로 A 선택
3. P1: 연구자가 02_research_design.md 생성
4. P2: 엔지니어가 베이스라인 + HRDB 빌더 구현, BIRD+HRDB 실험 실행
5. P3: 분석가가 표·그림 생성
6. P4: 집필자가 초안 작성
7. P5: 검토자 3관점 → 편집 → 최종본
8. P6: PM 체크리스트 통과, 사용자 보고

### 에러 흐름 (경로 B)
1. 사용자: "논문 완성해줘" (HRDB 미준비)
2. P0: PM이 경로 B 선택
3. P1~P2: 연구자·엔지니어 BIRD-only 경로
4. P3: 분석가가 BIRD만 분석, HRDB는 `[DATA NEEDED]`
5. P4: 집필자가 초안 작성, HRDB 섹션은 플레이스홀더 유지
6. P5: 검토자가 `[DATA NEEDED]`의 위치와 영향 범위를 혁신 제한사항으로 토의 섹션에 명시하도록 지시
7. P6: PM이 "HRDB 완료 전 제출 불가 — 부분 완성" 보고
