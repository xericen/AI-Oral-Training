# 모델 및 참조

현재 기본 실행은 ONNX Runtime Web 1.22.0(https://onnxruntime.ai/docs/tutorials/web/deploy.html)과 MediaPipe Tasks Vision 1.2.0(https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)의 브라우저 Worker 방식입니다. YOLO는 동일 사전학습 가중치를 ONNX opset 17, 320px로 변환했습니다. Python 서버 항목은 이전 구현의 참고 이력입니다.

- Ultralytics YOLO11n-pose: https://docs.ultralytics.com/models/yolo11/
- 공식 COCO17 키포인트: https://docs.ultralytics.com/tasks/pose/
- 배포 URL: https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n-pose.pt
- Ultralytics 라이선스: https://www.ultralytics.com/license (AGPL-3.0 및 별도 상용 라이선스 정책을 배포 전에 확인)
- MediaPipe Face Landmarker: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/python
- 모델 번들: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- 실제 52개 계수 이름 정의: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/cc/vision/face_landmarker/face_blendshapes_graph.cc
- 입술 인덱스 참고: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py
- MediaPipe 소스 라이선스 Apache-2.0. 모델은 공식 모델 문서의 해당 조건 확인.
- 실제 모델 smoke test 사진은 Google 공식 테스트 자산 https://storage.googleapis.com/mediapipe-assets/portrait.jpg 이다. 학습·파인튜닝·사용자 기록으로 사용하지 않는다.
- 다운로드 파일 SHA256 및 원본 URL은 backend/models/manifest.json에 기록한다.
- 테스트에서 478개 점, jawOpen/mouthPucker/mouthFunnel/cheekPuff 반환 확인. 이는 사용자 동작 인식의 정확도 검증이 아니다.
- FastAPI: https://fastapi.tiangolo.com/advanced/websockets/
- Vite: https://vite.dev/guide/
