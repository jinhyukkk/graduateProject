# SC-TSQL Query Interface — 기술 조합 분석 문서

작성일: 2026-04-17  
대상 서비스: SC-TSQL (Self-Correcting Text-to-SQL) Query Interface

---

## 1. 핵심 기술 조합 (Must-have)

| 기술 | 적용 위치 | 이유 |
|---|---|---|
| **Python** | 전체 파이프라인 | 모든 모듈의 구현 언어. 교체 불가 |
| **LLM** | SQL Generator, Corrector, Explainer | SQL 생성·교정·설명의 핵심 엔진 |
| **AI Agent** | `sc_tsql.py` 오케스트레이터 | 5단계 파이프라인을 단일 에이전트로 조율 |
| **Multi-agent orchestration** | Schema Linker → Generator → Validator → Verifier → Corrector | 각 모듈이 독립 에이전트로 역할 분리된 구조 |
| **Tool Calling** | 파이프라인 각 단계 | LLM이 SQL 실행·스키마 조회·NLI 검증 도구를 호출하는 구조 |
| **Prompt Engineering** | `corrector.py` (RQ2 핵심) | 오류 유형(schema/join/aggregation/condition/logic)별 전용 지시문 |
| **SQL** | `execution_validator.py` | 생성된 SQL의 실행 기반 검증 |
| **Validator / Verifier** | `execution_validator.py` + `semantic_verifier.py` | 실행 검증(RQ 베이스라인) + NLI 의미 검증(RQ1 핵심) |
| **Self-critique** | 자기교정 루프 (최대 K=3) | 실패 시 오류 진단 → 재생성하는 자기 비판 구조 |
| **Evals** | `evaluate.py` (EX / CSR / ICS / Latency) | 두 벤치마크(BIRD, HRDB) 공정 비교 평가 |
| **API 개발** | FastAPI 백엔드 | 프런트엔드 → 파이프라인 연결 인터페이스 |
| **Docker** | 백엔드 + 프런트엔드 | 재현 가능한 실험 환경 패키징 |
| **Git + CI/CD** | 전체 개발 주기 | 실험 버전 관리, 평가 자동화 |

---

## 2. 보조 기술 조합 (Nice-to-have)

| 기술 | 적용 위치 | 기대 효과 |
|---|---|---|
| **IR + 벡터 검색** | `schema_linker.py` 고도화 | 규칙 기반 스키마 선별 → 임베딩 유사도 기반 top-k 선택으로 정밀도 향상 |
| **RAG / Advanced RAG** | Schema Linker + Few-shot 풀 | 테이블·컬럼 설명을 벡터 인덱싱, 질문과 의미 유사 스키마 검색 |
| **Reranking** | Few-shot 예시 선택 (DAIL-SQL 방식) | BIRD train set 예시 후보를 IR로 검색 후 cross-encoder 리랭킹 |
| **Context Engineering** | 멀티턴 대화 히스토리 | 현재 Chat UI는 멀티턴 지원이나 백엔드는 단일 요청 처리 — 이전 질문 맥락을 SQL 생성 프롬프트에 포함 |
| **Confidence Scoring** | SQL Generator 출력 단계 | logprob 기반 생성 신뢰도가 낮을 때만 교정 루프 진입 → 불필요한 LLM 호출 절감 |
| **Guardrails** | NLI threshold(θ=0.75) 제어 | 의미 일치 점수 하한선을 정책으로 명시화, 임계값 이하 응답 차단 |
| **Observability** | 파이프라인 전 단계 | 각 단계 latency·token 소비·오류율 추적 (LangSmith 또는 OpenTelemetry) |
| **LangGraph** | `sc_tsql.py` 오케스트레이터 대체 | 상태 그래프 기반 조건 분기 (교정 성공 → 종료, 실패 → 재시도) 시각화 및 디버깅 편의성 |
| **Ontology** | HRDB 스키마 표현 | 부서-직원-계약 관계를 온톨로지로 명세 → 스키마 링킹 정확도 향상 |

---

## 3. 제외 기술 및 이유

| 기술 | 제외 이유 |
|---|---|
| **TensorFlow / PyTorch / scikit-learn** | GPT-4o API 호출 기반 설계. 자체 모델 훈련 없음 — 도입 근거 없음 |
| **Fine-Tuning (SFT / RLHF / DPO)** | 연구 범위 초과. GPT-4o 프롬프트 최적화로 충분하며, 파인튜닝은 별도 데이터셋·GPU 인프라 필요 |
| **ONNX / TensorRT / 모델 양자화** | API 호출 구조에서 모델 서빙 최적화는 불필요. 자체 NLI 모델(deberta)에만 제한적 적용 가능 |
| **GraphRAG** | 스키마가 테이블 관계형 구조 — 지식 그래프 수준의 복잡도 없음. Advanced RAG로 충분 |
| **AWS / GCP / Azure / Kubernetes / Kubeflow** | 현재 단일 서버 데모 수준. 논문 실험에 클라우드 오케스트레이션은 과도 |
| **VLM / LAM / MCP** | 텍스트 전용 파이프라인. 비전·행동·컨텍스트 프로토콜 불필요 |
| **PII 대응** | HRDB는 합성 데이터 전용. 실제 개인정보 없음 |
| **NoSQL** | SQL 실행 검증이 핵심. NoSQL은 연구 범위 외 |
| **A/B 테스트** | 현재 ablation 실험(A1-A4)이 동등한 역할 수행. 프로덕션 전환 시 도입 고려 |
| **Enterprise Knowledge Store** | HRDB 42개 테이블 규모에 엔터프라이즈 지식 저장소는 과도 |

