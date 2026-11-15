# 혀 방향 ONNX 모델 연동 기록

## 모델 계약

- 원본 산출물: `tongue_model_result.zip`
- 모델: MobileNetV3-Small, ONNX opset 17
- 입력: RGB `224×224`, NCHW, 픽셀 `/255` 후 ImageNet mean `(0.485, 0.456, 0.406)` / std `(0.229, 0.224, 0.225)` 정규화
- 입 주변 영역: MediaPipe Face Landmarker의 입 랜드마크를 정사각형으로 확장해 크롭
- 클래스 순서: `mouth_closed`, `mouth_open`, `tongue_down`, `tongue_left`, `tongue_middle`, `tongue_right`, `tongue_up`
- 모델 SHA-256: `d49da429f41c5cccee681a00cee3443bb1e51bbd842f06ea12dd6eaccc5966cd`

## 첨부 평가 결과

- Test Accuracy: 66.75%
- Macro F1: 65.82%
- 테스트 데이터: 참가자 분리 3명, 4,665장
- PyTorch/ONNX 최대 logit 차이: `2.694×10⁻⁵`
- 클래스별 재현율은 45.53%~94.46%로 편차가 있어 현재는 방향 표시 시연에만 사용한다.

원본 수치는 [tongue-model-metrics.json](tongue-model-metrics.json), 혼동행렬은 [tongue-confusion-matrix.png](tongue-confusion-matrix.png)에 보존했다.

## 제품 적용 범위

- 혀가 외부로 보이는 `앞·위·아래·왼쪽·오른쪽` 동작에서 목표 방향을 표시한다.
- 최근 5개 프레임 중 동일 클래스 3개 이상일 때 화면 표시를 안정 상태로 구분한다.
- 모델 로드 실패, 얼굴 미검출, 잘못된 출력은 결과 없음 또는 오류로 표시한다.
- 혀 운동의 단계 완료는 기존 `MANUAL` 모드를 유지한다. 이 모델 출력은 `StepEngine`의 성공 조건으로 전달하지 않는다.
- 입 안쪽 잇몸 돌리기·볼 안쪽 밀기 등 7개 클래스 밖 동작은 자동 판정 대상이 아니다.

## 추가 검증

실제 웹캠의 조명, 카메라 좌우 반전, 촬영 거리, 참가자 다양성을 포함한 별도 시연 평가가 필요하다. 특히 `tongue_left`, `tongue_right`, `tongue_up`, `tongue_down`은 첨부 테스트의 재현율이 상대적으로 낮아 자동 완료에 사용하면 안 된다.
