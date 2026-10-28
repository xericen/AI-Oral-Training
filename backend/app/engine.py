"""Per-session state machine. Only the server can count automatic success."""
from enum import Enum
from statistics import median
import time
from .config import Settings
from .schemas import Exercise
from .rules import posture, mouth, feedback

class StepState(str, Enum):
    WAITING="WAITING"
    CALIBRATING="CALIBRATING"
    READY="READY"
    ACTIVE="ACTIVE"
    HOLDING="HOLDING"
    SUCCESS="SUCCESS"
    RETRY="RETRY"
    PAUSED="PAUSED"
    COMPLETED="COMPLETED"
    ERROR="ERROR"

class StepEngine:
    def __init__(self, exercises: list[Exercise], cfg: Settings, clock=time.monotonic):
        self.exercises, self.cfg, self.clock = exercises, cfg, clock
        self.index = 0
        self.state = StepState.WAITING
        self.baseline: dict = {}
        self.samples: list[dict] = []
        self.last_time: float | None = None
        self.elapsed = 0.0
        self.counts = [0 for _ in exercises]
        self.retries = [0 for _ in exercises]
        self.release_required = False
        self.criteria: dict = {}
        self.message = "카메라를 켜고 분석을 시작해 주세요."
        self.calibrating_since = clock()
        self.closed = False

    @property
    def exercise(self) -> Exercise:
        return self.exercises[self.index]

    def reset_timing(self):
        self.last_time = None
        self.elapsed = 0.0

    def calibrate(self):
        if self.closed or any(self.counts):
            raise ValueError("진행 중 재보정은 새 세션에서 시작해 주세요.")
        self.baseline = {}
        self.samples = []
        self.state = StepState.CALIBRATING
        self.calibrating_since = self.clock()
        self.reset_timing()
        self.message = "입을 편안하게 다문 중립 자세로 2초 유지해 주세요."

    def pause(self, error: str | None = None):
        if self.closed:
            return
        self.reset_timing()
        self.samples = []
        self.state = StepState.ERROR if error else StepState.PAUSED
        self.message = error or "일시정지했습니다."
        self.criteria = {}

    def resume(self):
        if self.closed:
            raise ValueError("종료된 세션입니다.")
        self.reset_timing()
        if not self.baseline:
            self.calibrate()
        elif self.counts[self.index] >= self.exercise.repetitions:
            self.state = StepState.COMPLETED
            self.message = "다음 단계로 이동해 주세요."
        else:
            self.state = StepState.READY
            self.message = "동작을 시작해 주세요."

    def advance(self):
        if self.closed or self.counts[self.index] < self.exercise.repetitions:
            raise ValueError("현재 단계의 목표 횟수를 먼저 완료해 주세요.")
        if self.index < len(self.exercises)-1:
            self.index += 1
            self.state = StepState.READY
            self.release_required = False
            self.reset_timing()
            self.criteria = {}
            self.message = self.exercise.description

    def manual_complete(self):
        if self.closed or self.state in {StepState.PAUSED, StepState.ERROR, StepState.WAITING}:
            raise ValueError("세션을 시작하거나 재개해 주세요.")
        if self.exercise.auto_complete or self.exercise.detection_type != "MANUAL":
            raise ValueError("자동 판정 단계는 수동 성공 처리할 수 없습니다.")
        self.counts[self.index] = min(self.exercise.repetitions, self.counts[self.index]+1)
        self.state = StepState.COMPLETED if self.counts[self.index] == self.exercise.repetitions else StepState.ACTIVE
        self.message = "사용자 직접 완료로 기록했습니다. AI 성공 판정이 아닙니다."

    def update(self, metrics: dict, *, stale: bool = False):
        now = self.clock()
        if self.closed or self.state in {StepState.PAUSED, StepState.WAITING, StepState.ERROR}:
            return
        if self.counts[self.index] >= self.exercise.repetitions:
            self.state = StepState.COMPLETED
            return
        gap = None if self.last_time is None else now-self.last_time
        if stale:
            self.reset_timing()
            self.samples = []
            self.state = StepState.RETRY
            self.message = "분석이 지연되고 있습니다. 최신 프레임으로 다시 시도해 주세요."
            self.criteria = {}
            return
        if not self.baseline:
            if self.state != StepState.CALIBRATING:
                self.state = StepState.CALIBRATING
            self.criteria = posture(metrics, self.cfg)
            self.criteria["neutral_mouth"] = (metrics.get("jawOpen") is not None and metrics["jawOpen"] < self.cfg.neutral_jaw_max
                                             and metrics.get("mouthPucker") is not None and metrics["mouthPucker"] < self.cfg.neutral_pucker_max)
            if not all(v is True for v in self.criteria.values()):
                self.reset_timing()
                self.samples = []
                self.message = feedback({k:v for k,v in self.criteria.items() if k != "neutral_mouth"}) if not all(v is True for k,v in self.criteria.items() if k != "neutral_mouth") else "입을 편안하게 다문 중립 자세를 유지해 주세요."
            else:
                if gap is None or gap > self.cfg.max_frame_gap:
                    self.samples = []
                    self.elapsed = 0
                    gap = 0
                self.last_time = now
                self.samples.append(metrics)
                self.elapsed += gap
                self.message = "중립 자세를 측정하고 있어요."
                if self.elapsed >= self.cfg.calibration_seconds and len(self.samples) >= self.cfg.calibration_samples:
                    keys = ["jawOpen","mouth_open_ratio","mouth_width_ratio","mouthPucker","cheekPuff","shoulder_tilt","body_alignment","mouthSmileLeft","mouthSmileRight"]
                    self.baseline = {k: median(values) if (values := [s[k] for s in self.samples if s.get(k) is not None]) else None for k in keys}
                    self.samples = []
                    self.reset_timing()
                    self.state = StepState.READY
                    self.message = "캘리브레이션 완료. 준비자세를 유지해 주세요."
            if now-self.calibrating_since > self.cfg.calibration_timeout and not self.baseline:
                self.pause("캘리브레이션에 실패했습니다. 얼굴·어깨·골반을 보이게 조정한 뒤 재시도해 주세요.")
            return
        if not self.exercise.auto_complete:
            self.state = StepState.ACTIVE
            self.criteria = {}
            self.message = "현재는 동작 안내 및 직접 완료 모드입니다."
            return
        self.criteria = posture(metrics, self.cfg) if self.exercise.rule == "POSTURE" else mouth(self.exercise.rule, metrics, self.baseline, self.cfg)
        met = all(v is True for v in self.criteria.values())
        if self.release_required:
            self.reset_timing()
            # Only a visible neutral mouth releases the repetition latch.
            if metrics["face_count"] == 1 and metrics["person_count"] == 1 and metrics.get("jawOpen") is not None and metrics.get("mouthPucker") is not None:
                neutral = metrics["jawOpen"] < self.baseline["jawOpen"] + self.cfg.jaw_delta*self.cfg.release_fraction and metrics["mouthPucker"] < self.baseline["mouthPucker"] + self.cfg.pucker_delta*self.cfg.release_fraction
                if neutral:
                    self.release_required = False
                    self.state = StepState.READY
            self.message = "중립 상태로 돌아온 뒤 다음 반복을 시작해 주세요."
            return
        if not met:
            if self.elapsed > 0:
                self.retries[self.index] += 1
            self.reset_timing()
            self.state = StepState.RETRY
            self.message = feedback(self.criteria)
            return
        if gap is None or gap > self.cfg.max_frame_gap or gap < 0:
            self.elapsed = 0
            gap = 0
        self.last_time = now
        self.elapsed += gap
        self.state = StepState.HOLDING
        self.message = "잘하고 있어요! 자세를 유지하세요."
        if self.elapsed >= self.exercise.hold_seconds:
            self.counts[self.index] += 1
            self.state = StepState.COMPLETED if self.counts[self.index] == self.exercise.repetitions else StepState.SUCCESS
            self.release_required = True
            self.message = "동작을 성공적으로 완료했습니다!"
            self.criteria["hold_complete"] = True

    def snapshot(self) -> dict:
        return {"step_id": self.exercise.id, "step_state": self.state.value,
                "criteria": self.criteria, "progress": {"hold_elapsed": min(self.elapsed, self.exercise.hold_seconds),
                "hold_target": self.exercise.hold_seconds, "repetition": self.counts[self.index],
                "target_repetitions": self.exercise.repetitions, "calibrated": bool(self.baseline)},
                "feedback": {"status": self.state.value.lower(), "message": self.message}}
