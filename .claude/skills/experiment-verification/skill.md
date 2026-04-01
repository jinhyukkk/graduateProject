---
name: experiment-verification
description: "구현된 ML/AI 실험 코드를 검증하는 스킬. import 오류 확인, 스모크 테스트 실행, 출력 shape 검증, 실행 가이드 작성을 수행한다. experiment-verifier 에이전트가 사용한다."
---

# Experiment Verification Skill

구현된 실험 코드의 정확성과 실행 가능성을 체계적으로 검증하는 방법론.

## 검증 실행 순서

### Step 1: 문법 및 Import 검사

```bash
# 모든 Python 파일 문법 검사
python -m py_compile train.py evaluate.py
find src -name "*.py" -exec python -m py_compile {} \;

# Import 검사
python -c "
from src.models.main_model import MainModel
from src.models.baselines import BaselineModel
from src.datasets.dataset import get_dataloader
from src.utils.metrics import get_metrics
from src.utils.trainer import Trainer
print('All imports OK')
"
```

오류 발생 시: 오류 메시지 전체를 code-implementer에게 SendMessage로 전달.

### Step 2: Config 로드 및 데이터 Shape 확인

```python
import yaml
import torch
from src.datasets.dataset import get_dataloader

with open('configs/config.yaml') as f:
    config = yaml.safe_load(f)

# 작은 batch로 테스트
config['training']['batch_size'] = 4

loader = get_dataloader(config, split='train')
batch = next(iter(loader))
inputs, targets = batch
print(f"Input shape: {inputs.shape}")
print(f"Target shape: {targets.shape}")
print(f"Input dtype: {inputs.dtype}")
print(f"Target range: [{targets.min()}, {targets.max()}]")
```

### Step 3: 모델 Forward Pass 검증

```python
from src.models.main_model import MainModel

model = MainModel(config)
param_count = sum(p.numel() for p in model.parameters())
print(f"Total parameters: {param_count:,}")

# Forward pass
model.eval()
with torch.no_grad():
    outputs = model(inputs)
print(f"Output shape: {outputs.shape}")
print(f"Output range: [{outputs.min():.4f}, {outputs.max():.4f}]")

# NaN/Inf 확인
assert not torch.isnan(outputs).any(), "NaN detected in output"
assert not torch.isinf(outputs).any(), "Inf detected in output"
print("Forward pass: OK")
```

### Step 4: Loss 및 역전파 검증

```python
import torch.nn as nn

criterion = nn.CrossEntropyLoss()  # 태스크에 맞게 조정
model.train()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

optimizer.zero_grad()
outputs = model(inputs)
loss = criterion(outputs, targets)
print(f"Loss value: {loss.item():.4f}")

assert not torch.isnan(loss), "NaN loss detected"
assert not torch.isinf(loss), "Inf loss detected"

loss.backward()
grad_norms = [p.grad.norm().item() for p in model.parameters() if p.grad is not None]
print(f"Gradient norm range: [{min(grad_norms):.4f}, {max(grad_norms):.4f}]")
assert min(grad_norms) > 0, "Zero gradients detected — check model connectivity"
print("Backward pass: OK")
```

### Step 5: 스모크 테스트 (1 Iteration)

```python
optimizer.step()
print("1 Optimizer step: OK")

# 체크포인트 저장/로드
import os
os.makedirs('outputs/checkpoints', exist_ok=True)
torch.save({'model_state_dict': model.state_dict()}, 'outputs/checkpoints/smoke_test.pt')
checkpoint = torch.load('outputs/checkpoints/smoke_test.pt')
model.load_state_dict(checkpoint['model_state_dict'])
print("Checkpoint save/load: OK")

print("=== SMOKE TEST PASSED ===")
```

## Shape 불일치 진단

Output shape이 논문 스펙과 다를 때:

| 증상 | 원인 | 해결 |
|------|------|------|
| shape 차원 수 불일치 | squeeze/unsqueeze 누락 | 중간 텐서 shape 프린트하며 추적 |
| batch 차원 위치 오류 | DataLoader 설정 | `batch_first` 파라미터 확인 |
| 클래스 수 불일치 | 마지막 레이어 out_features | config의 num_classes 확인 |

## 합성 데이터로 검증

데이터셋이 없어서 실제 데이터를 로드할 수 없는 경우, 합성 데이터로 shape 검증을 수행한다:

```python
# 합성 데이터 생성 (shape만 맞으면 됨)
batch_size = 4
# 이미지 분류 예시
inputs = torch.randn(batch_size, 3, 224, 224)
targets = torch.randint(0, num_classes, (batch_size,))
```

검증 보고서에 "합성 데이터로 검증, 실제 데이터셋 필요" 명시.

## 버그 수정 요청 형식

code-implementer에게 SendMessage로 보내는 형식:

```
파일: src/models/main_model.py
라인: 45
오류: RuntimeError: Expected all tensors to be on the same device
원인: self.classifier가 CPU, 입력이 CUDA
수정: self.classifier = nn.Linear(...).to(device) 추가 또는 
      Trainer에서 model.to(device) 호출 확인
```

## 검증 통과 기준

| 항목 | 기준 |
|------|------|
| Import | 모든 모듈 import 성공 |
| Forward pass | output shape이 논문 스펙과 일치 |
| Loss | NaN/Inf 없음, 양수 값 |
| Backward | 모든 학습 가능 파라미터에 gradient 존재 |
| 스모크 테스트 | 1 iteration 완료, 에러 없음 |
| 체크포인트 | 저장/로드 성공 |

위 6항목을 모두 통과하면 PASS, 일부 통과하면 PARTIAL, 과반 실패면 FAIL.
