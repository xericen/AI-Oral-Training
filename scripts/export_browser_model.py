"""Developer-only conversion of the existing pretrained weights, never training."""
from pathlib import Path
import hashlib,json,shutil,functools
import torch
from ultralytics import YOLO
root=Path(__file__).resolve().parents[1]
source=root/"backend"/"models"
target=root/"frontend"/"public"/"models"
target.mkdir(parents=True,exist_ok=True)
model=YOLO(str(source/"yolo11n-pose.pt"))
original_export=torch.onnx.export
try:
    # Ultralytics 8.3 uses the legacy exporter contract; Torch 2.14 defaults to dynamo.
    torch.onnx.export=functools.partial(original_export,dynamo=False)
    path=model.export(format="onnx",imgsz=320,opset=17,simplify=False,dynamic=False,nms=False,device="cpu")
finally:
    torch.onnx.export=original_export
shutil.copy2(path,target/"yolo11n-pose-320.onnx")
shutil.copy2(source/"face_landmarker.task",target/"face_landmarker.task")
manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in target.iterdir() if p.suffix in {".onnx",".task"}}
(target/"manifest.json").write_text(json.dumps({"source":"Ultralytics YOLO11n-pose and MediaPipe FaceLandmarker float16 v1","input_size":320,"sha256":manifest},indent=2))
print(manifest)
