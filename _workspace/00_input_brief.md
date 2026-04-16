# 논문 작성 개요

- **주제**: NLI(자연어 추론) 기반 의도 일치 검증과 오류 유형별 교정 지시문을 결합한 자기교정 Text-to-SQL 프레임워크
- **제출 대상**: 한국IT서비스학회 (KITS)
- **언어**: 한국어
- **실험 데이터**: 아직 미수집 (outputs/logs/ · outputs/checkpoints/ 비어있음) → Phase 3는 `[DATA NEEDED]` 템플릿 모드
- **작성 범위**: 전체 논문 (서론 ~ 결론)

## 연구 질문

- **RQ1**: SQL→NL 역번역 후 NLI로 의미 일치를 판정하는 방식이, 기존 실행 기반 검증과 **별개로** 성능 향상에 기여하는가?
- **RQ2**: 진단된 오류 유형별로 **다른 교정 지시문**을 사용하는 것이, 단일 공용 지시문보다 정확한 교정을 이끌어내는가?

## 포지셔닝 (확정)

[_workspace/positioning_decision.md](positioning_decision.md) **옵션 A**: "NL-space Intent Consistency Checker" — SQL→NL 역번역 + NLI 기반 의미검증을 일차 차별점으로.

## 기존 재활용 자료

- [docs/초록.md](../docs/초록.md) — 학회 투고 초록 (확정본)
- [_workspace/prior_work_table.md](prior_work_table.md) — 선행연구 9편 6필드 구조화 추출
- [_workspace/gap_matrix.md](gap_matrix.md) — 4축 커버리지 매트릭스, semantic_check 축 gap=1.0
- [_workspace/positioning_decision.md](positioning_decision.md) — 옵션 A 선정 근거·리뷰어 방어 3종
- [_workspace/01_experiment_spec.md](01_experiment_spec.md) — 실험 설계 사양
- [_workspace/02_lit-researcher_references.md](02_lit-researcher_references.md) — 참고문헌 목록
- [_workspace/05_KITS_submission_guidelines.md](05_KITS_submission_guidelines.md) — 학회 규정 (일부 추정)

## 구현 코드

- [src/sc_tsql.py](../src/sc_tsql.py) — 자기교정 루프 오케스트레이터
- [src/semantic_verifier.py](../src/semantic_verifier.py) — NLI 의도 일치 검증기 (RQ1 핵심)
- [src/corrector.py](../src/corrector.py) — 오류 유형별 교정 지시문 라우팅 (RQ2 핵심)
- [src/schema_linker.py](../src/schema_linker.py) · [sql_generator.py](../src/sql_generator.py) · [execution_validator.py](../src/execution_validator.py)

## 실험 설계 제약 (반드시 준수)

- **HR DB는 스키마-온리**: 실데이터 미보유, 테이블 구조만 이식하고 row는 합성 생성.
- **베이스라인 재실행**: DAIL-SQL·MAC-SQL 인용 수치 사용 금지, GPT-4o로 동일 환경 재실행.
- **이중 검증**: BIRD dev → HRDB 스키마-온리 순 보고.
- **지표 원칙**: Execution Accuracy는 유지, Intent Consistency Score는 **추가** 지표로만 보고.

## Phase별 실행 전략

- **Phase 1 (문헌)**: 기존 `prior_work_table.md`·`02_lit-researcher_references.md`·`선행연구/` PDF를 기반으로 보강 조사. 이론·방법·최근 3개 축으로 재정리.
- **Phase 3 (실험)**: 실험 결과 미보유. 설계 기반 템플릿 + `[DATA NEEDED]` 마킹.
- **Phase 4 (집필)**: 한국IT서비스학회 양식, 한국어, 과잉 주장 금지.
- **Phase 5~6**: 3명 검토 → 편집자 통합.
