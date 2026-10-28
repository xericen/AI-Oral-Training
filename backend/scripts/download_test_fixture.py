"""Fetch the official MediaPipe test portrait. Not participant or training data."""
from pathlib import Path
from urllib.request import urlopen
url="https://storage.googleapis.com/mediapipe-assets/portrait.jpg"
target=Path(__file__).resolve().parents[1]/"tests"/"fixtures"/"portrait.jpg"
target.parent.mkdir(parents=True,exist_ok=True)
with urlopen(url,timeout=30) as response:
    target.write_bytes(response.read())
print(target)
