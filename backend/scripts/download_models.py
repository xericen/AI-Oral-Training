"""Download official pretrained assets; SHA256 manifest records exact installed files."""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen
ROOT = Path(__file__).resolve().parents[1] / "models"
URLS = {
 "yolo11n-pose.pt":"https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n-pose.pt",
 "face_landmarker.task":"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"}

def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for name, url in URLS.items():
        target = ROOT/name
        if not target.exists():
            with urlopen(url, timeout=120) as response:
                data = response.read()
            temp = target.with_suffix(".download")
            temp.write_bytes(data)
            temp.replace(target)
        hashes[name] = {"url":url, "sha256":hashlib.sha256(target.read_bytes()).hexdigest()}
    (ROOT/"manifest.json").write_text(json.dumps(hashes, indent=2))
    print(json.dumps(hashes, indent=2))
if __name__ == "__main__":
    main()
