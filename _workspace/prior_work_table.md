# Prior Work Extraction Table

생성일: 2026-04-07
대상 폴더: 선행연구/

## A Study of In-Context-Learning-Based Text-to-SQL Errors (MapleRepair)

| 필드 | 내용 |
|---|---|
| `problem` | ICL 기반 Text-to-SQL 기법이 만들어내는 오류들이 널리 존재(37.3%)하나 기존 repair 기법은 교정률이 낮고(10.9~23.3%) 오히려 새 오류를 다수 주입(5.3~40.1%)하며 연산 오버헤드(1.03~3.82×)가 크다. 체계적 오류 taxonomy와 저오버헤드 탐지·수리 프레임워크가 부재하다. |
| `method` | (1) 4개 ICL 기법(MAC-SQL, DIN-SQL, CHESS, DEA-SQL) × 2개 LLM(GPT-3.5/4o) × 2개 벤치마크(Spider, Bird)로 4602개 오답 SQL을 수집·카드소팅(840 person-hour)하여 2계층 29유형 taxonomy 구축. (2) MapleRepair: 증상 기반 규칙 탐지 → 규칙 기반 편집 우선 → 실패 시 오류 설명·DB 정보·수리 지침을 LLM에 제공해 재생성하는 5컴포넌트 프레임워크. 각 컴포넌트는 특정 유형 집합을 담당. |
| `error_taxonomy` | **있음 (대표적·정밀)**: 2계층 29유형 7대범주 — Syntax Error(함수 환각/따옴표 누락/기타 구문 위반), Schema Error(테이블-컬럼 불일치/존재하지 않는 스키마/사용되지 않은 alias/모호 참조), Logic Error(암묵적 타입 변환/=대신 IN/NULL 정렬), Convention Error(집계·비교 오용/값 사양 위반/무관 컬럼 비교), Semantic Error(잘못된 COUNT/하위쿼리 범위 불일치/ORDER-BY 오류 등), Not an Error(Gold Error/Output Format 등), Others(§3.2). |
| `validation` | 규칙 기반 증상 탐지(symptom-guided rule-based) + 실행 검증 + 실패 시 LLM 재생성. 자가 검토(self-refine) 대비 저오버헤드를 명시적으로 추구. 의미 검증은 규칙과 실행 결과 비교 중심이며 LLM 재검토는 최후 수단. |
| `benchmark` | Spider, Bird dev. 베이스라인: MAC-SQL, DIN-SQL, CHESS, DEA-SQL의 기본 repair 모듈. 결과: SOTA 대비 13.8% 더 많이 수리, mis-repair 84.9% 감소, 오버헤드 67.4% 감소. EM은 Bird 기반 실행 매치 사용. |
| `limitations` | 저자 명시: 규칙 기반 설계라 taxonomy에 포함되지 않은 새로운 오류 유형은 놓칠 수 있음; DBMS(SQLite) 특정 동작에 의존. (관찰: taxonomy가 수동 라벨링·영어 질문·2개 벤치마크에 편향; HR 스키마 등 실무 도메인 검증 없음; 타입별 프롬프트 주입은 "유형→규칙 매핑"에 그치고 유형별 LLM 프롬프트 변주는 제한적). |

## MAGIC: Generating Self-Correction Guideline for In-Context Text-to-SQL

