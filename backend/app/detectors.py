"""Actual pretrained detectors. No random output or automatic mock fallback."""
import time
import threading
import cv2
import numpy as np
from .config import Settings
from .features import extract

class ModelManager:
    def __init__(self, cfg: Settings):
        self.cfg = cfg
        self.pose = None
        self.face = None
        self.error: str | None = None
        self.lock = threading.Lock()
        self.last_timestamp = 0

    def load(self):
        try:
            import torch
            torch.set_num_threads(self.cfg.inference_threads)
            cv2.setNumThreads(1)
            from ultralytics import YOLO
            import mediapipe as mp
            pose_path = self.cfg.model_dir / "yolo11n-pose.pt"
            face_path = self.cfg.model_dir / "face_landmarker.task"
            if not pose_path.is_file() or not face_path.is_file():
                raise FileNotFoundError("models 폴더의 모델 파일이 없습니다. python scripts/download_models.py를 실행하세요.")
            self.pose = YOLO(str(pose_path), task="pose")
            self.pose.predict(np.zeros((480,640,3), dtype=np.uint8), imgsz=self.cfg.inference_size, device="cpu", verbose=False)
            options = mp.tasks.vision.FaceLandmarkerOptions(
                base_options=mp.tasks.BaseOptions(model_asset_path=str(face_path)),
                running_mode=mp.tasks.vision.RunningMode.VIDEO, num_faces=2,
                output_face_blendshapes=True, output_facial_transformation_matrixes=True)
            self.face = mp.tasks.vision.FaceLandmarker.create_from_options(options)
            self.error = None
        except Exception as exc:
            self.error = str(exc)

    def status(self) -> dict:
        return {"pose_model_loaded": self.pose is not None, "face_model_loaded": self.face is not None,
                "inference_available": self.pose is not None and self.face is not None and not self.error,
                "error": self.error, "mode": "REAL"}

    def infer(self, payload: bytes, timestamp_ms: int) -> dict:
        if not self.status()["inference_available"]:
            raise RuntimeError("AI 모델을 불러오지 못했습니다. " + str(self.error))
        with self.lock:
            started = time.monotonic()
            if len(payload) > self.cfg.max_payload_bytes:
                raise ValueError("JPEG 프레임 크기가 제한을 초과했습니다.")
            # Read dimensions before decoding to reject oversized image allocations.
            from PIL import Image
            import io
            with Image.open(io.BytesIO(payload)) as header:
                if header.format != "JPEG" or header.width > 1280 or header.height > 1280:
                    raise ValueError("1280px 이하 JPEG만 지원합니다.")
            frame = cv2.imdecode(np.frombuffer(payload, np.uint8), cv2.IMREAD_COLOR)
            if frame is None:
                raise ValueError("JPEG 프레임을 디코딩할 수 없습니다.")
            h, w = frame.shape[:2]
            if w > self.cfg.max_width or h > self.cfg.max_height:
                scale = min(self.cfg.max_width/w, self.cfg.max_height/h)
                frame = cv2.resize(frame, (round(w*scale), round(h*scale)))
                h,w=frame.shape[:2]
            prediction = self.pose.predict(frame, imgsz=640, conf=self.cfg.detection_confidence, device="cpu", verbose=False)[0]
            raw = [] if prediction.keypoints is None else prediction.keypoints.data.cpu().numpy().tolist()
            count = 0 if prediction.boxes is None else len(prediction.boxes)
            people = [raw[i] if i < len(raw) and len(raw[i]) == 17 else [[0.,0.,0.]]*17 for i in range(count)]
            import mediapipe as mp
            self.last_timestamp = max(timestamp_ms, self.last_timestamp + 1)
            result = self.face.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,
                    data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), self.last_timestamp)
            faces = [{"landmarks":[[p.x,p.y,p.z] for p in landmarks],
                      "blendshapes":{cat.category_name:float(cat.score) for cat in result.face_blendshapes[i]},
                      "matrix":result.facial_transformation_matrixes[i].tolist() if len(result.facial_transformation_matrixes)>i else None}
                      for i,landmarks in enumerate(result.face_landmarks)]
            metrics = extract(people, faces, w, h, self.cfg)
            return {"metrics":metrics, "pose": [[[p[0]/w,p[1]/h,p[2]] for p in person] for person in people],
                    "faces": faces, "inference_ms":round((time.monotonic()-started)*1000,2)}

    def close(self):
        if self.face:
            self.face.close()
