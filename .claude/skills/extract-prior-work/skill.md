---
name: extract-prior-work
description: 선행연구 PDF 묶음에서 6필드(문제정의/방법/오류분류 체계/검증 메커니즘/벤치마크/한계) 구조화 추출을 수행. Text-to-SQL 자기교정 연구 비교표 생성이 필요하거나, 여러 논문을 동일 스키마로 정리해야 할 때 반드시 사용.
---

# Extract Prior Work

Text-to-SQL 자기교정 도메인의 선행연구를 6필드 스키마로 구조화 추출하여 후속 gap 분석의 연료를 만드는 스킬.

## 언제 사용하는가

- 여러 논문을 동일 기준으로 비교해야 할 때
- 후속 단계에서 "이 논문이 X를 다루었는가" 라는 이진 질문에 답해야 할 때
- 논문별 자유 서술 요약이 아닌, **파싱 가능한 표** 가 필요할 때

## 전제

- 대상 파일들은 보통 `선행연구/` 또는 사용자가 지정한 폴더 안의 `.pdf`
- Read tool로 PDF를 페이지 범위로 읽을 수 있다. 큰 PDF(>10p)는 반드시 `pages` 파라미터로 분할 읽기.

## 작업 절차

### 1. 대상 PDF 스캔
`Glob` 으로 `선행연구/**/*.pdf` 매칭. 각 파일의 제목(파일명)을 먼저 목록화.

### 2. 논문별 추출
각 PDF에 대해:

1. **첫 패스 — 메타 읽기**: 제목, 초록, Introduction 의 첫 1~2페이지 읽기. 목적/기여 파악.
2. **두 번째 패스 — Method 섹션**: 아키텍처/방법론 설명. 오류 분류 체계 존재 여부를 확인 (Figure/Table에 "error types", "taxonomy", "category" 등 키워드)
3. **세 번째 패스 — Experiment / Limitation**: 벤치마크·결과·저자가 명시한 한계

### 3. 6필드 스키마 채우기

각 논문마다 아래 표를 채운다:

```markdown
## {논문 제목}

| 필드 | 내용 |
|---|---|
| `problem` | ... |
| `method` | ... |
| `error_taxonomy` | ... |
| `validation` | ... |
| `benchmark` | ... |
| `limitations` | ... |
```

**필드별 작성 규칙:**

- `problem`: 1~2문장. 논문이 해결하려는 구체적 문제.
- `method`: 3~5문장. 핵심 컴포넌트 열거. (예: "① schema linking, ② few-shot prompt, ③ self-correction loop with execution feedback")
- `error_taxonomy`:
  - **있음** 인 경우: 계층 수, 유형 수, 주요 카테고리명. 예: "2계층 7유형: (구문: 4), (의미: 3)"
  - **없음**: "없음"
  - **암묵적**: "명시적 체계는 없으나 error classes 4종 언급" 같이 구분
- `validation`: 사용한 검증 기법을 **구체적 기법명** 으로. ("executable check", "self-refine w/ feedback", "NLI", "SQL→NL back-translation" 등)
- `benchmark`: 데이터셋 + 베이스라인 대비 주요 수치
- `limitations`: 저자 명시 한계 먼저, 그 다음 `(관찰: ...)` 로 추출자 관찰 한계

### 4. 출력 저장

파일: `_workspace/prior_work_table.md`

구조:
```markdown
# Prior Work Extraction Table

생성일: {날짜}
대상 폴더: {스캔한 경로}

## {논문1 제목}
... 6필드 표 ...

## {논문2 제목}
...

## 메타
- 스캔 PDF 수: N
- 성공: N
- 실패: [파일명 + 사유]
```

## 원칙

1. **근거 없는 필드 금지** — PDF에 없으면 "명시 없음". 추측으로 채우면 후속 gap 분석이 오염된다.
2. **원문 인용은 짧게** — 긴 인용은 토큰 낭비. 필요하면 "(§3.2)" 처럼 섹션 포인터만.
3. **섹션 제목과 표 컬럼명 불변** — 후속 `contribution-diff` 스킬이 이 구조를 파싱한다. 제목 변경 금지.

## 에러 핸들링

- PDF 텍스트 추출 실패: 해당 논문 섹션에 `TEXT_EXTRACTION_FAILED` 플래그만 남기고 다음 논문으로.
- 도메인 밖 논문: `OUT_OF_SCOPE` 플래그 + 제목/초록 요약만 기록.
- 전체 폴더가 비었거나 접근 불가: `_workspace/prior_work_table.md` 에 `NO_INPUT` 만 남기고 종료.