---

## 4. 기술 조합 아키텍처

```
[사용자 자연어 질문]
        │
        ▼
[Context Engineering]  ← 이전 대화 히스토리 주입 (Nice-to-have)
        │
        ▼
[Schema Linker]  ← IR + 벡터 검색 + Reranking (Must→Nice)
        │  관련 테이블·컬럼 top-k 선택
        ▼
[SQL Generator]  ← LLM + Prompt Engineering + Tool Calling
        │  + Confidence Scoring → 낮으면 교정 루프 바로 진입
        ▼
[Execution Validator]  ← SQL 실행 + Validator  (Must)
        │
        ├─ 실행 성공 ──→ [Semantic Verifier]  ← Self-critique + NLI (RQ1)
        │                       │
        │              의도 일치(≥θ) → 완료
        │              의도 불일치 ──→ [Corrector]
        │
        └─ 실행 실패 ──→ [Corrector]  ← 오류 유형별 Prompt Engineering (RQ2)
                              │  (최대 K=3 반복)
                              ▼
                    [Result Explainer]  ← LLM 자연어 설명
                              │
                              ▼
                    [Guardrails]  ← 출력 검증 + 임계값 필터
                              │
                              ▼
                    [Evals]  ← EX / CSR / ICS / Latency
                              │
              ┌───────────────┘
              ▼
    [Observability]  ← 단계별 latency · token · 오류율 추적
```

---

## 5. 단계별 적용 로드맵

### Phase 1 — MVP (현재 구현 완료)
> 목표: 논문 실험 재현 가능한 파이프라인 완성

**도입 기술**
```
Python + LLM + AI Agent + Multi-agent orchestration
  + Tool Calling + Prompt Engineering (유형별)
  + SQL + Validator/Verifier + Self-critique
  + Evals (EX/CSR/ICS) + API 개발 + Git + Docker
```

**완료 기준**: BIRD dev 50샘플 파일럿 실험 통과, FastAPI + React 데모 UI 동작

---

### Phase 2 — 품질 고도화 (논문 제출 전)
> 목표: RQ1/RQ2 결과 수치 개선, 실험 재현성 강화

**도입 기술**
```
+ IR + 벡터 검색  → Schema Linker 정확도 향상
+ Reranking       → Few-shot 예시 품질 향상
+ Confidence Scoring → 불필요 교정 루프 제거, 비용 절감
+ Observability   → 실험 로그 체계화 (단계별 latency 분리 보고)
```

**완료 기준**: BIRD full(1,534문항) + HRDB 실험 완료, ablation A1-A4 수치 확보

---

### Phase 3 — 운영 안정화 (데모 고도화)
> 목표: 실제 사용 가능한 서비스 수준

**도입 기술**
```
+ Context Engineering → 멀티턴 대화 히스토리 백엔드 반영
+ Guardrails          → NLI threshold 정책 명시화
+ LangGraph           → 오케스트레이터 교체, 상태 그래프 시각화
+ CI/CD               → 평가 자동화 파이프라인
```

**완료 기준**: 연속 5회 질의 시 맥락 유지, 비정상 입력 차단 동작 확인

---

### Phase 4 — 장기 확장 (프로덕션 전환 시)
> 목표: 엔터프라이즈 실무 환경 적용

**도입 기술**
```
+ Advanced RAG + Ontology → 대규모 스키마(100+ 테이블) 대응
+ Kubernetes              → 멀티 사용자 서빙
+ A/B 테스트              → 프롬프트 버전 비교
+ Fine-Tuning(SFT)        → 도메인 특화 SQL 생성 모델
```

---

## 6. 핵심 판단 기준 요약

SC-TSQL은 이미 이 기술 목록의 핵심 패턴(`Multi-agent + Verifier + Self-critique + Evals`)을 구현하고 있다.

**다음 최우선 투자처 (Phase 2)**:

| 우선순위 | 기술 | 이유 |
|---|---|---|
| 1 | **IR + 벡터 검색** | Schema Linker가 현재 병목. 스키마 정확도 향상이 EX에 가장 직접적 영향 |
| 2 | **Confidence Scoring** | 교정 루프 불필요 진입 제거 → GPT-4o 호출 비용 최대 40% 절감 추정 |
| 3 | **Observability** | 단계별 latency 분리 없이는 논문 Table에 세부 지연 수치 보고 불가 |
