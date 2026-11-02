# 구강 근기능 훈련 시스템

웹캠 영상을 브라우저 안에서 분석해 목·어깨·입술·턱 움직임을 안내하고, 훈련 결과를 기록하는 연구용 웹 애플리케이션입니다. 기본 실행에는 별도 Python 분석 서버가 필요하지 않습니다.

> 이 프로젝트의 판정 기준은 연구용 가설값이며 의료기기, 진단 도구 또는 치료 효과 판정 도구가 아닙니다. 통증이나 불편함이 있으면 즉시 중단하고 전문가와 상담하세요.

## 주요 기능

- YOLO11n-pose로 상반신과 자세 키포인트 분석
- MediaPipe Face Landmarker로 얼굴 478개 랜드마크와 표정 계수 분석
- 전용 Web Worker와 ONNX Runtime WebAssembly를 이용한 기기 내 추론
- 기본 운동, 몸풀기, 입 운동, 혀 운동, 말하기 운동, 전체 운동의 6개 코스
- 카메라 거울 모드, 특징점 표시, 전체 화면, 중립 자세 재측정
- 단계별 유지 시간·반복 횟수·건너뛰기 상태 기록
- IndexedDB 로컬 저장과 로그인 사용자의 서버 기록 동기화
- 큰 글씨와 동작 그림을 제공하는 사용 가이드

## 빠른 실행

### 요구 환경

- Node.js 20 이상 권장
- npm
- WebAssembly SIMD, Web Worker, OffscreenCanvas, WebGL을 지원하는 최신 Chrome 또는 Edge 권장
- 웹캠 사용을 위한 HTTPS 또는 `localhost` 환경

### 개발 서버

```bash
cd frontend
npm ci
npm run dev
```

터미널에 표시되는 Vite 주소를 브라우저에서 엽니다. 최초 실행 시 모델과 WebAssembly 파일을 읽는 동안 준비 시간이 필요할 수 있습니다.

### 테스트와 프로덕션 빌드

```bash
cd frontend
npm test
npm run build
```

`predev`와 `prebuild`가 필요한 Worker·WebAssembly 런타임을 `frontend/public/runtime/`에 준비합니다.

## 사용 방법

1. 홈에서 훈련 코스를 선택합니다.
2. 오른쪽 위 사람 메뉴에서 참여자 코드, 거울 화면, 특징점, 마이크 옵션을 설정합니다.
3. `훈련하기`에서 Webcam을 켜고 카메라 권한을 허용합니다.
4. 얼굴과 양쪽 어깨가 화면에 보이도록 정면 자세를 유지합니다.
5. 오른쪽 단계 안내와 동작 그림을 따라 천천히 움직입니다.
6. 조건을 유지하면 단계가 완료되고 다음 단계로 이동합니다.
7. 마지막 단계가 끝나면 결과가 자동 저장되며 `기록`에서 확인할 수 있습니다.

페이지를 떠나거나 Webcam을 끄면 카메라와 분석 Worker가 정리됩니다. 영상 프레임은 저장하지 않습니다.

## 훈련 코스

| ID | 코스 | 내용 | 기본 판정 방식 |
|---|---|---|---|
| `basic` | 기본 운동 | 준비 자세, 입 벌리기, 입술 오므리기 | 자세·얼굴 AI |
| `A` | 몸풀기 | 호흡, 목 돌림·기울임, 어깨·상체 운동 | AI + 시간 안내 |
| `B` | 입 운동 | 입술, 볼, 모음 입 모양, 턱 운동 | AI + 시간 안내 + 직접 확인 |
| `C` | 혀 운동 | 혀 내밀기와 방향별 움직임 | 시간 안내 |
| `D` | 말하기 운동 | 파·타·카·라·파타카라 | 시간 안내, 선택 시 음성 텍스트 확인 |
| `E` | 전체 운동 | 몸풀기부터 말하기와 정리 운동까지 | 위 방식 조합 |

### 판정 방식과 한계

