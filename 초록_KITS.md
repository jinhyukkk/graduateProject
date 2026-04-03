# 기업 인사관리 시스템을 위한 LLM 기반 자기교정 Text-to-SQL 프레임워크

**An LLM-Based Self-Correcting Text-to-SQL Framework for Enterprise HR Management Systems**

**저자:** 박진혁  
**소속:** 국민대학교 대학원  
**대상 학회:** 한국IT서비스학회

---

## 국문 초록

기업 내부 데이터 활용이 확대되면서 SQL 비전문가의 데이터베이스 직접 조회 수요가 증가하고 있으나, 대형 언어 모델(LLM) 기반 Text-to-SQL 시스템은 기업 환경에서 높은 오류율을 보인다. 기존의 자기교정 접근법(DIN-SQL, DAIL-SQL, CHESS 등)은 실행 오류에 대한 단순 재생성에 의존하여, 실행은 성공하지만 잘못된 결과를 반환하는 의미·논리 오류에는 효과적으로 대응하지 못한다. 본 연구는 실제 기업 인사관리 시스템(42개 테이블, 347개 컬럼)에서 발생하는 SQL 오류를 실증 분석하여 구문·의미·논리의 3계층 10유형 오류 분류 체계를 새롭게 제안하고, 오류 유형에 따라 교정 전략을 차별화하는 자기교정 프레임워크(SC-TSQL)를 설계한다. SC-TSQL의 핵심은 실행 기반 검증과 의미론적 일관성 검증(SQL 역번역 후 원래 질의와의 NLI 기반 의도 비교)을 결합한 이중 검증 메커니즘으로, 감지된 오류 유형과 진단 결과를 교정 프롬프트에 주입하여 교정 정밀도를 높인다. 실제 기업에서 수집한 인사관리 데이터셋(HR-DB, 인사담당자의 실제 질의 150개, 전문가 검수 정답 SQL 포함)과 BIRD 벤치마크(개발 세트 1,534개)를 대상으로, 공정 비교를 위해 모든 비교 모델을 동일 백본(GPT-4o) 및 동일 환경에서 재현 실험하였다. SC-TSQL은 HR-DB에서 실행 정확도(EX) 69.3%로 Zero-shot(46.7%), DIN-SQL(50.0%), DAIL-SQL(52.7%), CHESS(57.3%) 대비 최대 22.6%p 향상되었으며, BIRD에서도 EX 72.8%로 최고 비교 대상인 CHESS(69.2%)를 3.6%p 상회하였다. 오류가 발생한 쿼리의 77.5%가 자동 교정되었으며, 스키마 오참조(87.1%)와 조인 누락(84.0%)에서 특히 높은 교정률을 보였다. 어블레이션 실험을 통해 각 구성요소의 독립적 기여를 확인하였다. 본 연구는 오류 유형 기반의 체계적 교정 전략이 기업 환경 Text-to-SQL의 실용성을 높일 수 있음을 실증적으로 보인다.

**주제어:** Text-to-SQL, 자기교정, 대형 언어 모델, 오류 유형 분류, 기업 인사관리 시스템

---

## Abstract

As enterprise data utilization expands, the demand for non-expert users to directly query databases is growing. However, LLM-based Text-to-SQL systems exhibit high error rates in enterprise environments, and existing self-correction approaches (DIN-SQL, DAIL-SQL, CHESS) rely on simple regeneration upon execution errors, failing to address semantic and logical errors where queries execute successfully but return incorrect results. This study empirically analyzes SQL errors from a real enterprise HR system (42 tables, 347 columns), proposes a novel three-tier, ten-type error taxonomy (syntactic, semantic, logical), and designs SC-TSQL, a self-correcting framework that differentiates correction strategies by error type. The key mechanism combines execution-based validation with semantic consistency verification—back-translating generated SQL to natural language and comparing it against the original query via NLI-based intent matching—then injects specific error diagnoses into correction prompts. For fair comparison, all baselines were re-implemented under the same backbone (GPT-4o) and evaluated on a real enterprise HR dataset (HR-DB, 150 queries collected from HR staff with expert-annotated gold SQL) and the BIRD benchmark (1,534 dev queries). SC-TSQL achieved 69.3% execution accuracy (EX) on HR-DB, outperforming Zero-shot (46.7%), DIN-SQL (50.0%), DAIL-SQL (52.7%), and CHESS (57.3%) by up to 22.6 percentage points, and 72.8% EX on BIRD, surpassing CHESS (69.2%) by 3.6%p. Among erroneous queries, 77.5% were automatically corrected, with particularly high rates for schema misreferences (87.1%) and missing joins (84.0%). Ablation experiments confirmed the independent contribution of each component. This study empirically demonstrates that error-type-aware correction strategies can enhance the practicality of Text-to-SQL in enterprise environments.

**Keywords:** Text-to-SQL, Self-Correction, Large Language Model, Error Taxonomy, Enterprise HR Management System
