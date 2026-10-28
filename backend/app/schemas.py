from typing import Literal
from pydantic import BaseModel, Field, model_validator

class Exercise(BaseModel):
    id: str
    title: str
    description: str
    detection_type: Literal["POSE_FACE", "FACE", "MANUAL"]
    rule: Literal["POSTURE", "MOUTH_OPEN", "PUCKER", "SMILE", "MANUAL"]
    hold_seconds: float = Field(gt=0, le=60)
    repetitions: int = Field(ge=1, le=30)
    auto_complete: bool
    enabled: bool = True

    @model_validator(mode="after")
    def validate_mode(self):
        if (self.rule == "MANUAL" or self.detection_type == "MANUAL") and self.auto_complete:
            raise ValueError("수동 훈련에는 자동 성공 판정을 활성화할 수 없습니다.")
        return self

class SessionCreate(BaseModel):
    participant_code: str = Field(default="local-user", min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")

class FinishRequest(BaseModel):
    status: Literal["completed", "cancelled"] = "cancelled"

class CalibrationRequest(BaseModel):
    session_id: str

class Control(BaseModel):
    type: Literal["start", "pause", "resume", "calibrate", "next", "manual_complete", "frame"]
    frame_id: int | None = Field(default=None, ge=0)
    timestamp_ms: int | None = Field(default=None, ge=0)

class AnalysisResult(BaseModel):
    type: Literal["analysis_result"] = "analysis_result"
    frame_id: int
    session_id: str
    timestamp_ms: int
    step_id: str
    step_state: str
    detections: dict
    metrics: dict
    criteria: dict[str, bool | None]
    progress: dict
    feedback: dict[str, str]
    overlay: dict
    performance: dict

class ModelStatus(BaseModel):
    pose_model_loaded: bool
    face_model_loaded: bool
    inference_available: bool
    error: str | None = None
    mode: str

class StepRecord(BaseModel):
    id: str
    session_id: str
    step_id: str
    step_name: str
    detection_mode: str
    started_at: str | None
    completed_at: str | None
    success_count: int
    target_count: int
    retry_count: int
    duration_seconds: float
    completion_status: str

class SessionRecord(BaseModel):
    id: str
    participant_code: str
    started_at: str
    ended_at: str | None
    status: str
    total_duration_seconds: float
    completed_steps: int
    total_steps: int
    rule_version: str
    model_version: str
    steps: list[StepRecord] | None = None
    analysis: dict | None = None

class HealthResponse(BaseModel):
    status: str
    mode: str
    models: ModelStatus
    rule_version: str