| 필드 | 내용 |
|---|---|
| `problem` | 기존 ICL Text-to-SQL의 자가교정(self-correction) 가이드라인이 인간 전문가가 수작업으로 작성되어 노동집약적이고 사람이 식별 가능한 오류 패턴에만 제한된다. 이를 자동 생성하는 방법이 부재했다. |
| `method` | 3개 LLM 에이전트(Manager, Feedback, Correction) 협업 프레임워크. (1) 초기 DIN-SQL의 실패 SQL 수집; (2) Manager가 feedback-correction 사이클 구동: Feedback 에이전트가 gold와 incorrect SQL을 비교해 실패 원인 설명, Correction 에이전트가 피드백 기반으로 revised SQL 생성, SQL executor로 실행 결과 검증; (3) 성공 피드백을 메모리에 누적해 10개 배치 단위로 self-correction guideline을 반복 갱신; (4) 추론 시 DIN-SQL 등 기존 시스템에 해당 guideline을 주입. |
| `error_taxonomy` | **없음 (암묵적)** — 명시적 계층형 오류 taxonomy를 정의하지 않음. 대신 생성된 guideline 안에 "Limit Clause Omission", "Aggregation within Aggregation" 등 자연어 항목이 열거되며, 이는 학습 데이터 실패 사례에서 귀납적으로 추출된 것. |
| `validation` | SQL executor를 통한 실행 결과 일치 검증(ground-truth와 결과 매칭). Manager 에이전트가 stopping criterion 제어. 의미 검증은 gold SQL 존재를 전제로 하며(NLI, back-translation 등은 없음), 사전 피드백 축적 구조가 유일한 반복 교정 루프. |
| `benchmark` | BIRD dev, Spider dev. 베이스라인: DIN-SQL(초기값 56.52 EX on BIRD), MAC-SQL refiner, Self-Debugging, Self-Consistency, Multi-Prompt, 인간 작성 guideline. 결과: DIN-SQL + MAGIC G → BIRD EX 59.13 (vs 인간 guideline 57.76), Spider EX 85.66 (vs 인간 81.15), MAC-SQL + MAGIC G → BIRD EX 61.92. |
| `limitations` | 저자 명시: guideline 생성에 gold SQL 훈련셋 필요(오라클 의존); non-executable SQL 시나리오에서는 샘플 부족(46개)으로 개선 미미; 적용 대상 SQL이 모두 교정되면 정답도 망칠 위험이 있어 오라클 없는 full-apply 시 성능 저하. (관찰: guideline이 단일 자연어 블록이라 clause별 정밀 주입/유형별 분기 없음; 반복 루프가 guideline 생성 단계에만 존재하고 추론 단계는 1회 적용 중심). |

## SQLFixAgent: Consistency-Enhanced Multi-Agent Collaboration

| 필드 | 내용 |
|---|---|
| `problem` | Fine-tuned LLM은 구문적으로 유효한 SQL은 잘 만들지만 의미적으로 사용자 질의와 일치하지 않는 SQL을 흔히 생성한다. 의미 오류는 실행 시 정상 결과를 반환해 탐지가 어렵다. |
| `method` | 3개 에이전트 프레임워크: (1) SQLReviewer — "rubber duck debugging" 기법으로 SQL을 clause별(FROM/JOIN, SELECT, WHERE, ORDER BY 등) 단계적으로 사용자 쿼리 의도와 대조해 semantic mismatch 탐지; (2) QueryCrafter — 사용자 질의를 n개의 동의 변형(query variants)로 확장한 뒤 SQLTool(fine-tuned CodeS)로 다수 candidate SQL 생성; (3) SQLRefiner — training set 유사 repair 예시 retrieval + failure memory reflection(Reflexion)으로 최적 candidate 선택·실행 확인, 실패 시 재시도 루프(최대 3회). |
| `error_taxonomy` | **없음 (이분적 구분만)** — "syntax error"와 "semantic error" 두 유형만 구별할 뿐 세부 계층이나 유형 목록 없음. Figure 1에서 2유형 예시를 제시. |
| `validation` | (1) DB 연결을 통한 실행 단계 구문 검증, (2) Rubber Duck Debugging(clause-by-clause LLM reasoning, §Method)로 의미 검증, (3) 유사 repair retrieval + failure memory 기반 Reflexion 반복 교정, (4) 실행 후 pass/non-empty 체크. |
| `benchmark` | BIRD dev, Spider dev/test, Spider-Syn/Realistic/DK. Backbone: fine-tuned CodeS-3B/7B를 SQLTool, GPT-3.5-turbo를 agent. 결과: CodeS-7B+SQLFixAgent → BIRD EX 60.17(+3.00), CodeS-3B → 58.67(+3.65); Spider-DK +2.2. 탐지 F1 ≈ 73.7, 수리 성공률 15.6~17.5%. |
| `limitations` | 저자 명시: GPT-3.5-turbo의 성능 한계로 repair 성공률이 15~17%에 그침; 초기 runtime error record(학습셋 기반)에 의존하므로 실시간 확장이 제한됨. (관찰: 오류 taxonomy 부재로 "왜 틀렸는가"를 유형 단위로 설명하지 못함; clause-wise CoT는 있으나 유형별 프롬프트 분기 없음; 반복 루프는 최대 3회로 제한). |

