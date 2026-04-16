# 작업 일지

---

### 2026-03-29
완료:
- 계획.md 재정비, CLAUDE.md + todo.md 생성
- BIRD dev set 다운로드 (dev.json, dev_databases/ 11개 DB, dev_600.json/csv)
- .env 파일 생성 (ANTHROPIC_API_KEY, OPENAI_API_KEY)
- src/pipeline/ 전체 모듈 구현 (schema_rag, nl2sql, validator, executor, error_classifier, cot_corrector, rag_corrector)
- src/graph.py — C1~C5 LangGraph 파이프라인 조립 완료
- experiments/run_condition.py, run_all.py 구현
- src/evaluate.py, src/sample.py 구현
- Claude Code로 진행 상황 점검 (계획 대비 실제 구현 상태 확인)

미완료:
- data/samples/ 비어있음 — sample.py 실행 필요 (dev_600.json이 bird/에 있으나 공식 경로 아님)
- .env API 키 실제 값 검증 미완료
- C1 파일럿 실행 미착수 → data/results/ 비어있음

내일 목표 (3/30):
- .env 키 확인 + SQLite 연결 테스트 1회
- sample.py 실행 → data/samples/ 저장
- C1 파일럿 50개 실행 → data/results/C1_pilot.csv
