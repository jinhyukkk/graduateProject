---
name: env-setup
description: "ML/AI 실험 환경을 구성하는 스킬. conda 환경, requirements.txt, 디렉토리 구조, 데이터 준비 스크립트를 생성한다. env-builder 에이전트가 사용한다."
---

# Env Setup Skill

논문 실험 스펙을 기반으로 재현 가능한 Python 실험 환경을 구축하는 방법론.

## setup_env.sh 작성 원칙

실제로 실행되는 스크립트를 작성한다. `set -e`로 오류 시 즉시 중단하고, 각 단계를 echo로 안내한다.

```bash
#!/bin/bash
set -e  # 오류 시 즉시 중단

ENV_NAME="[논문제목_약어]_env"
PYTHON_VERSION="3.9"  # 논문 스펙 또는 최신 안정 버전

echo "=== [논문 제목] 실험 환경 설치 ==="
echo "환경 이름: $ENV_NAME"

# 1. conda 환경 생성
echo "[1/4] conda 환경 생성 중..."
conda create -n $ENV_NAME python=$PYTHON_VERSION -y || true
source activate $ENV_NAME

# 2. 패키지 설치
echo "[2/4] 패키지 설치 중..."
pip install -r requirements.txt

# 3. 디렉토리 구조 생성
echo "[3/4] 디렉토리 구조 생성 중..."
mkdir -p data/raw data/processed outputs/checkpoints outputs/logs

# 4. 환경 검증
echo "[4/4] 환경 검증 중..."
python -c "import torch; print(f'PyTorch: {torch.__version__}, CUDA: {torch.cuda.is_available()}')"

echo "=== 설치 완료 ==="
echo "실행 방법:"
echo "  conda activate $ENV_NAME"
echo "  python train.py --config configs/config.yaml"
```

## requirements.txt 버전 명시 방법

버전을 `==`로 고정한다. 범위 연산자(`>=`, `~=`)는 재현성을 해친다.

```
# Deep Learning Framework
torch==2.1.0
torchvision==0.16.0

# 데이터 처리
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0

# 유틸리티
tqdm==4.65.0
PyYAML==6.0.1
matplotlib==3.7.2
```

PyTorch 버전 선택 기준:
- 논문에 명시된 경우: 해당 버전 사용
- 미명시된 경우: 논문 arxiv 제출 날짜 기준 최신 안정 버전 (pytorch.org/docs 참조)

## GPU vs CPU 처리

requirements.txt에 두 가지 옵션을 주석으로 제공한다:

```
# GPU 버전 (권장): torch==2.1.0 (pip install 시 CUDA 자동 포함)
# CPU 전용: torch==2.1.0+cpu --extra-index-url https://download.pytorch.org/whl/cpu
torch==2.1.0
```

setup_env.sh에 GPU 감지 로직 포함:
```bash
if python -c "import torch; exit(0 if torch.cuda.is_available() else 1)" 2>/dev/null; then
    echo "GPU 사용 가능"
else
    echo "경고: GPU 없음. CPU로 실행됩니다. 속도가 느릴 수 있습니다."
fi
```

## environment.yml 작성

conda 환경 전체를 재현하는 파일:

```yaml
name: experiment_env
channels:
  - pytorch
  - conda-forge
  - defaults
dependencies:
  - python=3.9
  - pip
  - pip:
    - torch==2.1.0
    - torchvision==0.16.0
    - numpy==1.24.3
    # ... 나머지 패키지
```

## 데이터셋 준비

데이터셋을 자동 다운로드할 수 있는 경우 스크립트를 작성한다:

```python
# scripts/download_data.py
import os
import urllib.request

DATA_URL = "https://..."
DATA_DIR = "data/raw/"

os.makedirs(DATA_DIR, exist_ok=True)
urllib.request.urlretrieve(DATA_URL, os.path.join(DATA_DIR, "dataset.zip"))
```

자동 다운로드가 불가능한 경우 (로그인 필요, 라이선스 동의 등):
setup_env.sh 하단에 다음 형식으로 안내:

```bash
echo "=== 데이터셋 수동 다운로드 필요 ==="
echo "1. [URL]에서 데이터셋 다운로드"
echo "2. data/raw/ 디렉토리에 압축 해제"
echo "3. python scripts/preprocess.py 실행"
```

## env_report.md 형식

```markdown
# 환경 구성 보고서

## 환경 정보
- 환경 이름: experiment_env
- Python 버전: 3.9.x
- PyTorch 버전: 2.1.0
- CUDA 사용 가능: [예/아니오]

## 생성된 구조
```
experiment/
├── data/raw/          ✅
├── data/processed/    ✅
├── src/               ✅
├── configs/           ✅
└── outputs/           ✅
```

## 주요 패키지
| 패키지 | 버전 | 용도 |
|--------|------|------|
| torch | 2.1.0 | 딥러닝 프레임워크 |

## 알려진 제한사항
- [있으면 기술, 없으면 "없음"]

## 활성화 방법
```bash
conda activate experiment_env
```
```