| 표시 | 의미 | 주의사항 |
|---|---|---|
| 자세 AI | YOLO 상반신 키포인트 기반 | 골반이 보이지 않으면 상체 중심과 어깨를 기준으로 판단 |
| 얼굴 AI | MediaPipe 랜드마크·표정 계수 기반 | 임계값은 임상 검증되지 않은 가설값 |
| 시간 안내 | 정해진 시간 동안 동작 안내 | 실제 동작 성공 여부를 AI가 확인하지 않음 |
| 직접 확인 | 사용자가 완료를 직접 선택 | 자동 판정으로 간주하지 않음 |
| 음성 텍스트 | 브라우저 음성 인식 결과와 목표 음절 비교 | 발음 정확도나 치료 효과를 평가하지 않음 |

- 볼 부풀리기는 기본적으로 시간 안내입니다. 설정에서 `실험적 볼 외형 판정`을 켠 경우에만 얼굴 특징값으로 판정합니다.
- 혀 방향 분류 코드와 선택형 ONNX 로더는 포함되어 있지만, 검증된 `tongue-direction.onnx` 모델은 저장소에 포함되어 있지 않아 현재 코스는 시간 안내로 동작합니다.
- 한 프레임의 추론이 끝난 뒤 다음 프레임을 처리해 분석 요청이 겹치지 않도록 합니다.
- 검출 실패, 오래된 프레임, 조건 이탈, 일시정지 시 유지 시간을 초기화합니다.
- 같은 동작을 반복할 때는 중립 자세로 돌아온 뒤 다음 반복을 인정합니다.

## 실행 구조

```text
Webcam
  → ImageBitmap
  → Web Worker
  → YOLO11n-pose + MediaPipe Face Landmarker
  → 특징값 정규화 및 중립 기준 보정
  → 단계 판정 엔진
  → React UI / Canvas 오버레이
  → IndexedDB 저장
  → 로그인 시 WIZ 기록 API로 결과 동기화
```

카메라 픽셀은 기본 브라우저 실행 경로에서 HTTP나 WebSocket으로 전송하지 않습니다. 네트워크는 페이지·모델·런타임 파일 다운로드와 로그인 기록 동기화에 사용됩니다.

## 데이터 저장

### 브라우저 로컬 저장

- IndexedDB 데이터베이스: `oral-training-browser-v1`
- 저장 항목: 세션 요약, 단계별 결과, 중립 기준값, 동기화 상태
- 저장하지 않는 항목: 영상, 프레임 이미지, 전체 얼굴 랜드마크, 음성 원본
- 같은 브라우저와 같은 사이트에서 새로고침 후에도 기록을 조회할 수 있습니다.

### 로그인 기록 동기화

- 로그인 사용자는 `/wiz/api/page.capstone/training_records`로 세션·단계 결과 동기화를 시도합니다.
- 서버가 일시적으로 응답하지 않으면 로컬 기록을 유지하고 다시 동기화합니다.
- 비로그인 기록은 해당 브라우저에만 남으며 다른 기기와 자동 공유되지 않습니다.
- 다른 계정 소유의 로컬 기록은 가져오지 않도록 검사합니다.

## 프로젝트 구조

```text
oral-training-system/
├── frontend/                 # 현재 기본 React/Vite 브라우저 앱
│   ├── public/
│   │   ├── guides/           # 단계별 동작 안내 이미지
│   │   ├── models/           # 브라우저 AI 모델과 해시 manifest
│   │   └── runtime/          # Worker와 WASM 런타임
│   ├── scripts/              # 브라우저 런타임 준비 스크립트
│   └── src/
│       ├── browser/          # 추론, 특징 추출, 판정, 저장, 동기화
│       ├── App.tsx           # 라우팅과 공통 화면
│       ├── TrainingPage.tsx  # 훈련 화면
│       └── RecordsPage.tsx   # 기록 화면
├── backend/                  # 선택형·레거시 FastAPI 분석 서버
├── database/                 # 선택형 SQLite 스키마와 저장 구조 문서
├── docs/                     # 구조, 평가 계획, 모델 출처 문서
└── scripts/                  # 모델 변환과 WIZ 게시 도구
```

## 핵심 설정 파일

- `frontend/src/browser/courses.ts`: 코스와 단계 구성
- `frontend/src/browser/exercises.json`: 기본 단계 정의
- `frontend/src/browser/config.ts`: 모델 입력 크기와 기본 임계값
- `frontend/src/browser/movement.ts`: 개인별 조정 가능한 움직임 판정값
- `frontend/src/browser/engine.ts`: 유지 시간, 반복, 중립 복귀 판정
- `frontend/public/models/manifest.json`: 배포 모델 SHA-256
- `docs/model-attribution.md`: 모델 출처와 라이선스 안내