## SQL-of-Thought: Multi-agentic Text-to-SQL with Guided Error Correction

| 필드 | 내용 |
|---|---|
| `problem` | 기존 NL2SQL 시스템의 오류 교정은 실행 기반 피드백이나 정적 재생성에 의존하기 때문에, 구문적으로 유효하지만 논리적으로 틀린 SQL을 고치지 못한다. 다중 에이전트와 reasoning 기반 접근을 결합하면서 "구조화된 해석 가능한 교정"이 필요하다. |
| `method` | 6개 에이전트 파이프라인: (1) Schema Linking Agent — 관련 테이블/컬럼·FK/PK 추출; (2) Subproblem Agent — clause-level(JOIN, WHERE, GROUP BY 등) 서브문제로 분해; (3) Query Plan Agent — CoT로 절차적 query plan 생성(SQL 금지); (4) SQL Agent — plan 기반 SQL 생성·실행; (5) Correction Plan Agent — 실패 시 error taxonomy + 실행 오류 + 질문·스키마를 보고 CoT 교정 계획 수립; (6) Correction SQL Agent — 교정 계획을 SQL로 변환, 최대 반복까지 재진입. |
| `error_taxonomy` | **있음 (Shen et al. 2025=MapleRepair 논문에서 파생)**: 9개 범주 × 31개 하위 유형 — Syntax(sql_syntax_error, invalid_alias), Schema Link(table_missing, col_missing, ambiguous_col, incorrect_foreign_key, extra_table, incorrect_col), Join(join_missing, join_wrong_type), Filter(where_missing, condition_wrong_col, condition_type_mismatch), Aggregation(agg_no_groupby, groupby_missing_col, having_without_groupby, having_incorrect, having_vs_where), Value(hardcoded_value, value_format_wrong), Subquery(unused_subquery, subquery_missing, subquery_correlation_error), Set Operations(union/intersect/except_missing), Other Issues(order_by_missing, limit_missing, duplicate_select, unsupported_function, extra_values_selected). |
| `validation` | 실행 기반 검증 + taxonomy-guided CoT 교정 루프. "execution-only feedback은 논리적 오류에 불충분"함을 주장하고 taxonomy 주입으로 reasoning guidance 제공. NLI나 back-translation은 없음. |
| `benchmark` | Spider dev, Spider-Realistic, Spider-SYN. BIRD는 "annotation error 많음"을 이유로 제외(Shen 인용). 결과: Claude Opus 3 기준 Spider EX 91.59, Spider-Realistic 90.16, Spider-SYN 82.01로 SOTA. Ablation: correction loop 제거 시 8-10% 하락, query plan 제거 시 5% 하락(100 샘플). 1 run 비용 ≈ $42.58. |
| `limitations` | 저자 명시: Spider 계열만 평가(실제 DB 일반화 검증 부족); taxonomy가 다양한 쿼리 구조에 대해 exhaustive 검증되지 않음; closed-source reasoning LLM에 비용 의존. (관찰: taxonomy는 MapleRepair에서 차용한 것이라 범주는 있지만 각 유형별 "프롬프트 주입" 설계는 명시되지 않고 단일 CoT 프롬프트에 모두 전달; 반복 교정 루프는 존재하나 "유형-특화 프롬프트" 분기는 없음; Shared scratchpad 사용은 ablation에서 실패 사례로 언급). |

