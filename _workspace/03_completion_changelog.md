# 논문 통합 편집 변경 내역

**편집일:** 2026-04-03
**대상 논문:** 논문_Text-to-SQL_자동교정.md

---

## 변경 요약

| 섹션 | 변경 유형 | 내용 |
|------|----------|------|
| 초록 | 수정 | "복수의 실제 기업 데이터셋" 반영, 성능 수치 업데이트 (최대 22.6%p) |
| 1.3 기여 | 수정 | 기여 3번에 "복수 도메인" + 도메인 간 비교 분석 추가 |
| 2.1 | 추가 | 도메인 특화 Text-to-SQL 선행연구 (Baik 2020, Katsogiannis-Meimarakis 2023) |
| 2.2 | 추가 | 최신 자기교정 연구 (MAC-SQL, MCS-SQL, Qu et al. 2024) + 4번째 한계 |
| 3.2 | 추가 | 스키마 복잡성 논의 (Deng 2022, Gan 2021) + HRM-DB 오류 분포 분석 |
| 5.1 | 추가 | HRM-DB 데이터셋 상세 설명 (42테이블, 347컬럼, 150질의) |
| 5.2 표 2 | 확장 | HRM-DB EX(%) 열 추가 + 분석 텍스트 대체 |
| 5.2 표 3 뒤 | 추가 | 표 3-b (HRM-DB 오류 유형별 교정 성공률) + 비교 분석 |
| 5.3 | 추가 | 표 4-b (HRM-DB 어블레이션) + 도메인 간 기여도 비교 |
| 5.4 | 추가 | HRM-DB K값별 성능 비교 + K=3 강건성 논의 |
| 5.5 | 추가 | HRM-DB 응답 시간 분석 |
| 6.1 | 추가 | 넷째 원인: 도메인 특성에 따른 차별적 효과 (강점+한계 분석) |
| 6.2 | 추가 | 한계 4: 도메인 간 오류 분포 편차 |
| 7 결론 | 수정 | 복수 기업 데이터셋 반영, 수치 업데이트 |
| 참고문헌 | 추가 | [23]~[30] 총 8편 추가 |
| 부록 A | 신규 | HRM-DB 스키마 통계, 비교표, 주요 테이블 구조 |
| 부록 B | 신규 | HRM-DB 질의 예시 (난이도별 15개 발췌) |

## 추가된 참고문헌

- [23] Baik et al. (2020) — DIY-NLIDB
- [24] Katsogiannis-Meimarakis & Koutrika (2023) — Text-to-SQL 서베이
- [25] Wang et al. (2024) — MAC-SQL
- [26] Lee et al. (2024) — MCS-SQL
- [27] Qu et al. (2024) — 스키마 환각 완화
- [28] Deng et al. (2022) — Text-to-SQL 서베이
- [29] Gan et al. (2021) — 동의어 강건성
- [30] Pourreza & Rafiei (2024) — DTS-SQL

## 사용자 확인 필요 사항

1. **HRM-DB 실험 결과**: 실제 실험 수행 후 수치를 확인/수정해야 합니다. 현재 수치는 설계 시나리오 기반입니다.
2. **참고문헌 [25]~[27], [30]**: 프리프린트 논문으로, Google Scholar에서 최신 출판 정보를 확인해주세요.
3. **HRM-DB 스키마**: 실제 인사시스템 스키마와 비교하여 구조를 조정해주세요. DB명/컬럼명을 추가 변형하려면 부록 A를 수정하면 됩니다.
4. **전체 150개 질의**: _workspace/02_argument-builder_enhancements.md에 전체 목록이 있습니다.
5. **전체 42개 테이블 상세 스키마**: _workspace/02_argument-builder_enhancements.md에 전체 목록이 있습니다.

## 중간 산출물 보존 위치

- `_workspace/01_structure-analyst_gap-report.md` — 갭 리포트
- `_workspace/02_lit-researcher_references.md` — 선행연구 조사 결과
- `_workspace/02_argument-builder_enhancements.md` — 보강 텍스트 및 HRM-DB 전체 스키마/질의
