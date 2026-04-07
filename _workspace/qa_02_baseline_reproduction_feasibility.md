# 베이스라인 3종 재현 가능성 평가

결론부터: **DIN-SQL은 매우 쉬움, DAIL-SQL은 쉬움, CHESS는 중간 난이도**. 셋 다 공식 코드가 있고 BIRD에서 돌려본 사례가 풍부하다.

## 1. DIN-SQL — ★★★★★ (가장 쉬움)

**저장소**: `MohammadrezaPourreza/Few-shot-NL2SQL-with-prompting` (공식)

**구조**: 4단계 프롬프트 체인 (schema linking → classification → SQL generation → self-correction). 모델 호출만 있고 학습/파인튜닝 없음.

**구현 부담**
- 코드 ~1500줄, 거의 프롬프트 템플릿 + OpenAI API 호출
- few-shot exemplar는 논문 부록에 그대로 공개
- BIRD/Spider 평가 스크립트도 함께 제공

**예상 작업**: GPT-4o로 모델 ID만 교체 → 바로 실행. 1~2일이면 BIRD dev 1534개 돌릴 수 있다.

**리스크**
- API 비용: BIRD dev 1534문항 × 4단계 ≈ 6천 호출. GPT-4o로 약 $30~60 추정
- self-correction 단계가 원본 GPT-4 기반이라 GPT-4o에서 prompt sensitivity 약간 있음 (점수 미세 차이 발생 가능 — 논문에 "재현 점수" 명시하면 됨)

## 2. DAIL-SQL — ★★★★☆

**저장소**: `BeachWang/DAIL-SQL` (공식, 잘 관리됨)

**구조**: question representation 선택 + masked example selection 기반 ICL. 마찬가지로 학습 없음.

**구현 부담**
- README에 BIRD/Spider 실행 명령어가 그대로 있음
- 핵심은 "어떤 형식으로 schema를 인코딩하고 어떤 example을 retrieve할지"의 ablation 코드
- GPT-4 백본 가정으로 짜여 있어 모델만 갈아끼우면 됨

**예상 작업**: 2~3일. 가장 큰 작업은 example pool을 BIRD train으로 인덱싱하는 부분(SimCSE 임베딩 사용).

**리스크**
- example retrieval에 SimCSE 모델을 별도로 띄워야 함 (HuggingFace, GPU 1장이면 충분)
- 원 논문은 GPT-4 기준 BIRD EX 54.76 — GPT-4o에서 보통 +2~4% 더 나옴

## 3. CHESS — ★★★☆☆ (중간)

**저장소**: `ShayanTalaei/CHESS` (공식)

**구조**: 4 에이전트(Information Retriever / Schema Selector / Candidate Generator / Unit Tester). 가장 무거움.

**구현 부담**
- 코드 규모 가장 큼 (~1만 줄)
- 외부 의존: 컬럼 description 인덱싱(BM25 + dense), keyword extraction LLM, value retrieval, NL unit test 생성기 — 파이프라인이 길다
- BIRD column profile JSON을 사전 빌드해야 함 (수 시간)

**예상 작업**: 3~5일. 환경 셋업이 가장 시간 소모. 코드 자체는 잘 구조화돼 있어 모델만 교체하면 동작은 함.

**리스크 (가장 큼)**
- API 비용 가장 높음: 에이전트당 1~3 호출 × 4 에이전트 × 1534 문항 ≈ 1.5~2만 호출. GPT-4o로 **$150~250** 추정
- column description / value index 빌드에 BIRD 원본 DB 파일 필요(수 GB)
- "Unit Tester" 에이전트가 본 논문의 일차 차별점(SQL→NL 역번역+NLI)과 **개념적으로 가장 가까움** → 어블레이션에서 "CHESS unit test vs 본 연구 NLI 검증"을 직접 비교하면 강한 contribution 증거가 된다 (오히려 기회)

## 종합 권장 실행 순서

| 순서 | 베이스라인 | 이유 |
|---|---|---|
| 1 | **DIN-SQL** | 가장 빨라서 파이프라인·평가 스크립트 검증용 |
| 2 | **DAIL-SQL** | 코드 품질 좋고 GPT-4o 친화 |
| 3 | **CHESS** | 마지막에 — 가장 비싸고 가장 의미있는 비교 대상 |

## 공통 준비물

1. **BIRD dev 평가 스크립트** — 공식 `AlibabaResearch/DAMO-ConvAI/bird` 한 벌이면 셋 다 EX/VES 통일 측정 가능
2. **GPT-4o API 키** — 총 예산 **$250~400** 정도면 3개 베이스라인 + 본 연구 1회 풀 평가 가능
3. **GPU 1장** (DAIL-SQL의 SimCSE / CHESS의 dense retrieval용) — A6000/3090 급이면 충분, A100 불필요
4. **BIRD 원본 DB 파일** (~38GB) — CHESS 실행에 필수

## 실패 가능성과 우회

- **재현 점수가 논문과 다르게 나오는 경우** → "GPT-4o 재현, *단일 시드*"로 표 각주에 명시. 이건 학회 관행이라 페널티 없음
- **CHESS가 너무 무거우면** → BIRD dev **subset 200~500개**로 축소 비교(논문에 명시). 9편 중 SQLens도 동일 방식 사용
- **API 비용 초과** → DIN-SQL과 DAIL-SQL만으로도 비교 충분. CHESS는 어블레이션 한정 비교 대상으로 스코프 축소

## 한 줄 결론

**셋 다 재현 가능. DIN-SQL은 거의 확실, DAIL-SQL은 안전, CHESS는 시간·비용만 확보되면 됨.** 본 연구의 차별점(NL-space intent consistency)이 CHESS의 unit test 에이전트와 직접 충돌하는 영역이므로, **CHESS 재현은 비용을 들여서라도 포함**시키는 것이 reviewer 방어상 유리하다.