## BIRD: BIg Bench for LaRge-scale Database Grounded Text-to-SQL

| 필드 | 내용 |
|---|---|
| `problem` | 기존 Text-to-SQL 벤치마크(Spider, WikiSQL)는 schema만 다루고 노이즈가 있는 대규모 DB 값, 외부 지식, 실행 효율을 반영하지 못해 실세계와 괴리가 크다. |
| `method` | 12,751개 text-SQL pair, 95개 DB(33.4GB), 37개 전문 도메인을 수록한 대규모 벤치마크 구축. 특징: (i) 노이즈·dirty 값 포함 실제 DB, (ii) 외부 지식(evidence) 필드로 도메인 지식·동의어·값 설명 제공, (iii) Valid Efficiency Score(VES) 신규 메트릭 도입으로 실행 효율 평가. Fine-tuning(T5)과 ICL(GPT-3.5/Claude-2/GPT-4) 양측 평가. |
| `error_taxonomy` | **없음** — 벤치마크 논문이라 교정 관점 taxonomy 없음. 난이도(simple/moderate/challenging) 레벨만 구분. |
| `validation` | Execution Accuracy (EX) + Valid Efficiency Score (VES, BIRD 신규). 교정 메커니즘은 제안하지 않음. |
| `benchmark` | 본 논문이 벤치마크. 베이스라인 결과: GPT-4 54.89%(EX) vs 인간 92.96%. T5-3B 24.05%. |
| `limitations` | 저자 명시: GPT-4도 여전히 인간 대비 40% 격차; 대규모 DB·외부 지식 관련 문제가 미해결. (관찰: 이후 SQLDriller 등이 BIRD 학습셋 오류율 54%를 보고할 만큼 annotation 품질 이슈 존재; SQL-of-Thought는 이를 이유로 평가에서 BIRD 제외; 본 논문 자체는 방법론/교정 연구가 아님 — OUT_OF_SCOPE(방법론 관점) 이지만 벤치마크·한계 기록을 위해 유지). |

## DIN-SQL: Decomposed In-Context Learning of Text-to-SQL with Self-Correction

| 필드 | 내용 |
|---|---|
| `problem` | GPT-4 등 LLM의 few-shot NL→SQL 성능은 fine-tuned 모델에 뒤지며, 특히 schema linking·JOIN·nesting 등 복잡 쿼리에서 실패가 집중된다. task decomposition으로 격차를 좁힐 수 있는가. |
| `method` | 4개 모듈 few-shot 프롬프트 파이프라인: (1) Schema Linking 모듈 — CoT 기반으로 질문 내 컬럼/테이블/값 매칭; (2) Classification & Decomposition — 쿼리를 easy / non-nested complex / nested complex 3클래스로 분류, join 대상·sub-query 식별; (3) SQL Generation — 클래스별 다른 프롬프트(non-nested는 NatSQL 중간표현, nested는 sub-question 포함); (4) Self-Correction 모듈 — zero-shot으로 "generic"(CodeX) 또는 "gentle"(GPT-4) 프롬프트로 잠재적 버그 재검사·수정. |
| `error_taxonomy` | **암묵적 (6유형 실패 분석)** — few-shot 실패 500개를 (schema linking, JOIN, GROUP BY, nesting/set, invalid SQL, miscellaneous) 6개 비공식 범주로 분류. 본격적 taxonomy 설계는 아니나 방법론적 동기부여로 사용. |
| `validation` | Self-Correction 모듈: generic prompt(= "BUGGY SQL을 고쳐라") 또는 gentle prompt(잠재 이슈 체크 힌트 제공). 모두 zero-shot 1회 단발, 실행 검증이나 반복 루프 없음. |
| `benchmark` | Spider dev/test, BIRD dev/test. 결과: Spider test EX 85.3(GPT-4), BIRD test EX 55.9(신 SOTA 당시), BIRD dev EX 50.72, VES 58.79. |
| `limitations` | 저자 명시: self-correction이 CodeX와 GPT-4에 서로 다른 프롬프트가 최적이라 일반화 어려움; BIRD에서는 context 크기 제약으로 예시 수 감소. (관찰: taxonomy 부재 — 유형별 프롬프트 분기가 없음; self-correction은 1회·전역 프롬프트라 반복 교정 루프 없음; 실행 피드백도 이용하지 않음; 후속 연구(MAGIC, SQLens 등)가 모두 DIN-SQL의 self-correction을 약점으로 지목). |

