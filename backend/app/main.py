"""Local, single-user FastAPI service. Frame contents are never persisted."""
import asyncio
from contextlib import asynccontextmanager
import json
import logging
import time
import uuid
from pathlib import Path
import psutil
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy import select, func
from .config import ROOT, settings
from .db import TrainingSession, StepResult, CalibrationProfile, make_database, utc_now, serialize
from .schemas import Exercise, SessionCreate, FinishRequest, CalibrationRequest, Control, AnalysisResult, ModelStatus, SessionRecord, HealthResponse
from .engine import StepEngine, StepState
from .detectors import ModelManager

logger = logging.getLogger("oral")
exercises = [Exercise.model_validate(x) for x in json.loads((ROOT/"exercises.json").read_text()) if x.get("enabled", True)]
manager = ModelManager(settings)
database_engine, DB = make_database(settings.database_url)
runtimes: dict[str, dict] = {}
connected: str | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(manager.load)
    # A process restart cannot continue an in-memory timer.
    with DB() as db:
        for row in db.scalars(select(TrainingSession).where(TrainingSession.status.in_(["active","paused"]))):
            row.status = "interrupted"
        db.commit()
    yield
    manager.close()

app = FastAPI(title="구강 근기능 훈련 프로토타입", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_methods=["GET","POST"], allow_headers=["Content-Type"])

def runtime(sid: str) -> dict:
    if sid not in runtimes:
        raise HTTPException(409, "세션 상태가 없습니다. 서버 재시작 후에는 새 훈련을 시작해 주세요.")
    return runtimes[sid]

def persist(sid: str):
    r = runtimes[sid]
    e: StepEngine = r["engine"]
    now = time.monotonic()
    with DB() as db:
        session = db.get(TrainingSession, sid)
        session.total_duration_seconds = max(0, now-r["started"])
        session.completed_steps = sum(count >= ex.repetitions for count,ex in zip(e.counts, exercises))
        for i,ex in enumerate(exercises):
            row = db.get(StepResult, sid + ":" + ex.id)
            row.success_count = e.counts[i]
            row.retry_count = e.retries[i]
            if i == e.index:
                if row.started_at is None:
                    row.started_at = utc_now()
                    r["step_started"][i] = now
                row.duration_seconds = now-r["step_started"].get(i,now)
            if e.counts[i] >= ex.repetitions:
                row.completion_status = "COMPLETED"
                row.completed_at = row.completed_at or utc_now()
            elif i == e.index:
                row.completion_status = e.state.value
        if e.baseline and not db.get(CalibrationProfile, sid):
            db.add(CalibrationProfile(id=sid,session_id=sid, participant_code=session.participant_code,
                    created_at=utc_now(), values=e.baseline,
                    neutral_jaw_open=e.baseline.get("jawOpen"), neutral_mouth_open_ratio=e.baseline.get("mouth_open_ratio"),
                    neutral_mouth_pucker=e.baseline.get("mouthPucker"), neutral_cheek_puff=e.baseline.get("cheekPuff"),
                    neutral_shoulder_angle=e.baseline.get("shoulder_tilt"), neutral_body_alignment=e.baseline.get("body_alignment")))
        db.commit()

def record(sid: str) -> dict:
    with DB() as db:
        row = db.get(TrainingSession, sid)
        if row is None:
            raise HTTPException(404,"훈련 기록을 찾을 수 없습니다.")
        return {**serialize(row), "steps":[serialize(s) for s in db.scalars(select(StepResult).where(StepResult.session_id==sid))],
                "analysis":runtimes[sid]["engine"].snapshot() if sid in runtimes else None}

@app.get("/api/health", response_model=HealthResponse)
def health():
    return {"status":"ok","mode":"REAL","models":manager.status(),"rule_version":settings.rule_version}

@app.get("/api/model/status", response_model=ModelStatus)
def model_status():
    return manager.status()

@app.get("/api/exercises", response_model=list[Exercise])
def list_exercises():
    return exercises

