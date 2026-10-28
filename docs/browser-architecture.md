# 현재 브라우저 실행 구조
Webcam → ImageBitmap → 기기 내 전용 Worker → YOLO ONNX + MediaPipe → 정규화 특징 → STEP 엔진 → UI/Canvas → IndexedDB.
픽셀을 HTTP/WebSocket으로 보내지 않는다. 정적 모델·WASM 다운로드만 웹사이트와 통신한다.

- frontend/src/browser/vision.worker.ts: 실제 모델 로드·직렬 추론·bitmap 정리. ONNX warmup까지 성공한 경우만 준비 완료.
- pose.ts: YOLO 56채널 출력·confidence·NMS·letterbox 역변환. 중복 검출을 여러 사람으로 세지 않도록 처리.
- features.ts: COCO17·입술 내부 13/14·얼굴폭 234/454·입꼬리 61/291·변환 행렬의 얼굴 방향.
- engine.ts: 가설 기준의 준비자세·구강 조건, 중립 중앙값, 실제 단조 시간, 반복 latch. 엔진의 수동 모드는 보존하지만 현재 자동 세션은 enabled 및 auto_complete인 단계만 포함합니다.
- client.ts: Worker 호출·타임아웃·실패 전달. 종료 및 모델 재준비 시 Worker 정리.
- useTraining.ts: 카메라 상태·추론 backpressure·오버레이·세션 저장. 일시정지/기기 해제 후 늦게 온 결과는 세대 번호로 폐기.
- records.ts: IndexedDB 저장. 원본 프레임/전체 랜드마크는 저장하지 않으며 서버 기록과 병합하지 않는다.
- scripts/prepare-browser-assets.mjs: 필요한 SIMD 런타임과 classic Worker만 패키징. 비-SIMD 브라우저는 명확한 오류.
- scripts/publish_wiz.py: 정적 React·모델·WASM 파일을 현재 WIZ src/assets/oral-training에 복사.
- src/app/page.capstone: 설명/공유/확대는 기존 WIZ, 구현 내용만 React iframe. 카메라 이외 loopback 권한은 필요하지 않다.

기존 api.ts와 Python 백엔드는 이전 서버 구현 참고용이며 현재 App/TrainingPage/RecordsPage에서 import하거나 호출하지 않는다.
현재 콘텐츠와 가설값의 기준 파일은 frontend/src/browser/exercises.json, config.ts다.
서버의 과거 설정을 바꾸어도 현재 브라우저 설정이 자동으로 바뀌지는 않는다.
