---
name: code-implementation
description: "ML/AI 논문의 실험 코드를 구현하는 스킬. 데이터 로더, 모델, 학습 루프, 평가 메트릭, 베이스라인, config 파일을 작성한다. code-implementer 에이전트가 사용한다."
---

# Code Implementation Skill

논문 실험 스펙을 기반으로 재현 가능한 ML/AI 실험 코드를 구현하는 방법론.

## 구현 우선순위

1. **데이터 로더** — 없으면 아무것도 실행 안 됨
2. **메인 모델** — 논문의 핵심 기여
3. **학습 루프** — train/val/test 분리
4. **평가 메트릭** — 논문 결과 재현의 핵심
5. **베이스라인** — 비교를 위해 필요
6. **Config 및 실행 스크립트** — 마지막에 정리

## 모델 구현 패턴

```python
# src/models/main_model.py
import torch
import torch.nn as nn

class MainModel(nn.Module):
    """
    [논문 제목] (Section 3)의 메인 모델 구현.
    
    Args:
        config: 하이퍼파라미터 딕셔너리 (configs/config.yaml에서 로드)
    """
    def __init__(self, config):
        super().__init__()
        self.config = config
        self._build_layers()
    
    def _build_layers(self):
        # Eq. (1), Section 3.1
        self.encoder = nn.TransformerEncoder(...)
        # Eq. (2), Section 3.2
        self.classifier = nn.Linear(...)
    
    def forward(self, x, mask=None):
        # Section 3.1
        encoded = self.encoder(x, src_key_padding_mask=mask)
        # Section 3.2
        logits = self.classifier(encoded[:, 0])  # CLS token
        return logits
```

논문 섹션 번호 주석 규칙: 수식은 `# Eq. (N)`, 섹션은 `# Section N.M`, 알고리즘은 `# Algorithm N`.

## 데이터 로더 패턴

```python
# src/datasets/dataset.py
import torch
from torch.utils.data import Dataset, DataLoader
import yaml

class ExperimentDataset(Dataset):
    """
    [데이터셋명] 로더.
    Section 4.1의 전처리 방법 구현.
    """
    def __init__(self, data_dir, split='train', transform=None):
        self.data_dir = data_dir
        self.split = split
        self.transform = transform
        self._load_data()
    
    def _load_data(self):
        # 데이터 로딩 로직
        pass
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        # 전처리 후 반환
        pass

def get_dataloader(config, split='train'):
    dataset = ExperimentDataset(
        data_dir=config['data']['data_dir'],
        split=split
    )
    return DataLoader(
        dataset,
        batch_size=config['training']['batch_size'],
        shuffle=(split == 'train'),
        num_workers=4,
        pin_memory=True
    )
```

## 학습 루프 패턴

```python
# src/utils/trainer.py
import torch
from tqdm import tqdm

class Trainer:
    def __init__(self, model, optimizer, scheduler, config, device):
        self.model = model
        self.optimizer = optimizer
        self.scheduler = scheduler
        self.config = config
        self.device = device
    
    def train_epoch(self, dataloader):
        self.model.train()
        total_loss = 0
        for batch in tqdm(dataloader, desc="Training"):
            inputs, targets = batch
            inputs, targets = inputs.to(self.device), targets.to(self.device)
            
            self.optimizer.zero_grad()
            outputs = self.model(inputs)
            loss = self.criterion(outputs, targets)
            loss.backward()
            
            # Gradient clipping (논문 스펙에 있으면)
            if self.config['training'].get('grad_clip'):
                torch.nn.utils.clip_grad_norm_(
                    self.model.parameters(), 
                    self.config['training']['grad_clip']
                )
            
            self.optimizer.step()
            total_loss += loss.item()
        
        if self.scheduler:
            self.scheduler.step()
        
        return total_loss / len(dataloader)
    
    def evaluate(self, dataloader, metrics):
        self.model.eval()
        results = {name: [] for name in metrics}
        with torch.no_grad():
            for batch in dataloader:
                inputs, targets = batch
                inputs, targets = inputs.to(self.device), targets.to(self.device)
                outputs = self.model(inputs)
                for name, fn in metrics.items():
                    results[name].append(fn(outputs, targets))
        return {name: sum(vals)/len(vals) for name, vals in results.items()}
```

## train.py 패턴

```python
# train.py
import argparse
import yaml
import torch
import random
import numpy as np
import os
from src.models.main_model import MainModel
from src.datasets.dataset import get_dataloader
from src.utils.trainer import Trainer
from src.utils.metrics import get_metrics

def set_seed(seed):
    """재현성을 위한 랜덤 시드 고정."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True

def main(config_path):
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    set_seed(config['training']['seed'])
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # 데이터 로더
    train_loader = get_dataloader(config, split='train')
    val_loader = get_dataloader(config, split='val')
    
    # 모델
    model = MainModel(config).to(device)
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Optimizer & Scheduler
    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=config['training']['learning_rate']
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=config['training']['epochs']
    )
    
    trainer = Trainer(model, optimizer, scheduler, config, device)
    metrics = get_metrics(config)
    
    best_val_metric = 0
    os.makedirs(config['output']['checkpoint_dir'], exist_ok=True)
    
    for epoch in range(config['training']['epochs']):
        train_loss = trainer.train_epoch(train_loader)
        val_results = trainer.evaluate(val_loader, metrics)
        
        print(f"Epoch {epoch+1}/{config['training']['epochs']}: "
              f"loss={train_loss:.4f}, " + 
              ", ".join(f"{k}={v:.4f}" for k, v in val_results.items()))
        
        # 체크포인트 저장
        if val_results[config['training']['main_metric']] > best_val_metric:
            best_val_metric = val_results[config['training']['main_metric']]
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'val_results': val_results
            }, f"{config['output']['checkpoint_dir']}/best.pt")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default='configs/config.yaml')
    args = parser.parse_args()
    main(args.config)
```

## 베이스라인 구현 원칙

```python
# src/models/baselines.py
class BaselineModel(nn.Module):
    """
    [베이스라인명] 구현.
    원본 논문: [인용] 또는 Section 5.1에서 비교 대상으로 언급됨.
    """
    pass
```

베이스라인은 논문의 비교 결과를 재현할 수 있는 수준으로 구현한다. 외부 구현이 있으면 래퍼로 감싸서 동일한 인터페이스를 제공한다.

## 논문 구현 미명시 항목 처리

`_workspace/01_ambiguities.md`를 참조하여 다음 우선순위로 결정한다:
1. 동일 저자의 다른 논문에서의 관행
2. 동일 태스크에서 일반적으로 사용되는 관행  
3. 가장 단순한 구현

결정 내용을 코드 주석에 반드시 기록한다: `# 미명시: [결정 내용] 적용 (일반적 관행)`