@app.post("/api/sessions", status_code=201, response_model=SessionRecord)
def create_session(data: SessionCreate):
    sid = str(uuid.uuid4())
    with DB() as db:
        db.add(TrainingSession(id=sid, participant_code=data.participant_code, started_at=utc_now(), total_steps=len(exercises),
                              rule_version=settings.rule_version))
        for ex in exercises:
            db.add(StepResult(id=sid+":"+ex.id,session_id=sid,step_id=ex.id,step_name=ex.title,
                             detection_mode=ex.detection_type,target_count=ex.repetitions))
        db.commit()
    runtimes[sid] = {"engine":StepEngine(exercises, settings),"started":time.monotonic(),"step_started":{}}
    return record(sid)

@app.get("/api/sessions/{sid}", response_model=SessionRecord)
def get_session(sid: str):
    return record(sid)

@app.post("/api/sessions/{sid}/finish", response_model=SessionRecord)
def finish(sid: str, request: FinishRequest):
    r = runtime(sid)
    e = r["engine"]
    if connected == sid:
        raise HTTPException(409,"먼저 분석 연결을 종료해 주세요.")
    if request.status == "completed" and not all(n >= ex.repetitions for n,ex in zip(e.counts, exercises)):
        raise HTTPException(409,"모든 단계를 완료해야 완료 기록으로 저장할 수 있습니다.")
    if not e.closed:
        e.pause()
        persist(sid)
        e.closed = True
        with DB() as db:
            row = db.get(TrainingSession,sid)
            row.status=request.status
            row.ended_at=utc_now()
            db.commit()
    return record(sid)

@app.get("/api/summary")
def summary():
    with DB() as db:
        rows = db.execute(select(StepResult.step_id, StepResult.step_name, StepResult.detection_mode,
            func.sum(StepResult.success_count), func.avg(StepResult.duration_seconds), func.sum(StepResult.retry_count))
            .where(StepResult.started_at.is_not(None)).group_by(StepResult.step_id,StepResult.step_name,StepResult.detection_mode)).all()
        return [{"step_id":r[0],"name":r[1],"mode":r[2],"success_count":r[3],"average_duration_seconds":r[4],"retry_count":r[5]} for r in rows]

@app.get("/api/records", response_model=list[SessionRecord])
def records():
    with DB() as db:
        return [serialize(s) for s in db.scalars(select(TrainingSession).order_by(TrainingSession.started_at.desc()).limit(200))]

@app.get("/api/records/{sid}", response_model=SessionRecord)
def get_record(sid: str):
    return record(sid)

@app.post("/api/calibration")
def recalibrate(request: CalibrationRequest):
    e = runtime(request.session_id)["engine"]
    try:
        e.calibrate()
    except ValueError as exc:
        raise HTTPException(409,str(exc)) from exc
    persist(request.session_id)
    return e.snapshot()

