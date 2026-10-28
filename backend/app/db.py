"""Store summaries and calibration only, never camera frames."""
from datetime import datetime, timezone
from sqlalchemy import create_engine, String, ForeignKey, JSON, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .config import settings

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()

class Base(DeclarativeBase):
    pass

class TrainingSession(Base):
    __tablename__ = "training_sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    participant_code: Mapped[str]
    started_at: Mapped[str]
    ended_at: Mapped[str | None]
    status: Mapped[str] = mapped_column(default="active")
    total_duration_seconds: Mapped[float] = mapped_column(default=0)
    completed_steps: Mapped[int] = mapped_column(default=0)
    total_steps: Mapped[int]
    rule_version: Mapped[str]
    model_version: Mapped[str] = mapped_column(default="YOLO11n-pose/MediaPipe-FaceLandmarker-float16-v1")

class StepResult(Base):
    __tablename__ = "step_results"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("training_sessions.id"), index=True)
    step_id: Mapped[str]
    step_name: Mapped[str]
    detection_mode: Mapped[str]
    started_at: Mapped[str | None]
    completed_at: Mapped[str | None]
    success_count: Mapped[int] = mapped_column(default=0)
    target_count: Mapped[int]
    retry_count: Mapped[int] = mapped_column(default=0)
    duration_seconds: Mapped[float] = mapped_column(default=0)
    completion_status: Mapped[str] = mapped_column(default="WAITING")

class CalibrationProfile(Base):
    __tablename__ = "calibration_profiles"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("training_sessions.id"), unique=True)
    participant_code: Mapped[str]
    created_at: Mapped[str]
    values: Mapped[dict] = mapped_column(JSON)
    neutral_jaw_open: Mapped[float | None]
    neutral_mouth_open_ratio: Mapped[float | None]
    neutral_mouth_pucker: Mapped[float | None]
    neutral_cheek_puff: Mapped[float | None]
    neutral_shoulder_angle: Mapped[float | None]
    neutral_body_alignment: Mapped[float | None]

def make_database(url: str):
    engine = create_engine(url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {})
    Base.metadata.create_all(engine)
    if url.startswith("sqlite"):
        existing = {column["name"] for column in inspect(engine).get_columns("calibration_profiles")}
        with engine.begin() as connection:
            for name in ["neutral_jaw_open","neutral_mouth_open_ratio","neutral_mouth_pucker","neutral_cheek_puff","neutral_shoulder_angle","neutral_body_alignment"]:
                if name not in existing:
                    connection.execute(text(f'ALTER TABLE calibration_profiles ADD COLUMN "{name}" FLOAT'))
    return engine, sessionmaker(engine, expire_on_commit=False)

def serialize(row) -> dict:
    return {column.name: getattr(row, column.name) for column in row.__table__.columns}