## CHESS: Contextual Harnessing for Efficient SQL Synthesis

| 필드 | 내용 |
|---|---|
| `problem` | 대규모 DB(수천 컬럼)·노이즈 값·스키마 모호성·자연어 모호성이 결합되면 LLM의 text-to-SQL 성능이 급격히 떨어진다. 검증 메커니즘 부재로 신뢰성도 낮다. |
| `method` | 4개 에이전트 multi-agent 프레임워크: (1) Information Retriever(IR) — LSH 기반 값 검색 + 벡터DB 기반 카탈로그 검색으로 엔티티/컨텍스트 추출; (2) Schema Selector(SS) — filter_column, select_tables, select_columns 툴로 4000+ 컬럼 스키마 프루닝; (3) Candidate Generator(CG) — 질문·스키마·컨텍스트로 1~20개 candidate 생성, 실행 결과 기반 revise 루프(최대 N회); (4) Unit Tester(UT) — LLM이 NL 기반 unit test k개 생성 후 candidate별 통과 점수로 최종 선택. 배치에 따라 에이전트 조합 가변(IR+CG+UT, IR+SS+CG). |
| `error_taxonomy` | **없음** — 명시적 오류 taxonomy 없음. "faulty query" 정의는 syntax error 또는 empty result에 국한. |
| `validation` | (1) 실행 검증(syntax·빈 결과 탐지) → revise 루프; (2) **자연어 Unit Test 생성·평가** (UT 에이전트) — LLM이 "정답만 통과"할 수 있는 k개 NL unit test를 만들고 candidate별 통과 점수를 부여. 이 unit test 검증이 CHESS의 독자적 기여. NLI/back-translation은 없음. |
| `benchmark` | BIRD dev/test, Spider test, Synthetic industrial-scale(최대 4337 컬럼). 결과: BIRD test EX 71.10(Gemini-1.5-pro, CHASE-SQL 대비 83% 적은 LLM 호출), Spider test EX 87.2, open-source 모델 기준 SOTA. SS 적용 시 대형 스키마에서 +2% 및 토큰 5× 감소. |
| `limitations` | 저자 명시: 작은 스키마에서는 SS 에이전트가 precision/recall 트레이드오프로 정확도를 낮출 수 있음; 고예산 설정에서는 CHASE-SQL(fine-tuned selector)에 소폭 뒤짐. (관찰: 오류 유형 분류가 없어 "왜 틀렸는가"에 대한 해석이 실행 결과에만 의존; unit test는 후보 선택 용도이지 "유형별 교정"은 아님; 반복 교정 루프(CG의 revise)는 있으나 유형 구분 없이 동일 프롬프트). |

## SQLDriller: Automated Validating and Fixing Text-to-SQL with Execution Consistency

