# Gap Matrix: SC-TSQL (초록_KITS.md) vs 선행연구/ (9편)

생성일: 2026-04-07
비교 축: `taxonomy` / `semantic_check` / `type_injection` / `iterative_loop`

## 1. 커버리지 매트릭스

| 논문 | taxonomy | semantic_check | type_injection | iterative_loop |
|---|---|---|---|---|
| MapleRepair | **1.0** — 2계층 29유형 7범주(Syntax/Schema/Logic/Convention/Semantic 등), 카드소팅 840h로 구축 | 0.5 — 증상기반 규칙+실행검증+LLM 재생성, NL 역번역·NLI 없음 | 0.5 — "유형→규칙/LLM hint" 매핑은 있으나 유형별 LLM 프롬프트 변주는 제한적(한계 기술) | 0.5 — 규칙 실패 시 LLM 재생성 단계가 있으나 "유형 진단 갱신 루프"는 아님 |
| MAGIC | 0 — 명시 taxonomy 없음, guideline 내부 자연어 항목만 | 0 — SQL executor 실행 일치만, gold SQL 오라클 의존, NLI/역번역 없음 | 0 — guideline은 단일 자연어 블록, 유형별 분기 없음 | 0.5 — feedback-correction 사이클은 guideline 생성 단계에 국한, 추론은 단회 |
| SQLFixAgent | 0 — syntax/semantic 2분 구분뿐, 계층·유형 목록 없음 | 0.5 — Rubber Duck Debugging clause-wise + Reflexion memory, NLI/역번역 없음 | 0 — clause-wise CoT는 있으나 감지 유형을 프롬프트 변수로 주입하지 않음 | 0.5 — 최대 3회 재시도, 유형 진단 갱신 루프는 아님 |
| SQL-of-Thought | **1.0** — 9범주 31유형(MapleRepair 파생), Correction Plan에 taxonomy 주입 | 0.5 — 실행 검증 + taxonomy-guided CoT, NLI/역번역 없음 | 0.5 — taxonomy 전체를 단일 CoT 프롬프트에 주입(유형별 전용 프롬프트 분기 없음) | **1.0** — Correction Plan → Correction SQL 루프가 max_attempts까지 taxonomy 기반 재진입 |
| BIRD | 0 — 벤치마크 논문, 교정 관점 OUT_OF_SCOPE | 0 — EX/VES 평가뿐 | 0 | 0 |
| DIN-SQL | 0.5 — 실패 500개를 6개 비공식 범주로 분류(암묵적), 정식 taxonomy 아님 | 0 — zero-shot generic/gentle 프롬프트 1회, 실행검증·NLI 없음 | 0 — 6유형을 프롬프트에 주입하지 않음, 전역 프롬프트 | 0 — self-correction 단발, 루프 없음 |
| CHESS | 0 — faulty query=syntax/empty result에 국한 | 0.5 — **NL Unit Test 에이전트**(LLM이 NL unit test 생성·통과 점수화), NLI/역번역은 아님 | 0 — 유형 분류 없으니 주입도 없음 | 0.5 — CG revise 루프는 있으나 유형 구분 없이 동일 프롬프트 |
| SQLDriller | 0 — 명시 taxonomy 없음(난이도·케이스 분석뿐) | 0.5 — SMT 동치성 + **LLM이 NL을 counterexample DB에서 "실행"해 비교** (reasoning-based semantic validation), 역번역+NLI와는 구조 다름 | 0 — 유형별 주입 없음 | 0 — 추론 시 다중 candidate 선택 중심, 유형 갱신 루프 없음 |
| SQLens | **1.0** — 3범주 11+ 신호(Question/Data Ambiguity, Semantic Misalignment) + causal graph | 0.5 — DB신호+LLM신호+Snorkel weak supervision, clause-level error report — 포괄적이나 **NL 역번역+NLI는 없음** | 0.5 — clause-level error report(signal description/instruction/problematic clauses/confidence)를 fixer에 주입하지만, "유형별 전용 프롬프트 템플릿"이 아닌 "유형별 리포트를 공용 fixer에 전달" | 0.5 — 최대 3회 반복, Error Selector가 다음 대상 갱신하나 "유형 진단 갱신 → 재교정" 표현은 느슨 |

축별 합계(참고):
- taxonomy: 1.0 보유 3편(MapleRepair, SQL-of-Thought, SQLens), 0.5 1편(DIN-SQL), 0 5편
- semantic_check: 1.0 **0편**, 0.5 6편(MapleRepair/SQLFixAgent/SQL-of-Thought/CHESS/SQLDriller/SQLens), 0 3편
- type_injection: 1.0 **0편**, 0.5 3편(MapleRepair/SQL-of-Thought/SQLens), 0 6편
- iterative_loop: 1.0 1편(SQL-of-Thought), 0.5 5편, 0 3편

## 2. 초록 주장 vs 실제 gap

### 주장 1: 오류 분류 체계 — "구문·의미·논리의 3계층 10유형으로 정리한 새로운 오류 분류 체계를 제안"
- **매핑 축**: `taxonomy`
- **선행연구 커버리지**: 9편 중 3편이 1.0(29유형/31유형/11+ 신호), 1편이 0.5. 3계층 구조까지 갖춘 연구도 이미 존재(MapleRepair의 범주→유형, SQLens의 범주→신호→유형).
- **판정**: **이미 존재**
- **이유**: 규모·세분도 모두 선행연구가 앞선다(29·31·11+). "구문/의미/논리 3계층 10유형"은 MapleRepair·SQL-of-Thought taxonomy의 축소판으로 보이며, 단순 크기로는 novelty 주장 불가. 단, "HR 도메인에 적합하도록 선별·재구성"이라는 실무 지향 각도로는 부분 gap 여지 있음(본 초록에는 해당 근거 미기술).

