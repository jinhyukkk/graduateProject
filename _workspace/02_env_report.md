# 환경 구성 보고서

## 환경 정보
- 환경 이름: sc_tsql_env
- Python 버전: 3.10
- PyTorch 버전: 2.4.1
- GPU 필수 여부: 아니오 (API 기반 LLM 사용)

## 생성된 구조
```
졸업프로젝트2/
├── src/                    ✅  소스 코드 (모듈 구현)
│   └── __init__.py         ✅  패키지 초기화
├── data/
│   ├── raw/                ✅  원본 데이터셋 (Spider, BIRD, EnterpriseDB)
│   └── processed/          ✅  전처리된 데이터
├── configs/                ✅  설정 파일 (YAML)
├── outputs/
│   ├── checkpoints/        ✅  체크포인트
│   └── logs/               ✅  실행 로그
├── setup_env.sh            ✅  환경 설치 스크립트
├── requirements.txt        ✅  Python 패키지 목록
├── environment.yml         ✅  conda 환경 파일
└── .env.example            ✅  환경 변수 템플릿
```

## 주요 패키지

| 패키지 | 버전 | 용도 |
|--------|------|------|
| openai | 1.51.0 | GPT-4o API (SQL 생성, 역번역, 설명) |
| transformers | 4.44.2 | NLI 모델 (의미 일관성 검증) |
| torch | 2.4.1 | transformers 백엔드 |
| sentence-transformers | 3.1.1 | 임베딩 기반 유사도 계산 |
| faiss-cpu | 1.8.0 | 임베딩 벡터 검색 (Schema Linker) |
| sqlparse | 0.5.1 | SQL 구문 분석 |
| numpy | 1.26.4 | 수치 연산 |
| pandas | 2.2.3 | 데이터프레임 처리 |
| datasets | 3.0.1 | HuggingFace 데이터셋 로딩 |
| scikit-learn | 1.5.2 | 평가 유틸리티 |
| PyYAML | 6.0.2 | 설정 파일 파싱 |
| tqdm | 4.66.5 | 진행 표시 |
| loguru | 0.7.2 | 구조화된 로깅 |

## 데이터셋 준비 (수동)

| 데이터셋 | 다운로드 URL | 저장 위치 |
|---------|-------------|----------|
| Spider | https://yale-lily.github.io/spider | data/raw/spider/ |
| BIRD | https://bird-bench.github.io/ | data/raw/bird/ |
| EnterpriseDB | 내부 구축 (47 테이블, 312 컬럼, 200 질의) | data/raw/enterprise/ |

## 알려진 제한사항
- GPU 불필요 (API 기반 LLM 사용이므로 CPU 환경에서 실행 가능)
- OPENAI_API_KEY 설정 필수 (`.env.example` → `.env` 복사 후 키 입력)
- Spider/BIRD 데이터셋은 수동 다운로드 필요

## 활성화 방법
```bash
# 방법 1: setup_env.sh로 전체 설치
bash setup_env.sh

# 방법 2: 이미 환경이 있는 경우
conda activate sc_tsql_env

# 방법 3: environment.yml로 환경 생성
conda env create -f environment.yml
conda activate sc_tsql_env
```
