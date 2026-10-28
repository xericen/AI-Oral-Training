# 훈련 기록 저장 구조

## 현재 기본: 브라우저 IndexedDB

src/browser/records.ts가 oral-training-browser-v1 DB의 버전 1을 생성합니다. sessions object store의 keyPath는 id입니다. 데이터 형식은 src/types.ts의 TrainingSession 및 StepResult를 참고하세요. 훈련 결과·단계 결과·중립 보정값을 저장하며 다른 기기에 자동 동기화하지 않습니다. 브라우저 기록은 저장소에 포함하지 않습니다.

## 이전 서버 방식: SQLite (선택)

backend/app/db.py가 training_sessions, step_results, calibration_profiles 테이블을 생성합니다. 기본 DB는 backend/training.sqlite3이며 기존 데이터 파일은 포함하지 않습니다. ORAL_DATABASE_URL로 별도 경로를 지정할 수 있습니다. 현재 프론트엔드는 이 API에 기록을 저장하지 않습니다.

빈 DB를 직접 만들려면 저장소 루트에서:

```bash
sqlite3 backend/training.sqlite3 < database/schema.sql
```

서버 시작 시에도 SQLAlchemy가 테이블을 자동 생성합니다. MySQL/WIZ 회원 DB나 접속 비밀번호는 포함하지 않습니다. 기존 서버 기록을 IndexedDB로 자동 이전하는 기능은 없습니다.