### 주장 2: 의미 검증 — "생성된 SQL을 자연어로 역번역한 뒤 원 질의와 NLI 기반으로 의도를 비교하는 이중 검증"
- **매핑 축**: `semantic_check`
- **선행연구 커버리지**: 9편 중 **1.0은 없음**. 0.5가 6편으로 다양한 대안 의미검증(Rubber Duck / NL Unit Test / SMT+NL execution / Snorkel weak supervision / guideline executor / rule+LLM)이 존재하나, **SQL→NL 역번역 후 NLI 모델로 원질의와 entailment 비교**하는 구조는 9편 모두에 없음.
- **판정**: **진짜 gap**
- **이유**: 가장 근접한 CHESS의 NL Unit Test도 "정답만 통과할 NL 테스트 생성 후 후보 선택" 용도이지 entailment 기반 의도 일치 판정이 아니다. SQLDriller의 "LLM NL execution"은 counterexample DB상 실행 결과 비교로, NLI와 구조가 다르다. SQLens도 DB+LLM 신호 집계이지 역번역+NLI가 아님.

### 주장 3: 유형별 프롬프트 주입 — "감지된 오류 유형과 진단 결과를 교정 프롬프트에 주입하여 후속 교정의 정밀도를 높인다"
- **매핑 축**: `type_injection`
- **선행연구 커버리지**: 9편 중 **1.0은 없음**. 0.5가 3편(MapleRepair=유형→규칙 매핑, SQL-of-Thought=taxonomy 전체를 단일 CoT에 일괄 주입, SQLens=유형별 리포트를 공용 fixer에 전달). "감지된 유형을 프롬프트 변수로 직접 주입하여 유형별 교정 전략을 분기"하는 구조는 없음(prior_work_table 관찰란에 3편 모두 명시).
- **판정**: **부분 gap**
- **이유**: 유형 정보가 교정 단계에 흘러들어가는 접근 자체는 이미 있으므로 "최초 제안"은 아니다. 그러나 "유형별 전용 프롬프트 템플릿" 분기 설계까지 내려간 연구는 없어, 이 축의 확장으로 포지셔닝 가능.

### 주장 4: 반복 교정 루프 — (명시 문장) "반복 교정 루프(어블레이션 대상)"
- **매핑 축**: `iterative_loop`
- **선행연구 커버리지**: 9편 중 1.0이 1편(SQL-of-Thought: taxonomy 기반 Correction Plan → SQL 재진입 루프). 0.5가 5편(단순 재시도, revise, Reflexion memory).
- **판정**: **이미 존재**
- **이유**: SQL-of-Thought가 이미 "유형 기반 교정 계획 갱신 → 재진입" 루프를 구현. 단순 반복 루프로는 차별화 불가. 단, **"의미검증(역번역+NLI) 실패를 트리거로 한 루프"**로 한정하면 주장 2와 결합해 novelty 획득 가능.

## 3. 진짜 Gap 목록

1. **SQL→NL 역번역 + NLI 기반 의도 일치 검증** — 생성 SQL을 자연어로 되돌린 뒤 원 질의와 entailment/contradiction으로 판정하는 의미검증은 9편 모두에 없다. *Implication*: 실행 기반/clause reasoning/unit test/SMT 등 기존 의미검증이 모두 "SQL 쪽"이나 "DB 실행 결과 쪽"에서 검사한 반면, 이 방식은 "자연어 의도 ↔ SQL 의도"를 **질의 자연어 공간에서 직접** 비교하므로 evidence(외부 지식)나 gold SQL 없이도 작동해 SQLens·MAGIC의 의존성을 완화한다. (진짜 gap)

2. **유형-특화 프롬프트 분기** — 감지된 오류 유형을 프롬프트 변수로 주입하여 **유형별 전용 교정 템플릿**으로 분기하는 구조는 어떤 선행도 구현하지 않았다(모두 "유형 정보를 공용 fixer에 전달"하는 수준). *Implication*: 유형별 failure mode가 다른 만큼(예: 스키마 링킹 vs GROUP BY 오류) 고정된 단일 교정 프롬프트보다 정밀도가 올라갈 개연성이 있고, 어블레이션으로 기여도를 분리 검증하기 쉬운 설계다. (부분 gap)

## 4. 초록에 포함된 추가 주장 (축 밖)

- **HR 도메인 적용 지향**: "향후 실제 기업 인사관리(HR) 도메인 데이터셋으로 확장하여 실 환경 적용 가능성 검증" — 9편 모두 Spider/BIRD에 국한되고 HR 같은 실무 도메인 DB 검증은 전무(prior_work_table 메타 관찰). 현재 초록에서는 "향후 계획"으로만 기술되어 본 초록 단계에서는 gap 판정 대상이 아니나, positioning-advisor가 실험 제약(HR 스키마-온리)과 결합해 활용할 여지가 크다.
- **DIN-SQL/DAIL-SQL/CHESS 공정 비교(동일 GPT-4o 백본)**: 평가 방법론상 기여로, 4축 비교 대상이 아님. 단, DAIL-SQL은 prior_work_table에 없으므로 선행연구 추출 범위 확장 필요(업스트림 한계).
