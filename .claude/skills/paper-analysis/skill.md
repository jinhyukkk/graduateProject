---
name: paper-analysis
description: "ML/AI 논문에서 실험 재현에 필요한 스펙을 추출하는 스킬. 데이터셋, 모델 아키텍처, 하이퍼파라미터, 베이스라인, 평가 지표를 구조화된 형태로 추출한다. paper-analyst 에이전트가 사용한다."
---

# Paper Analysis Skill

ML/AI 논문에서 실험 재현을 위한 구조화된 스펙을 추출하는 방법론.

## 추출 대상 정보

### 필수 항목 (없으면 "미명시"로 표시)
1. **데이터셋**: 이름, 출처 URL, 샘플 수, train/val/test 분할, 전처리 방법
2. **모델 아키텍처**: 레이어 구성, 주요 컴포넌트, 차원 수
3. **핵심 수식**: 손실 함수, 핵심 알고리즘, 주요 연산
4. **하이퍼파라미터**: learning rate, batch size, epochs, optimizer, scheduler
5. **평가 지표**: 메트릭명, 계산 방법, 리포팅 방식 (평균, 최고값 등)
6. **베이스라인**: 비교 대상 방법론 목록
7. **프레임워크**: PyTorch/TensorFlow/JAX 버전, CUDA 요구사항

### 재현성 핵심 세부사항 (자주 누락되는 항목)
- 랜덤 시드 고정 여부
- Weight initialization 방법
- Data augmentation 방법 및 순서
- Learning rate warmup 기간
- Gradient clipping 값
- Early stopping 기준
- 앙상블 여부 및 방법

## 논문 유형별 추출 전략

### 분류/회귀 태스크 (Classification, Regression)
- 클래스 수와 불균형 여부 확인
- Top-1/Top-5 정확도 중 어느 것을 보고하는지 확인
- 학습/테스트 세트 분리 방식 (랜덤 분할 vs 공식 분할)

### 생성 모델 (GAN, VAE, Diffusion)
- 생성기와 판별기의 학습 비율 확인
- FID, IS 등 생성 품질 지표 계산 방법
- 샘플링 스텝 수 (Diffusion 모델)

### NLP 태스크 (분류, 생성, 번역)
- 토크나이저 종류와 vocab 크기
- 최대 시퀀스 길이
- 사전학습 모델 사용 여부 및 버전 (BERT, GPT 등)
- BLEU, ROUGE 등 텍스트 메트릭 계산 라이브러리

### 그래프/구조적 데이터
- 그래프 구조 (노드 수, 엣지 수, 특징 차원)
- 그래프 분할 방법 (transductive vs inductive)
- 인접 행렬 정규화 방법

## 코드 저장소 활용

논문에 GitHub 링크가 있으면:
1. 저장소 URL을 스펙에 포함한다
2. 공식 구현의 주요 설계 결정을 스펙에 반영한다 (논문과 차이가 있으면 명시)
3. 공식 구현에서 사용한 정확한 패키지 버전을 requirements.txt에 포함한다

## 불명확한 항목 처리

`_workspace/01_ambiguities.md`에 다음 형식으로 기록한다:

```markdown
# 불명확 항목 목록

| 항목 | 논문 내용 | 추정 값 | 참고 |
|------|---------|--------|------|
| learning rate schedule | "cosine decay 사용" | 0.001 → 0 over 100 epochs | Section 4.1 |
| batch normalization 위치 | 미명시 | pre-norm (최신 관행) | 추정 |
```

code-implementer가 구현 결정을 내릴 때 이 파일을 참조한다.

## requirements.txt 추론 방법

논문에서 언급된 프레임워크와 기법을 기반으로 의존성을 추론한다:

| 기법/모델 | 필요 패키지 |
|---------|-----------|
| PyTorch 기반 | torch, torchvision, torchaudio |
| 트랜스포머 | transformers, tokenizers |
| 그래프 신경망 | torch-geometric |
| 이미지 처리 | Pillow, opencv-python |
| 데이터 처리 | numpy, pandas, scikit-learn |
| 시각화 | matplotlib, seaborn |
| 실험 추적 | wandb 또는 tensorboard |

버전은 논문 제출 시점(arxiv 날짜)을 기준으로 안정 버전을 선택한다.
