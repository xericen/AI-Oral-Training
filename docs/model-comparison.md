# 브라우저 자세·얼굴 모델 비교

## 비교 목적

이 프로젝트는 한 명의 상반신 정렬과 입 모양을 노트북 브라우저에서 실시간으로 확인한다. 따라서 공개 벤치마크 수치뿐 아니라 브라우저 지원, 초기 준비 비용, 필요한 특징점 제공 여부를 함께 비교했다.

서로 다른 데이터셋·기기에서 측정된 수치는 직접적인 우열 비교가 아니다. 실제 교체 전에는 동일한 노트북과 동일한 촬영 영상으로 초기화 시간, FPS, 어깨 검출률과 동작 판정률을 다시 측정해야 한다.

## 자세 모델

| 후보 | 특징점 | 공식 공개 성능 | 브라우저 적용 판단 |
|---|---:|---|---|
| YOLO11n-pose (현재) | COCO 17개 | 640 입력에서 pose mAP50-95 50.0, CPU ONNX 52.4ms, 2.9M 파라미터 | 여러 사람 검출과 기존 ONNX 코드 유지에 유리. 현재 320 ONNX 파일은 공식 640 벤치마크와 동일 조건이 아님 |
| YOLO26n-pose | COCO 17개 | pose mAP50-95 57.2, CPU ONNX 40.3ms, 2.9M 파라미터 | YOLO 계열을 유지할 때 유력하지만 내보내기·후처리 호환성 검증 필요 |
| MoveNet Lightning | 17개 | FP16 4.8MB, mAP 63.0, Pixel 5 CPU 60ms. TensorFlow.js 브라우저 벤치마크에서 현대 기기 실시간 동작 | 단일 사용자와 빠른 움직임에 적합하지만 TensorFlow.js 런타임이 추가됨 |
| MoveNet Thunder | 17개 | FP16 12.6MB, mAP 72.0, Pixel 5 CPU 155ms | 정확도 우선 후보지만 저사양 기기 지연 증가 가능 |
| MediaPipe Pose Landmarker Lite | 33개 | 모델 카드 기준 약 3MB, Pixel 3 CPU 약 44 FPS | 현재 Face Landmarker와 같은 MediaPipe 런타임을 공유할 수 있고 상체 관절이 더 상세해 가장 유력한 교체 후보 |
| MediaPipe Pose Landmarker Full | 33개 | 약 6MB, Pixel 3 CPU 약 18 FPS | Lite보다 정확도 여유가 있지만 브라우저 CPU 부담이 큼 |

MoveNet의 mAP는 한 사람만 포함하도록 필터링·크롭한 COCO 부분집합에서 측정되었으므로 YOLO의 COCO Keypoints 수치와 직접 비교하면 안 된다.

## 얼굴 모델

| 후보 | 출력 | 판단 |
|---|---|---|
| MediaPipe Face Landmarker (현재) | 얼굴 478개 랜드마크, 표정 52개 Blendshape | `jawOpen`, `mouthPucker`, `mouthFunnel`, 좌우 미소 등 현재 판정에 필요한 값을 직접 제공하므로 유지 권장 |
| TensorFlow.js FaceMesh 계열 | 얼굴 랜드마크 중심 | 입 모양을 기하 규칙으로 다시 계산해야 하고 별도 TensorFlow.js 런타임이 필요해 현재 구조보다 이점이 적음 |
| 경량 얼굴 랜드마크 모델(PFLD 계열) | 얼굴 점 좌표 중심 | 파일은 작을 수 있으나 표정 계수를 제공하지 않아 별도 학습·검증 없이는 구강 동작 판정에 부적합 |

## 결론

1. 얼굴은 MediaPipe Face Landmarker를 유지한다.
2. 자세는 현재 YOLO11n-pose를 즉시 교체하지 않고, MediaPipe Pose Landmarker Lite를 동일 영상으로 A/B 평가한다.
3. Lite가 어깨·팔 검출률을 유지하면서 초기화 시간과 FPS를 개선하면 YOLO와 ONNX Runtime을 제거해 다운로드와 메모리 준비 비용을 줄인다.
4. DB는 모델 파일과 결과 보관에는 사용할 수 있지만 브라우저 실행 세션을 직렬화해 즉시 복원할 수는 없다. 앱 시작 시 백그라운드 준비와 캐시 재사용이 현재 서버리스 구조에서 가능한 안전한 해법이다.

## 공식 근거

- Ultralytics Pose: https://docs.ultralytics.com/tasks/pose/
- Ultralytics YOLO11: https://docs.ultralytics.com/models/yolo11/
- TensorFlow MoveNet: https://www.tensorflow.org/hub/tutorials/movenet
- MediaPipe Pose Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
- MediaPipe Pose 모델 카드: https://developers.google.com/static/ml-kit/images/vision/pose-detection/pose_model_card.pdf
- MediaPipe Face Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