| 필드 | 내용 |
|---|---|
| `problem` | Spider(36.6%)와 BIRD(54.4%) 학습셋에 상당한 비율의 잘못된 NL→SQL 매핑이 존재한다. 이는 모델 학습과 평가를 동시에 오염시키며, 기존 연구는 데이터셋 품질 자체를 다루지 않는다. |
| `method` | (1) **Execution Consistency** 조건 정의: 주어진 DB 인스턴스에서 NL 쿼리의 "실행 결과"가 SQL의 실행 결과와 일치해야 함(필요조건). (2) 베이스 Text-to-SQL 모델로 다수 candidate SQL 생성; (3) SQL Equivalence Checker(SMT solver 기반)가 비동치 candidate 쌍을 구분할 counterexample DB 인스턴스 생성; (4) counterexample 위에서 LLM이 NL 쿼리를 "실행"해 결과 비교 → 불일치 시 오류 mapping 플래그·수정 제안; (5) 모델 추론 시 다중 SQL 예측 후 execution consistency 만족 개수로 최적 SQL 선택. |
| `error_taxonomy` | **암묵적** — 명시적 체계는 없으나 SQL 난이도별(easy/medium/hard/extra) 오류율과 "incorrect JOIN type, missing predicate, wrong aggregation" 등 케이스 분석을 제공. |
| `validation` | (1) SQL 동치성 검증(SMT solver로 first-order logic 등가 판단), (2) counterexample DB instance 생성, (3) LLM의 NL "실행" 결과와 SQL 실행 결과 비교(일종의 NL reasoning-based semantic validation), (4) 다중 candidate 중 best-fit 선택. 실행 피드백과 의미 검증이 결합된 독특한 구조. |
| `benchmark` | Spider/BIRD train 500 샘플 오류율 수동 검증(36.6%/54.4%). 6개 top-ranking 모델(DAIL-SQL, DIN-SQL, RESDSQL, Graphix-T5, CodeS-3B/7B)에 적용하여 최대 +13.6% 정확도 향상. 재평가 정확도는 DAIL-SQL Spider test 83.7→61.8 등 모델 평가 재보정. |
| `limitations` | 저자 명시: SQL candidate set에 정답이 없으면 false negative 발생; LLM의 NL execution 부정확성으로 false positive 가능; SMT solver 범위 한계. (관찰: 데이터셋 품질 개선이 주목적이라 "실시간 inference-time 교정"은 부차적; 유형별 프롬프트 주입·오류 분류 체계 없음; HR 등 실무 도메인 DB에 대한 검증은 없음). |

## SQLens: End-to-End Framework for Error Detection and Correction in Text-to-SQL

