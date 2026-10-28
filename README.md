# 구강 근기능 훈련 시스템

캡스톤 구현 화면의 독립 React 프론트엔드입니다. WIZ 로그인·설명 페이지·사이드바와 기존 Python 백엔드는 포함하지 않습니다.

## 실행

```bash
npm ci
npm run dev
```

표시된 localhost 주소로 접속하고 Webcam을 켜면 모델 준비 후 자동 훈련을 시작합니다. 별도 분석 서버는 필요 없습니다. 카메라는 localhost 또는 HTTPS 환경에서 사용하세요.

## 검증 및 정적 빌드

```bash
npm test
npm run build
npm run preview
```

배포 대상은 dist/ 내용입니다. GitHub push 자체는 사이트를 배포하지 않습니다.

## 기록과 한계

훈련 기록은 같은 사이트·브라우저의 IndexedDB에 저장합니다. 영상은 분석 서버로 전송하지 않습니다. 판정 임계값은 연구용 가설값이며 임상 정확도나 치료 효과를 검증하지 않았습니다.

모델 파일은 public/models/, 런타임은 public/runtime/에 포함합니다. 모델 출처는 docs/model-attribution.md와 public/models/manifest.json을 참고하세요. docs/의 원본 구조 설명에 나오는 backend/ 및 frontend/ 경로는 WIZ 원본 프로젝트 기준입니다. 이 저장소는 frontend/ 내용을 루트에 배치했습니다.
