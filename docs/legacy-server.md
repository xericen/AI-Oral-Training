# 이전 서버 실행 방식 참고

현재 기본 화면은 서버 없이 브라우저에서 실행됩니다. 아래는 이전 Python 서버 방식의 보존 문서이며 현재 사용자에게 필요한 실행 절차가 아닙니다. 기존 SQLite 기록·API 구현은 삭제하지 않았지만 새 브라우저 기록으로 자동 이전되지 않습니다.

# AI 기반 구강 근기능 훈련 시스템

현재 캡스톤의 민트·청록색 디자인, 작은 좌우 패널과 큰 카메라, Webcam 켜기·끄기를 유지한 React + FastAPI 로컬 프로토타입입니다.
기존 WIZ 노트·공유 데이터와 분리된 SQLite에 훈련 기록을 저장하며, WIZ /capstone의 구현 탭에서도 React 클라이언트를 엽니다.

## 실행 환경
검증 환경: Python **3.11.14**, Node **24.15.0**, Linux x86_64 CPU.
요청한 실행 명령을 그대로 지원합니다. Python 3.14의 기존 WIZ 가상환경과 섞지 마세요.
패키지: frontend/package-lock.json, backend/requirements.txt 및 실제 검증 설치의 requirements-lock.txt.
모델을 파인튜닝하지 않습니다.

## 1. 백엔드
프로젝트 폴더 oral-training-system에서 시작합니다.

```bash
cd backend
python -m venv .venv
```