| 필드 | 내용 |
|---|---|
| `problem` | LLM 기반 text-to-SQL이 의미적으로 틀렸으나 구문상 유효한 쿼리를 생성하는 문제가 지속된다. 기존 방법은 (i) 이진 correctness 분류만 하거나, (ii) self-reflection의 self-preference bias로 recall이 낮고, (iii) clause 단위 설명 없이 단일 confidence만 제공해 디버깅이 어렵다. |
| `method` | 4컴포넌트 end-to-end 프레임워크: (1) Error Detector — SQL AST를 파싱해 **DB 기반 신호**(Sub-optimal Join Tree, Incorrect Join Predicate, Empty Predicate, Value/Column/Table Ambiguity 등)와 **LLM 기반 신호**(Evidence Violation, Incorrect Question Clause Linking, Unnecessary Subquery, Incorrect GROUP BY, Incorrect Filter in Subquery, Insufficient Evidence) 수집, Snorkel 기반 weak supervision(LabelModel)으로 probabilistic label 학습·classifier 훈련; (2) Error Selector — ranked error list에서 가장 중요한 오류 선택; (3) Error Fixer — clause 단위 error report(signal description/instruction/problematic clauses/confidence) 주입해 한 번에 하나씩 교정, 최대 3회 반복; (4) SQL Auditor — 원본과 revised 쿼리 중 더 나은 것 선택(guardrail signal로 over-correction 방지). |
| `error_taxonomy` | **있음 (신호-기반 세분 유형)** — 명시적 계층: (A) Question Ambiguity(Insufficient Evidence, Incorrect Question Clause Linking), (B) Data Ambiguity(Value/Column/Table similarity), (C) Semantic Misalignment(Evidence Violation, Abnormal Result, Empty Predicate, Incorrect Join Predicate, Incorrect GROUP BY, Incorrect Filter in Subquery, Unnecessary Subquery, Suboptimal Join Tree). 총 3범주·11+ 신호. Figure 3의 causal graph로 "신호 ↔ 오류 유형" 대응 명시. |
| `validation` | (1) **DB 기반 검증 신호**(query plan 분석, 메타데이터 확인, 휴리스틱), (2) **LLM 기반 의미 검증**(clause와 evidence 대조, reasoning process 분석), (3) **Weak supervision aggregation**(Snorkel LabelModel)으로 다수 noisy signal 결합, (4) clause-level error report로 iterative correction, (5) SQL Auditor로 final selection. 실행 검증·LLM self-reflection·NL-based semantic check가 모두 결합된 가장 포괄적 구조. |
| `benchmark` | BIRD dev, Spider dev. 베이스 생성기: Vanilla, DIN-SQL, MAC-SQL, CHESS(backbone Claude 3.5 Sonnet). 결과: DIN-SQL + SQLens → BIRD EX +20.5%p; MAC-SQL +5.19%p(60.04→65.23, SOTA), CHESS 67.91→69.74; 의미오류 탐지 F1 LLM self-eval 대비 +25.78. MAGIC(+2.61), Self-Debug(+0.72), SQLFixAgent(+3.00) 대비 최고. |
| `limitations` | 저자 명시: weak supervision은 gold label 없이 정확도가 supervised 대비 약간 낮음; 고정밀 guardrail signal이 필요(precision/recall trade-off); 최대 3회 반복으로 제한. (관찰: 교정 프롬프트는 clause-level 정보를 담지만 "유형별 전용 프롬프트"라기보다는 "유형별 error report를 일반 fixer에 주입"하는 구조; evidence(외부 지식) 필드가 있는 BIRD에 강하게 의존 — HR 등 evidence 없는 도메인 적용 시 LLM 신호 상당수 약화될 가능성; Figure 3 taxonomy는 MapleRepair/SQL-of-Thought 대비 추상 계층 얕음). |

## 메타

- 스캔 PDF 수: 9
- 성공: 9
- 실패: 없음
- 추출 방식: 각 PDF를 pdftotext -layout 으로 텍스트 변환 후 Introduction/Method/Experiment/Limitation 섹션 정독
- 주의: BIRD 는 벤치마크 논문이므로 교정 방법론 관점에서는 OUT_OF_SCOPE 플래그가 적절하나 후속 gap 분석의 평가 인프라 이해를 위해 항목을 유지함
- 핵심 관찰(후속 gap-analyzer 힌트):
  - 오류 taxonomy 보유: MapleRepair(29유형/7범주, 가장 정밀), SQL-of-Thought(9범주/31유형, MapleRepair 재사용), SQLens(3범주/11+ 신호, 인과 그래프), DIN-SQL(암묵적 6유형)
  - 의미 검증 메커니즘 다양성: CHESS(NL unit test), SQLDriller(SMT 기반 동치성 + LLM NL execution), SQLFixAgent(rubber duck debugging clause-wise), SQLens(weak supervision 다중 신호 집계), MAGIC(guideline 주입·executor)
  - 유형별 프롬프트 주입: 명시적으로 "오류 유형 → 전용 프롬프트"를 매핑한 연구는 없음. MapleRepair는 "유형 → 규칙/LLM hint", SQL-of-Thought는 "taxonomy 전체를 단일 CoT 프롬프트에 주입", SQLens는 "신호별 error report를 동일 fixer에 주입"하는 수준
  - 반복 교정 루프: CHESS(CG revise), SQLFixAgent(최대 3회), SQL-of-Thought(max attempts), SQLens(최대 3회), MAGIC(추론은 단회), DIN-SQL(단회)
  - HR 스키마 같은 도메인 특화 실무 DB 검증은 전 논문 모두 부재 — 포지셔닝 여지
