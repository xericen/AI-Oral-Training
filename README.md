# 구강 근기능 훈련 시스템

웹캠 영상에서 자세와 얼굴·입술 움직임을 추출하고, 유지시간과 반복 횟수를 기준으로 훈련을 안내하는 연구용 웹 애플리케이션입니다. 캡스톤 구현 화면을 독립적으로 실행할 수 있도록 구성했습니다.

**기본 실행은 브라우저 방식입니다.** React 화면, YOLO 자세 추론, MediaPipe 얼굴 분석, 훈련 판정, 기록 저장이 사용자 브라우저에서 동작합니다. 일반적인 실행에 Python·FastAPI·별도 분석 서버는 필요하지 않습니다.

이전 서버 방식의 FastAPI 코드와 SQLite 스키마도 선택 실행용으로 포함합니다. 현재 브라우저 화면의 기록은 서버 DB와 자동 동기화되지 않습니다. WIZ 로그인·회원 DB·설명 페이지·사이드바는 이 저장소의 범위에 포함하지 않습니다.

> 사전학습 모델과 연구용 가설 임계값을 사용합니다. 임상 정확도·치료 효과는 검증하지 않았으며 의료적 진단을 제공하지 않습니다.

## 목차

- [주요 기능](#주요-기능)
- [빠른 시작](#빠른-시작)
- [사용 방법과 훈련 순서](#사용-방법과-훈련-순서)
- [구조와 데이터 흐름](#구조와-데이터-흐름)
- [AI 모델과 점수 해석](#ai-모델과-점수-해석)
- [DB와 기록 저장](#db와-기록-저장)
- [설정 변경](#설정-변경)
- [테스트와 검증 범위](#테스트와-검증-범위)
- [빌드와 정적 배포](#빌드와-정적-배포)
- [선택 기능: 이전 FastAPI 백엔드](#선택-기능-이전-fastapi-백엔드)
- [문제 해결](#문제-해결)
- [관련 문서와 라이선스](#관련-문서와-라이선스)

## 주요 기능

| 기능 | 현재 동작 |
|---|---|
| 홈·가이드 | 로컬 참여자 코드 설정 및 사용 순서 안내 |
| 웹캠 | Webcam 버튼으로 켜기·끄기, 거울 화면과 특징점 표시 |
| 자세 확인 | 한 명의 얼굴·어깨·골반 검출 및 보이는 상체 정렬 확인 |
| 입 움직임 | 입 벌리기·입술 오므리기 특징과 중립 기준값 비교 |
| 자동 진행 | 카메라·모델 준비 후 자동 시작, 단계 완료 후 자동 이동 |
| 훈련 기록 | 브라우저에 결과 저장, 목록·소요 시간 차트·단계별 상세 조회 |
| 모델 상태 | 모델 준비 상태, 현재 검출 점수·입 움직임 계수, 처리 시간·FPS 표시 |
| DB 재현 | IndexedDB 저장 코드와 선택 SQLite 테이블 생성 코드·SQL 제공 |

혀의 입안 움직임·삼킴·발음 정확도는 자동 분석하지 않습니다. 볼 부풀리기는 자동 판정 기준이 없어 기본 자동 훈련에서 제외합니다. 안내 예시는 일러스트이며 예시 영상은 준비 중입니다.

## 빠른 시작

### 준비 사항

- Node.js **24.x**와 npm: 확인한 실행 환경은 Node.js 24.15.0입니다. 현재 Vitest 의존성의 Node 요구 조건 때문에 이전 Node 버전은 피하세요.
- 웹캠과 카메라 권한이 있는 브라우저.
- WebAssembly SIMD, Worker, OffscreenCanvas와 필요한 그래픽 기능을 지원하는 브라우저. 다른 브라우저·OS의 전체 호환성 검증은 완료하지 않았습니다.
- 의존성 설치에는 인터넷이 필요합니다. 앱에 접속할 때도 모델·런타임 파일을 호스팅 서버에서 내려받아야 합니다.

### 설치 및 실행

```bash
git clone https://github.com/xericen/AI-Oral-Training.git
cd AI-Oral-Training
npm ci
npm run dev
```

터미널에 표시된 주소로 접속하세요. 기본 개발 주소는 `http://127.0.0.1:5173/`이며 포트가 사용 중이면 달라질 수 있습니다. 훈련 화면은 `/#/training`입니다.

`npm run dev`와 `npm run build`는 먼저 `scripts/prepare-browser-assets.mjs`를 실행합니다. 이 과정에서 설치된 ONNX Runtime·MediaPipe의 WASM 파일을 준비하고 분석 Worker를 번들링합니다. 처음에는 `npm ci`로 개발 의존성까지 설치해야 합니다.

브라우저용 모델은 `public/models/`에 포함되어 있으므로 기본 실행을 위해 별도로 다운로드하거나 Python으로 변환할 필요는 없습니다. `index.html` 파일을 직접 여는 대신 개발 서버 또는 정적 웹 서버로 접속하세요.

## 사용 방법과 훈련 순서

1. 홈에서 필요하면 로컬 참여자 코드를 설정합니다. 참여자 코드는 표시·기록용 값이며 로그인이나 접근 권한을 제공하지 않습니다.
2. **훈련하기**로 이동하고 모델 준비를 기다립니다.
3. 카메라 오른쪽 위 **Webcam** 버튼을 눌러 카메라를 허용합니다.
4. 한 사람의 얼굴, 양쪽 어깨와 골반이 정면으로 보이도록 구도를 조정합니다.
5. 카메라와 모델이 준비되면 분석이 자동 시작됩니다. 입을 편안하게 다문 중립 자세를 유지해 개인 기준을 측정합니다.
6. 화면 안내에 따라 아래 훈련을 진행합니다. 각 단계 완료 후 약 1.2초 뒤 다음 단계로 이동합니다.
7. 마지막 단계가 끝나면 결과를 자동 저장하고 해당 기록 화면으로 이동합니다. 중지할 때는 Webcam을 끄세요.

| 순서 | 항목 | 기본 유지시간 | 반복 |
|---|---|---|---|
| 사전 측정 | 중립 자세 기준 측정 | 2초, 표본 조건 충족 필요 | 세션 기준값 생성 |
| 1 | 준비자세 확인 | 2초 | 1회 |
| 2 | 입 크게 벌리기 | 2초 | 3회 |
| 3 | 입술 오므리기 | 2초 | 3회 |

반복 사이에는 중립 상태로 돌아와야 다음 반복을 인정합니다. 조건 이탈·미검출·프레임 지연·분석 중단이 발생하면 유지시간을 초기화합니다. 골반이 보이지 않으면 상체 정렬을 확인 불가로 처리하므로 준비 단계가 진행되지 않을 수 있습니다.

현재 UI는 자동 훈련 흐름을 제공합니다. 내부 코드에 일시정지·수동 완료 등의 제어 로직이 있어도, 화면에 해당 버튼이 모두 노출되는 것은 아닙니다.

## 구조와 데이터 흐름

```text
웹캠 영상
  → 브라우저 Worker: YOLO + MediaPipe 추론
  → 특징 추출: 자세·얼굴 방향·입 움직임
  → 중립 기준 보정 및 단계 판정
  → 화면 안내·유지시간·반복 횟수
  → IndexedDB 훈련 결과 저장
```

기본 흐름은 분석 API나 localhost 분석 서버에 영상을 보내지 않습니다. 웹 페이지·모델·WASM 파일을 가져오는 일반 네트워크 요청은 발생합니다. 완전한 오프라인 재접속을 보장하는 앱은 아닙니다.

```text
.
├── src/
│   ├── App.tsx                    # 홈·메뉴·라우팅·로컬 참여자 코드
│   ├── TrainingPage.tsx           # 훈련 화면과 자동 단계 이동
│   ├── ModelStatusPanel.tsx       # 모델 상태·점수·평가 한계 표시
│   ├── RecordsPage.tsx            # 기록 목록·차트·상세
│   ├── useCamera.ts               # 카메라 권한·영상 트랙 관리
│   ├── useTraining.ts             # 분석·세션·저장 흐름
│   ├── types.ts                   # 세션·단계·분석 데이터 타입
│   └── browser/
│       ├── client.ts              # Worker 요청·시간 제한·정리
│       ├── vision.worker.ts       # 실제 모델 추론
│       ├── pose.ts                # 자세 검출 후처리
│       ├── features.ts            # 특징 추출
│       ├── engine.ts              # 보정·유지시간·반복 판정
│       ├── config.ts              # 임계값·추론 설정
│       ├── exercises.json         # 운동 정의
│       └── records.ts             # IndexedDB 읽기·쓰기·집계
├── public/models/                 # 브라우저 모델·SHA256 manifest
├── public/runtime/                # Worker·WASM 런타임
├── scripts/prepare-browser-assets.mjs
├── backend/                       # 선택 실행용 이전 FastAPI·SQLite 코드
├── database/                      # DB 설명·빈 SQLite 생성 스키마
├── docs/                          # 구조·모델 출처·평가 계획
├── package.json
├── package-lock.json
└── vite.config.ts
```

주요 패키지는 React 19.1.0, TypeScript 5.8.3, Vite 6.4.5, ONNX Runtime Web 1.22.0, MediaPipe Tasks Vision 1.2.0, Recharts 3.10.1입니다. 정확한 설치 버전은 `package-lock.json`을 기준으로 재현하세요.

## AI 모델과 점수 해석

| 항목 | 모델·실행 방식 | 사용하는 정보 |
|---|---|---|
| 사람·자세 | YOLO11n-pose 사전학습 가중치를 ONNX로 변환, 320×320 입력 | 사람 수와 어깨·골반 등의 키포인트 |
| 얼굴·입 | MediaPipe Face Landmarker | 얼굴 랜드마크, 얼굴 방향, 입 움직임 blendshape 계수 |
| 실행 | 전용 classic Worker, ONNX Runtime Web WASM CPU 및 MediaPipe CPU | UI와 추론 작업 분리 |

모델을 이 프로젝트 데이터로 파인튜닝하지 않았습니다. 모델 파일의 SHA256은 [manifest](public/models/manifest.json)에 있습니다.

화면의 **현재 어깨 검출 신뢰 점수**는 양쪽 어깨 키포인트 점수의 평균입니다. **입 벌림 계수·입술 오므림 계수**는 0~1 계수를 백분율로 표시한 값입니다. 이 값들은 평가 정확도, 바른 자세일 확률, 훈련 성공률을 뜻하지 않습니다. 값이 없거나 오래된 경우에는 대기·확인 불가로 표시합니다.

정답이 표시된 별도 평가 데이터가 없어 정확도·Precision·Recall·F1은 아직 산출하지 않았습니다. 처리 시간과 FPS도 기기·브라우저에 따라 달라집니다.

## DB와 기록 저장

### 기본: IndexedDB

| 항목 | 값 |
|---|---|
| DB 이름 | `oral-training-browser-v1` |
| DB 버전 | `1` |
| Object store | `sessions` |
| 기본 키 | `id` |
| 구현 | `src/browser/records.ts` |

세션 ID, 참여자 코드, 시작·종료 시각, 상태, 소요 시간, 단계별 성공·목표·재시도 횟수, 모델 버전과 중립 보정값을 저장합니다. 영상 파일이나 전체 얼굴 랜드마크는 기록 DB에 저장하지 않습니다.

기록은 같은 브라우저·같은 사이트 출처에서 유지됩니다. 다른 브라우저·기기에 자동 공유되지 않으며 사이트 데이터를 지우면 삭제됩니다. `localhost`와 `127.0.0.1`, 서로 다른 포트·도메인은 다른 출처이므로 기록이 따로 보일 수 있습니다. 참여자 코드를 바꾸는 것은 계정 전환이나 기록 접근 통제가 아닙니다.

### 선택: 이전 서버 SQLite

`backend/app/db.py`에는 다음 테이블을 생성하는 SQLAlchemy 모델이 있습니다.

| 테이블 | 저장 내용 |
|---|---|
| `training_sessions` | 세션 식별자·참여자 코드·진행 상태·시간·모델/규칙 버전 |
| `step_results` | 세션별 운동 단계·반복 횟수·재시도·소요 시간·완료 상태 |
| `calibration_profiles` | 세션별 중립 기준값과 보정 정보 |

기본 파일은 `backend/training.sqlite3`이며 서버 시작 시 테이블을 생성합니다. SQLite CLI가 설치되어 있다면 저장소 루트에서 빈 DB를 직접 만들 수도 있습니다.

```bash
sqlite3 backend/training.sqlite3 < database/schema.sql
```

`schema.sql`에는 테이블·인덱스 정의만 있고 사용자 기록은 없습니다. 현재 브라우저 화면은 이 SQLite DB에 기록을 저장하지 않으며 기존 서버 기록을 IndexedDB로 자동 이전하지 않습니다. 상세 내용은 [DB 문서](database/README.md)를 참고하세요.

## 설정 변경

| 변경 대상 | 파일 | 적용 방법 |
|---|---|---|
| 브라우저 판정 임계값·보정 시간 | `src/browser/config.ts` | 개발 서버 확인 또는 재빌드 |
| 운동 이름·유지시간·횟수 | `src/browser/exercises.json` | 재빌드 후 새 훈련에서 확인 |
| 프레임 크기·간격·추론 제한 | `src/browser/config.ts` | 기기 성능·지연 영향을 함께 확인 |
| 서버 방식 임계값·운동 | `backend/settings.json`, `backend/exercises.json` | 선택 백엔드 재시작 |
| 서버 DB 경로·모델 폴더·허용 출처 | `backend/app/config.py`의 환경변수 | 선택 백엔드 실행 환경에 설정 |

브라우저 자동 훈련 목록은 `enabled && auto_complete` 조건으로 선택합니다. 볼 부풀리기 정의가 파일에 있어도 `auto_complete: false`이므로 기본 훈련에 나오지 않습니다. 자동 관측할 근거 없이 이 플래그만 켜서 판정을 추가하지 마세요.

현재 화면의 일부 안내 문구·일러스트는 기본 3단계 순서에 맞춰져 있습니다. 운동 JSON만 바꾸면 모든 UI 안내가 자동 변경되는 구조는 아니므로 `TrainingPage.tsx`와 가이드도 함께 검토해야 합니다. 브라우저 설정과 이전 서버 설정은 서로 자동 동기화되지 않습니다.

## 테스트와 검증 범위

### 프론트엔드

저장소 루트에서 실행합니다.

```bash
npm test
npm run build
```

`npm test`는 Vitest로 판정·시간·반복·자세 후처리와 모델 상태 패널 표시를 검사합니다. `npm run build`는 TypeScript 검사와 정적 빌드를 수행합니다.

### 선택 백엔드

Python 환경을 준비한 뒤 `backend/`에서 실행합니다.

```bash
python -m pytest -q -m "not real"
```

실제 가중치를 사용하는 테스트는 별도입니다. 모델 다운로드와 테스트 사진을 준비한 뒤 실행하세요.

```bash
python scripts/download_models.py
python scripts/download_test_fixture.py
python -m pytest -q -m real -s
```

실제 모델 테스트도 샘플 추론 확인이며 실제 사용자의 훈련 정확도나 치료 효과 평가를 대신하지 않습니다.

### 확인된 결과와 미검증 범위

2026-10-28의 기능 업로드 검증에서 프론트엔드 **22개**, 백엔드 일반 테스트 **26개**가 통과했고 정적 빌드와 SQLite 빈 테이블 3개 생성도 확인했습니다. 실제 모델 테스트 2개는 해당 검증에서 제외했습니다.

빌드에는 500kB 초과 JS 번들 경고가 있고, 백엔드 테스트에는 의존성의 deprecation 경고가 있습니다. 실제 참가자 웹캠으로 전체 훈련을 완료하는 평가, 여러 OS·브라우저의 성능, 임상 기준 임계값, 정확도·F1은 검증하지 않았습니다. 기존 연구 계획은 [평가 계획](docs/evaluation-plan.md)을 참고하세요.

## 빌드와 정적 배포

```bash
npm ci
npm run build
npm run preview
```

`npm run preview`는 생성된 빌드의 로컬 확인용입니다. 운영 배포에서는 **`dist/` 전체 내용**을 HTTPS 정적 호스팅에 올리세요. GitHub에 소스를 push하는 것만으로 사이트가 배포되지는 않습니다. 이 저장소에는 자동 배포 워크플로를 구성하지 않았습니다.

- `dist/models/`, `dist/runtime/`, `dist/assets/`를 빠짐없이 배포합니다.
- Worker·모델·WASM 경로가 404나 HTML 오류 페이지를 반환하지 않는지 확인합니다.
- 화면은 HashRouter를 사용합니다. 예: `https://example.com/#/training`, `/#/records`, `/#/guide`.
- Vite의 `base`는 상대 경로 `./`입니다. 하위 경로 호스팅도 실제 배포 경로에서 모델·Worker 로드를 확인해야 합니다.
- 카메라 사용은 HTTPS 또는 localhost 환경에서 확인합니다. iframe으로 넣는 경우 상위 페이지의 카메라 권한 허용도 필요합니다.
- 기존 단일 스레드 WASM 구성은 공유 메모리 격리 헤더를 전제로 하지 않습니다. 다른 브라우저 보안 정책까지 자동 해결하는 것은 아닙니다.

## 선택 기능: 이전 FastAPI 백엔드

현재 브라우저 훈련을 사용하려는 경우 이 절차는 생략해도 됩니다. 이전 서버 API·SQLite 구현을 확인하려는 개발자를 위한 경로입니다.

### 환경 및 설치

확인한 서버 환경은 Python **3.11.14**, Linux x86_64 CPU입니다. 다른 OS의 설치·전체 실행은 미검증입니다.

```bash
cd backend
python -m venv .venv
```

가상환경 활성화:

```bash
# Linux / macOS
source .venv/bin/activate
```

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
```

활성화한 환경에서 설치·실행합니다.

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
python scripts/download_models.py
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

이 다운로드는 이전 서버용 `.pt`·`.task` 모델을 `backend/models/`에 준비하는 절차입니다. 기본 브라우저용 `public/models/`와는 별도입니다. 서버 모델 파일은 저장소에서 제외하며 다운로드 스크립트가 출처·SHA256 manifest를 갱신합니다.

Linux CPU 검증 환경을 재현할 때는 기본 requirements 설치 대신 다음 잠금 목록을 참고할 수 있습니다. OS별 CPU 패키지 배포 차이가 있습니다.

```bash
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements-lock.txt
```

### 환경변수

| 변수 | 기본값·역할 |
|---|---|
| `ORAL_DATABASE_URL` | `backend/training.sqlite3`를 가리키는 SQLite URL |
| `ORAL_MODEL_DIR` | `backend/models/` |
| `ORAL_SETTINGS` | `backend/settings.json` |
| `ORAL_ORIGINS` | 허용하는 브라우저 출처를 쉼표로 구분 |

예시는 [backend/.env.example](backend/.env.example)에 있습니다. `.env`를 만들었다면 Uvicorn 실행 시 `--env-file .env`를 명시하세요. 실제 접속 정보가 든 `.env`는 커밋하지 않습니다.

### API 확인

| 방식 | 경로 | 용도 |
|---|---|---|
| GET | `/api/health` | 서버 상태·모델 상태 |
| GET | `/api/model/status` | 추론 모델 준비 상태 |
| GET | `/api/exercises` | 서버 운동 목록 |
| POST | `/api/sessions` | 세션 생성 |
| GET | `/api/sessions/{sid}` | 진행 세션 조회 |
| POST | `/api/sessions/{sid}/finish` | 세션 종료 |
| POST | `/api/calibration` | 보정 요청 |
| GET | `/api/records`, `/api/records/{sid}` | 서버 기록 조회 |
| GET | `/api/summary` | 서버 기록 집계 |
| WebSocket | `/ws/training/{sid}` | 이전 방식 프레임 분석 |

서버 실행 후 `http://127.0.0.1:8000/docs`에서 요청·응답 스키마를 확인할 수 있습니다. 서버가 켜져 있는 것과 모델 추론이 준비된 것은 다르므로 `/api/model/status`도 확인하세요.

루트에서 프론트엔드를 빌드한 뒤 서버를 시작하면 루트 `dist/`를 정적 제공할 수 있습니다. 이때도 현재 화면은 브라우저 추론·IndexedDB를 사용합니다. 백엔드를 실행하는 것만으로 화면이 서버 분석 모드로 전환되지는 않습니다.

이 API는 단일 사용자 로컬 연구용이며 외부 공개용 인증·접근 통제를 구현하지 않았습니다. 기본 명령의 `127.0.0.1` 바인딩을 유지해 로컬에서 확인하세요.

## 문제 해결

| 증상 | 확인 및 조치 |
|---|---|
| `npm ci` 또는 테스트 실행 실패 | Node.js 24.x, 저장소 루트 실행, lockfile 존재 여부를 확인합니다. 먼저 오류 메시지의 버전·네트워크 원인을 확인합니다. |
| 카메라를 켤 수 없음 | localhost/HTTPS로 접속하고 사이트 카메라 권한·장치 연결·다른 앱의 카메라 사용을 확인합니다. |
| iframe에서 카메라 거부 | 상위 페이지의 카메라 권한 정책과 iframe 카메라 허용을 확인합니다. |
| 모델 준비 시간 초과·404 | `models/`·`runtime/` 배포 경로와 네트워크 응답을 확인하고 모델 다시 준비를 실행합니다. 기본 준비 제한은 90초입니다. |
| WASM·Worker 오류 | 지원 브라우저인지 확인하고 전체 개발 의존성을 설치한 뒤 `npm run build`를 다시 실행합니다. |
| 준비자세에서 진행되지 않음 | 한 사람의 얼굴·양쪽 어깨·골반이 모두 정면으로 보이게 구도를 조정합니다. |
| 반복 횟수가 올라가지 않음 | 동작을 2초 유지하고 반복 사이 중립으로 돌아옵니다. 조건 이탈·지연은 시간을 초기화합니다. |
| 기록이 보이지 않음 | 같은 브라우저·도메인·포트인지 확인합니다. 서버 SQLite 기록은 브라우저 목록에 합쳐지지 않습니다. |
| 기록 저장 실패 | 사이트 저장소 권한·용량 제한을 확인합니다. 사이트 데이터 삭제는 기존 기록도 지우므로 먼저 보존 여부를 판단합니다. |
| 숫자가 정확도로 오해됨 | 모델 상태 패널의 키포인트 점수·움직임 계수와 실제 평가 정확도를 구분합니다. 현재 평가 정확도는 미측정입니다. |
| 선택 백엔드 모델 미준비 | 가상환경·다운로드 경로를 확인하고 `/api/model/status`의 오류를 확인합니다. |

## 관련 문서와 라이선스

- [DB 구조·생성 방법](database/README.md)
- [브라우저 구조](docs/browser-architecture.md)
- [모델 출처·라이선스 참고](docs/model-attribution.md)
- [브라우저 모델 SHA256](public/models/manifest.json)
- [이전 서버 구조](docs/architecture.md)
- [이전 서버 실행 이력](docs/legacy-server.md)
- [실사용 평가 계획](docs/evaluation-plan.md)

일부 보존 문서는 WIZ 원본의 `frontend/` 경로를 사용합니다. 이 저장소에서는 그 내용을 루트에 배치했으므로 `cd frontend` 대신 저장소 루트에서 npm 명령을 실행하세요. WIZ 게시 도구나 원본 프로젝트 폴더가 필요한 절차는 이 독립 저장소만으로 실행할 수 없습니다. 현재 실행·저장 방식은 이 README와 실제 코드를 기준으로 확인하세요.

Ultralytics, MediaPipe, ONNX Runtime과 포함 모델·런타임에는 각각의 라이선스 조건이 적용됩니다. 출처와 조건은 위 모델 문서 및 원 프로젝트를 확인하세요. 이 README는 프로젝트 전체에 새로운 배포 라이선스를 부여하지 않습니다.
