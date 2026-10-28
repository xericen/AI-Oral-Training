# 구현 구조

현재 WIZ 프로젝트의 설명·공유·확대 UI를 유지하고 구현 탭에 React 클라이언트를 삽입한다.
React는 별도 Vite 개발 서버 또는 FastAPI 정적 파일로도 단독 실행 가능하다.
기존 WIZ의 단발 YOLO 분류 API는 새 화면에서 호출하지 않는다.

- 브라우저가 카메라를 소유한다. 원본 영상은 전송 전 미러링하지 않는다.
- useCamera: 권한·트랙·연결 종료 관리.
- useTraining: 네이티브 WebSocket, 한 프레임 backpressure, JPEG 640×480 이내·품질 .75, 6초 watchdog.
- ModelManager: 시작 시 YOLO11n-pose 및 Face Landmarker Tasks VIDEO 로드·warmup. CPU 2스레드. 실패는 모델 상태 API 및 화면에 표시.
- 요청 추론은 asyncio.to_thread에서 실행한다. 동일 모델 인스턴스는 락으로 직렬화한다. 단일 활성 WebSocket만 허용한다.
- num_faces=2: 여러 얼굴 검출을 성공 처리하지 않기 위한 설정. 실제 단일 사용자만 유효하다.
- MediaPipe VIDEO 타임스탬프는 모델 매니저에서 전역 단조 증가를 보장한다. 동시에 스트림을 섞지 않는다.
- features: COCO17, 입술 내부 13/14, 얼굴폭 234/454, 입꼬리 61/291. 거리는 픽셀 좌표로 환산한 뒤 얼굴폭으로 정규화한다.
- head_angles: 변환 행렬의 회전 성분을 SVD로 정규화해 yaw/pitch/roll 계산. 실패는 null. 좌표계는 공식 portrait 샘플·합성 회전 행렬로 기본 검증했으며, 실제 참가자 영상에서 방향·임계값 보정 필요.
- rules: 특징값만 판정. 측정 불가(null)·얼굴 없음·다중 사람은 불충족이다. 골반이 가려지면 준비자세 통과 불가.
- StepEngine: 중립 2초 중앙값 보정 → 준비자세 → 입 벌리기 3회 → 오므리기 3회 → 볼 부풀리기 수동 3회.
- 유지시간은 서버 time.monotonic 경과를 사용한다. .5초 초과 간격·조건 이탈·지연·정지 시 초기화하며 누락 구간을 합산하지 않는다. 보수적으로 짧은 조건 이탈도 초기화한다.
- 반복 완료 후 중립 입 모양으로 복귀해야 다음 반복을 센다. 얼굴이 사라지는 것만으로 반복 락을 풀지 않는다.
- 자동 다음 단계는 COMPLETED에만 반응한다. 단계 임의 건너뛰기 API는 없다.
- SQLAlchemy: TrainingSession, StepResult, CalibrationProfile. 세션/단계 메타데이터 및 중립 특징값만 보관한다. JPEG와 전체 얼굴 점은 저장하지 않는다.
- 제어 메시지와 binary JPEG를 별도로 받고 frame_id·timestamp 순서를 검증한다. 오래된/미래 프레임과 JPEG 오류는 성공 처리하지 않는다.
- 일시정지는 전송·추론 요청을 멈추고 타이머를 리셋한다. 연결 종료 시 interrupted, 재접속 시 active, 정상 종료는 completed/cancelled.
- 서버 재시작으로 진행 엔진은 복원하지 않는다. 이전 기록은 interrupted로 남고 새 세션을 시작하도록 안내한다.
- 기록 페이지는 REST에 저장된 행만 표시한다. Recharts는 실제 저장된 세션 시간만 그린다.
- 볼 부풀리기는 MANUAL로 고정. cheekPuff는 관측값만 노출하며 자동 판정은 파일럿 검증 전 활성화하지 않는다.
- 입꼬리 당기기 및 관측 불가 혀·삼킴·발음 항목은 exercises.json에 비활성 항목으로 제공한다. 후자는 수동 완료만 허용한다. 오디오 분석 없음.

## WebSocket
/ws/training/{session_id}: 연결 → connected → start → state → frame JSON {frame_id,timestamp_ms:Date.now()} → JPEG binary → analysis_result.
클라이언트는 이전 응답 후 다음 프레임을 보낸다. pause/resume/calibrate/next/manual_complete 제어를 지원한다.
시계는 같은 로컬 컴퓨터 기준이다. 다른 컴퓨터를 연결할 경우 시계 동기화 또는 프로토콜 시간 오프셋 처리가 추가로 필요하다.

## 운용 범위
한 컴퓨터·한 프로세스·한 분석 사용자, 루프백 바인딩이 기본이다. 로컬 참여자 코드는 인증이 아니다.
다중 사용자 서버·연구 영상 수집·치료 효과 판정·검증된 임상 기준은 제공하지 않는다.
