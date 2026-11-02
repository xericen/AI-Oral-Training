# 훈련 기록 저장 구조

## 현재 기본: IndexedDB + 로그인 동기화

`frontend/src/browser/records.ts`가 `oral-training-browser-v1` IndexedDB를 생성하고 `sessions` object store에 훈련 결과를 저장합니다. 데이터 형식은 `frontend/src/types.ts`의 `TrainingSession`과 `StepResult`를 따릅니다.

`frontend/src/browser/sync.ts`는 로그인 사용자의 세션·단계 결과를 WIZ의 `/wiz/api/page.capstone/training_records`와 동기화합니다. 서버 연결에 실패해도 로컬 기록은 유지하며, 카메라 영상·전체 얼굴 랜드마크·음성 원본은 로컬과 서버 어느 쪽에도 저장하지 않습니다.

## 선택형 FastAPI 서버: SQLite

`backend/app/db.py`는 `training_sessions`, `step_results`, `calibration_profiles` 테이블을 생성합니다. 기본 DB는 `backend/training.sqlite3`이며 실제 DB 파일은 저장소에 포함하지 않습니다. `ORAL_DATABASE_URL`로 다른 SQLAlchemy 연결 문자열을 지정할 수 있습니다.

빈 SQLite DB를 직접 만들려면 저장소 루트에서 실행합니다.

```bash
sqlite3 backend/training.sqlite3 < database/schema.sql
```

FastAPI 서버 시작 시에도 SQLAlchemy가 동일 테이블을 자동 생성합니다. 현재 기본 React 앱은 이 FastAPI 저장 API를 호출하지 않으며, WIZ 로그인 기록과 레거시 SQLite 사이의 자동 이전 기능은 없습니다.