## WIZ 프로젝트 반영

프론트엔드 빌드 결과를 현재 WIZ 프로젝트의 정적 자산으로 게시할 때만 다음 스크립트를 사용합니다.

```bash
cd frontend
npm ci
npm run build
python ../scripts/publish_wiz.py
```

그 다음 현재 WIZ 프로젝트에서 일반 빌드를 수행합니다. `publish_wiz.py`는 분석 서버가 아니라 빌드 결과를 복사하는 개발 도구입니다.

## 선택형 FastAPI 서버

`backend/`는 초기 서버 분석 방식의 재현·비교용 구현입니다. 현재 기본 React 앱은 이 서버를 호출하지 않습니다. 브라우저 기본 실행에는 설치하거나 실행할 필요가 없습니다.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/download_models.py
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

기본 데이터베이스는 `backend/training.sqlite3`이며 `ORAL_DATABASE_URL`로 SQLAlchemy 연결 문자열을 바꿀 수 있습니다. 이 경로에서도 영상 프레임은 저장하지 않습니다. 자세한 과거 구조는 `docs/legacy-server.md`를 참고하세요.

## 모델 변환

일반 실행에는 변환이 필요하지 않습니다. 모델을 다시 변환하는 개발자만 별도 Python 환경에서 실행합니다.

```bash
backend/.venv/bin/python scripts/export_browser_model.py
```

YOLO11n-pose 사전학습 가중치를 ONNX opset 17, 320×320 입력으로 변환하며 파인튜닝하지 않습니다. 배포 전 Ultralytics와 MediaPipe의 라이선스 조건을 반드시 확인하세요.

## 문제 해결

### 카메라가 열리지 않음

- 사이트의 카메라 권한을 허용했는지 확인합니다.
- HTTPS 또는 `localhost`에서 실행했는지 확인합니다.
- 다른 앱이 카메라를 독점하고 있지 않은지 확인합니다.

### AI 모델 준비 실패

- 새로고침 후 모델 준비가 끝날 때까지 기다립니다.
- `frontend/public/models/`와 `frontend/public/runtime/` 파일이 함께 배포됐는지 확인합니다.
- WebAssembly SIMD와 Worker를 지원하는 최신 브라우저를 사용합니다.

### 단계가 진행되지 않음

- 얼굴과 양쪽 어깨가 화면 안에 들어오도록 거리를 조절합니다.
- 조명을 밝게 하고 카메라를 정면에 둡니다.
- 사람 설정에서 중립 자세를 다시 측정하거나 개인별 움직임 임계값을 조절합니다.
- AI 판정이 아닌 단계는 시간 안내 또는 직접 확인 방식인지 확인합니다.

### 기록이 다른 기기에 보이지 않음

- 비로그인 기록은 현재 브라우저에만 저장됩니다.
- 로그인 상태와 기록 화면의 동기화 경고를 확인합니다.
- 서버 동기화가 실패해도 로컬 기록은 유지되므로 다시 시도할 수 있습니다.

## 검증 명령

```bash
cd frontend
npm test
npm run build

cd ../backend
.venv/bin/pytest
```

브라우저 자동 테스트는 코스 구성, 단계 엔진, 저장·동기화, 기능 지원 여부와 오버레이 계산을 다룹니다. 실제 참가자의 웹캠 환경, 브라우저·운영체제별 성능, 임상 정확도와 치료 효과는 별도 검증이 필요합니다.

2026-11-02 기준으로 프론트엔드 자동 테스트 75개, 프로덕션 빌드, 백엔드 자동 테스트 28개가 통과했습니다. 백엔드 테스트에는 의존 라이브러리의 deprecation 경고 1건이 남아 있습니다.

## 관련 문서

- `docs/browser-architecture.md`: 브라우저 실행 구조
- `docs/architecture.md`: 전체 구성과 초기 서버 구조
- `docs/evaluation-plan.md`: 평가 계획
- `docs/model-attribution.md`: 모델 출처·해시·라이선스
- `docs/legacy-server.md`: 이전 서버 실행 방식