@app.websocket("/ws/training/{sid}")
async def training_socket(ws: WebSocket, sid: str):
    global connected
    origin = ws.headers.get("origin")
    if origin is not None and origin not in settings.origins:
        await ws.close(code=1008)
        return
    await ws.accept()
    if sid not in runtimes or runtimes[sid]["engine"].closed:
        await ws.send_json({"type":"error","message":"새 훈련 세션을 만들어 주세요."})
        await ws.close(code=1008)
        return
    if connected is not None:
        await ws.send_json({"type":"error","message":"단일 사용자 분석이 진행 중입니다. 다른 분석 연결을 먼저 종료해 주세요."})
        await ws.close(code=1013)
        return
    connected = sid
    with DB() as db:
        row = db.get(TrainingSession,sid)
        row.status = "active"
        db.commit()
    e: StepEngine = runtimes[sid]["engine"]
    pending = None
    last_id, last_timestamp = -1, -1
    try:
        await ws.send_json({"type":"connected","session_id":sid,"mode":"REAL","models":manager.status()})
        while True:
            try:
                message = await asyncio.wait_for(ws.receive(),timeout=settings.socket_idle_seconds)
            except asyncio.TimeoutError:
                e.pause("프레임 수신이 중단되었습니다. 분석을 다시 시작해 주세요.")
                persist(sid)
                await ws.send_json({"type":"error","message":e.message})
                pending = None
                continue
            if message["type"] == "websocket.disconnect":
                break
            try:
                if message.get("text") is not None:
                    if len(message["text"]) > 4096:
                        raise ValueError("제어 메시지가 너무 큽니다.")
                    control = Control.model_validate_json(message["text"])
                    if control.type == "frame":
                        if pending is not None or control.frame_id is None or control.timestamp_ms is None:
                            raise ValueError("프레임 순서가 잘못되었습니다.")
                        if control.frame_id <= last_id or control.timestamp_ms <= last_timestamp:
                            raise ValueError("과거 프레임은 처리하지 않습니다.")
                        if e.state in {StepState.PAUSED,StepState.ERROR,StepState.WAITING}:
                            raise ValueError("분석을 먼저 시작해 주세요.")
                        pending = (control.frame_id,control.timestamp_ms,time.monotonic())
                        continue
                    if pending is not None:
                        raise ValueError("프레임 메타데이터 다음에는 JPEG가 필요합니다.")
                    if control.type in {"start","resume","calibrate"} and not manager.status()["inference_available"]:
                        raise RuntimeError("AI 모델을 불러오지 못했습니다. " + str(manager.status().get("error")))
                    if control.type in {"start","resume"}:
                        e.resume()
                    elif control.type == "calibrate":
                        e.calibrate()
                    elif control.type == "pause":
                        e.pause()
                    elif control.type == "next":
                        e.advance()
                    elif control.type == "manual_complete":
                        e.manual_complete()
                    persist(sid)
                    await ws.send_json({"type":"state",**e.snapshot()})
                    continue
                payload = message.get("bytes")
                if payload is None or pending is None:
                    raise ValueError("JPEG 전에 frame 메타데이터가 필요합니다.")
                frame_id,timestamp,received = pending
                pending = None
                last_id,last_timestamp = frame_id,timestamp
                age = time.time()-timestamp/1000
                if age > settings.max_frame_age or age < -settings.future_clock_tolerance:
                    e.update({},stale=True)
                    await ws.send_json({"type":"state",**e.snapshot(),"frame_id":frame_id})
                    continue
                result = await asyncio.to_thread(manager.infer,payload,timestamp)
                elapsed = time.monotonic()-received
                e.update(result["metrics"],stale=elapsed>settings.max_frame_age)
                persist(sid)
                snapshot = e.snapshot()
                faces = result["faces"]
                response = AnalysisResult(frame_id=frame_id,session_id=sid,timestamp_ms=timestamp,
                    **snapshot, detections={"person_detected":len(result["pose"])==1,"face_detected":len(faces)==1},
                    metrics=result["metrics"],
                    overlay={"pose_keypoints":result["pose"],"face_landmarks":faces[0]["landmarks"] if len(faces)==1 else []},
                    performance={"inference_ms":result["inference_ms"],"fps":round(1/max(elapsed,.001),2),"cpu_percent":psutil.cpu_percent()})
                logger.info("session=%s frame=%s inference_ms=%s state=%s",sid,frame_id,result["inference_ms"],e.state.value)
                await ws.send_json(response.model_dump())
            except (ValueError, RuntimeError, ValidationError) as exc:
                pending = None
                e.pause(str(exc))
                persist(sid)
                await ws.send_json({"type":"error","message":str(exc)})
            except Exception as exc:
                logger.exception("Inference error")
                e.pause("AI 분석에 실패했습니다. 모델 및 서버 로그를 확인해 주세요.")
                persist(sid)
                await ws.send_json({"type":"error","message":e.message})
    except WebSocketDisconnect:
        pass
    finally:
        try:
            e.pause()
            persist(sid)
            with DB() as db:
                row = db.get(TrainingSession,sid)
                if row and row.status == "active":
                    row.status = "interrupted"
                    db.commit()
        except Exception:
            logger.exception("Failed to persist disconnected session %s", sid)
        finally:
            # A storage failure must not permanently reserve the single-user slot.
            connected = None

dist = ROOT.parent/"dist"
if dist.is_dir():
    app.mount("/",StaticFiles(directory=str(dist),html=True),name="frontend")