가상환경 활성화:
- Linux/macOS: `source .venv/bin/activate`
- Windows PowerShell: `.venv\\Scripts\\Activate.ps1`
- Windows cmd: `.venv\\Scripts\\activate.bat`

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
python scripts/download_models.py
uvicorn app.main:app --reload --port 8000
```

Linux CPU에서 검증 환경을 재현하려면 requirements 대신:
```bash
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements-lock.txt
```
CPU 전용 torch 버전은 OS별 배포가 다릅니다. macOS는 기본 requirements.txt 설치를 사용하세요. 다른 OS에서의 실제 실행은 아직 검증하지 않았습니다.
이 작업 서버에서는 uv로 만든 Python 3.11 환경이라 `.venv/bin/python -m uvicorn app.main:app --port 8000` 또는 `uv pip`도 사용할 수 있습니다.

- 건강 상태: http://127.0.0.1:8000/api/health
- API 문서: http://127.0.0.1:8000/docs
- 모델 상태: http://127.0.0.1:8000/api/model/status
- 모델은 서버 시작 시 한 번 로드합니다. 파일이 없으면 inference_available=false와 원인 표시. 가짜 결과로 대체하지 않습니다.
- 모델 파일·URL·SHA256은 backend/models/manifest.json.
- .env.example은 선택사항입니다. 복사하여 환경변수를 바꾸려면 `uvicorn app.main:app --env-file .env --reload --port 8000`을 사용하세요.
- 기본 DB: backend/training.sqlite3. 영상·JPEG·전체 랜드마크는 DB에 저장하지 않습니다.

## 2. 프론트엔드
새 터미널에서:

```bash
cd frontend
npm install
npm run dev
```

http://127.0.0.1:5173/#/training 에 접속합니다. Vite가 /api와 /ws를 8000번 FastAPI로 프록시합니다.

프로덕션 빌드:
```bash
npm run build
```
빌드 후 FastAPI를 새로 시작하면 http://127.0.0.1:8000/#/training 에서 동일 앱을 제공합니다.
WIZ 서버는 재시작하지 않습니다.

## 3. 실제 훈련 사용
1. Webcam을 눌러 카메라 권한을 허용합니다. 다시 누르면 트랙·분석 연결이 종료됩니다.
2. 얼굴·어깨·골반이 모두 보이도록 구도를 조정합니다. 골반이 안 보이면 상체 정렬을 확인 불가로 처리합니다.
3. 프레임 전송에 동의하고 분석 시작을 누릅니다.
4. 중립 입 모양·정면 자세 2초 측정으로 개인 기준을 만듭니다.
5. 준비자세를 2초 유지합니다. 입 벌리기·입술 오므리기를 각 2초씩 3회 반복합니다. 각 반복 사이에는 중립으로 복귀해야 합니다.
6. 볼 부풀리기는 검증 전이므로 직접 1회 완료 버튼을 사용합니다. AI 자동 성공으로 표시하지 않습니다.
7. 마지막 단계에서 결과 저장을 누릅니다. 중간에 종료하려면 훈련 종료·현재 기록 저장을 사용합니다.
8. 기록 메뉴의 목록·차트·세션 상세에서 실제 저장값을 확인합니다.
9. 연결 끊김·일시정지·얼굴 미검출·조건 이탈·지연 때 유지시간은 초기화됩니다.
10. 서버를 재시작하면 진행 중 상태는 interrupted로 남습니다. 저장 기록은 유지되지만 새 훈련을 시작해야 합니다.

거울 모드는 표시 영상·Canvas에 함께 적용하며 전송 원본은 뒤집지 않습니다.
특징점 표시를 꺼도 추론은 계속됩니다. 자동 다음 단계는 목표 횟수를 충족한 뒤에만 동작합니다.
홈에서 로컬 참여자 코드와 분석 서버 주소를 설정할 수 있습니다. 참여자 코드는 로그인·접근 통제 기능이 아닙니다.

## 4. 기존 WIZ에 반영
```bash
cd frontend
npm run build
python ../scripts/publish_wiz.py
```
그다음 현재 프로젝트의 WIZ 일반 빌드를 실행합니다. 빌드 React 파일은 src/assets/oral-training으로 복사됩니다.
WIZ /capstone 구현 탭은 해당 클라이언트를 iframe으로 엽니다. 설명 탭 이동 시 iframe을 제거하여 카메라를 해제합니다.
WIZ에서의 기본 분석 서버 주소는 **사용자 컴퓨터의** http://127.0.0.1:8000 입니다. FastAPI를 그 컴퓨터에서 실행해야 합니다.
서버가 꺼져 있으면 명확한 연결 오류를 표시하며, 원격 WIZ 서버에서 자동으로 로컬 모델을 실행한다고 가정하지 않습니다.
HTTPS 사이트에서 로컬 HTTP/WebSocket 연결이 브라우저 정책에 의해 제한되면 독립 Vite localhost 앱을 이용하거나 동일 출처 HTTPS 프록시를 구성해야 합니다.
WIZ 공유 권한이 로컬 SQLite 기록에 대한 원격 접근 권한으로 확장되지 않습니다.

## 5. 설정
- backend/settings.json 및 app/config.py: 가설 임계값, 카메라 가시성·방향, 프레임 간격, 중립 측정, CPU 스레드, 판정 버전.
- backend/exercises.json: 단계별 시간·횟수·사용 여부. 입꼬리 당기기 및 자동 관측 불가 훈련은 비활성 데이터로 포함됩니다. 혀·삼킴·발음 항목은 활성화하더라도 수동 방식만 지원합니다.
- frontend/src/config.ts: 전송 크기·JPEG 품질·목표 FPS·응답 제한·오버레이 최대 지연.
- 임계값을 바꾸면 rules version을 올리고 서버를 다시 시작하여 새 세션에서 시험하세요. 이는 의료 기준이 아닙니다.
- 볼 부풀리기의 auto_complete를 임의로 켜는 것은 지원하지 않습니다. 실험 검증 전에는 MANUAL 설정을 유지하세요.

## 6. 테스트
```bash
cd backend
python -m pytest -q -m "not real"
python -m pytest -q -m real -s
```
일반 테스트는 합성 검출값으로 규칙·상태·DB·REST·WebSocket을 검증합니다.
real 테스트는 실제 모델·공식 사진으로 추론·얼굴 478점·blendshape·미검출·잘못된 JPEG 오류를 검증합니다.
공식 테스트 사진이 없는 새 설치에서는 다음과 같이 준비할 수 있습니다:
```bash
python scripts/download_test_fixture.py
```
프론트엔드는 `npm run build`로 TypeScript를 검사합니다.

**확인한 것:** 자동 규칙/API 테스트, 실제 가중치 로드와 샘플 추론, 실제 WebSocket 추론, 가상 카메라 브라우저 연결·정지·저장·새로고침·반응형.
**아직 확인하지 못한 것:** 실제 참가자의 노트북 웹캠에서 모든 동작을 완료하는 수동 시연, 임계값 유효성, 정확도·F1·치료 효과, 다른 OS 성능.
가상 카메라 및 합성 검출값의 성공은 실제 사용자 인식 정확도를 의미하지 않습니다.
파일럿 수집·수동 검증 체크리스트는 docs/evaluation-plan.md를 참고하세요.

## API
GET /api/health, /api/exercises, /api/model/status, /api/records, /api/records/{session_id}
POST /api/sessions, /api/sessions/{session_id}/finish, /api/calibration
GET /api/sessions/{session_id}
WebSocket /ws/training/{session_id}
API는 Pydantic/OpenAPI로 문서화됩니다.

## 관련 문서
- [구조와 타이머 정책](docs/architecture.md)
- [검증 계획](docs/evaluation-plan.md)
- [모델 출처·라이선스·공식 API](docs/model-attribution.md)

이 앱은 단일 사용자 로컬 연구용 프로토타입입니다. 의료적 진단이나 치료 효과를 주장하지 않습니다.

## 분석 서버 연결 오류 확인
HTTPS 캡스톤 화면에서 127.0.0.1로 연결할 때 브라우저의 로컬 네트워크/기기 접근 권한이 필요합니다.
화면의 **분석 서버 연결** 버튼을 누르고 접근 요청을 허용하세요. 이미 허용된 브라우저에서는 자동으로 연결을 확인합니다.
거부했다면 주소창 사이트 설정에서 해당 권한을 허용한 뒤 **다시 확인**을 누르세요.
현재 WIZ 화면을 감싸는 외부 임베드가 권한을 제한할 수도 있습니다. 이때는 **로컬 훈련 앱 열기**를 이용해 http://127.0.0.1:8000/#/training 에 직접 접속합니다.

127.0.0.1은 접속한 사용자의 컴퓨터입니다. 작업 서버에서 모델을 실행한 것만으로 사용자 컴퓨터의 8000번 포트가 열리지는 않습니다.
사용자 컴퓨터에서 backend 가상환경을 활성화하고 `uvicorn app.main:app --port 8000`을 실행해야 합니다.
http://127.0.0.1:8000/api/health 에서 inference_available=true인지 먼저 확인하세요.
브라우저 보안 기능을 끄거나 가짜 응답으로 성공 처리하는 방식은 사용하지 않습니다.
