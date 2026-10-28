"""Local prototype settings; thresholds are engineering hypotheses, not clinical criteria."""
import json
import os
from pathlib import Path
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]

class Settings(BaseModel):
    model_dir: Path = Path(os.getenv("ORAL_MODEL_DIR", str(ROOT / "models")))
    database_url: str = os.getenv("ORAL_DATABASE_URL", "sqlite:///" + str(ROOT / "training.sqlite3"))
    origins: list[str] = os.getenv("ORAL_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000,https://project.wizide.com").split(",")
    neutral_jaw_max: float = .25
    neutral_pucker_max: float = .25
    release_fraction: float = .5
    calibration_timeout: float = 20
    keypoint_confidence: float = Field(default=.5, ge=0, le=1)
    shoulder_degrees: float = Field(default=10, gt=0)
    body_degrees: float = Field(default=12, gt=0)
    head_yaw: float = Field(default=18, gt=0)
    head_pitch: float = Field(default=20, gt=0)
    head_roll: float = Field(default=15, gt=0)
    center_min: float = .35
    center_max: float = .65
    smile_delta: float = .2
    jaw_delta: float = .20
    mouth_ratio_delta: float = .035
    pucker_delta: float = .20
    mouth_width_delta: float = .025
    calibration_seconds: float = 2
    calibration_samples: int = 8
    max_frame_gap: float = .5
    max_frame_age: float = 1.5
    max_payload_bytes: int = 500000
    detection_confidence: float = .5
    inference_size: int = 640
    socket_idle_seconds: float = 5
    future_clock_tolerance: float = 5
    inference_threads: int = 2
    target_fps: float = 8
    max_width: int = 640
    max_height: int = 480
    rule_version: str = "prototype-1"

def load_settings() -> Settings:
    path = Path(os.getenv("ORAL_SETTINGS", str(ROOT / "settings.json")))
    return Settings(**(json.loads(path.read_text()) if path.exists() else {}))

settings = load_settings()
