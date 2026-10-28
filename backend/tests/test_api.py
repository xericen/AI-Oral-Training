import time
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app import main
from app.db import make_database
from test_engine import metrics

class Detector:
    def load(self): pass
    def close(self): pass
    def status(self): return {"pose_model_loaded":True,"face_model_loaded":True,"inference_available":True,"error":None,"mode":"TEST_DETECTOR"}
    def infer(self,payload,timestamp):return {"metrics":metrics(),"pose":[],"faces":[],"inference_ms":2}

@pytest.fixture
def client(tmp_path,monkeypatch):
    eng,db=make_database("sqlite:///"+str(tmp_path/"test.sqlite3"))
    monkeypatch.setattr(main,"DB",db);monkeypatch.setattr(main,"manager",Detector())
    main.runtimes.clear();main.connected=None
    with TestClient(main.app) as c:yield c
    eng.dispose()

def test_session_finish_and_records(client):
    assert client.get("/api/health").status_code==200
    row=client.post("/api/sessions",json={"participant_code":"test"}).json();sid=row["id"]
    assert len(row["steps"])==4
    assert client.post(f"/api/sessions/{sid}/finish",json={"status":"completed"}).status_code==409
    r=client.post(f"/api/sessions/{sid}/finish",json={"status":"cancelled"})
    assert r.status_code==200 and r.json()["status"]=="cancelled"
    assert client.get("/api/records").json()[0]["id"]==sid
    assert client.get("/api/records/"+sid).json()["steps"][0]["success_count"]==0
    assert client.get("/api/records/missing").status_code==404
    assert client.post("/api/sessions",json={"participant_code":"bad code"}).status_code==422

def test_websocket_frame_control_and_disconnect(client):
    sid=client.post("/api/sessions",json={}).json()["id"]
    with client.websocket_connect("/ws/training/"+sid) as ws:
        assert ws.receive_json()["type"]=="connected"
        ws.send_json({"type":"start"});assert ws.receive_json()["step_state"]=="CALIBRATING"
        ws.send_json({"type":"frame","frame_id":1,"timestamp_ms":int(time.time()*1000)})
        ws.send_bytes(cv2.imencode(".jpg",np.zeros((48,64,3),np.uint8))[1].tobytes())
        assert ws.receive_json()["type"]=="analysis_result"
        ws.send_json({"type":"pause"});assert ws.receive_json()["step_state"]=="PAUSED"
        ws.send_json({"type":"next"});assert ws.receive_json()["type"]=="error"
    assert main.connected is None
    assert main.runtimes[sid]["engine"].elapsed==0

def test_websocket_rejects_out_of_order_and_missing_models(client,monkeypatch):
    sid=client.post("/api/sessions",json={}).json()["id"]
    with client.websocket_connect("/ws/training/"+sid) as ws:
        ws.receive_json();ws.send_bytes(b"notjpeg")
        assert ws.receive_json()["type"]=="error"
        monkeypatch.setattr(main.manager,"status",lambda:{"inference_available":False,"error":"missing"})
        ws.send_json({"type":"start"})
        assert "모델" in ws.receive_json()["message"]

def test_finished_counts_cannot_be_injected(client):
    sid=client.post("/api/sessions",json={}).json()["id"]
    r=client.post("/api/sessions/"+sid+"/finish",json={"status":"completed","counts":[1,3,3,3]})
    assert r.status_code==409

def test_calibration_endpoint_and_persisted_profile(client):
    sid=client.post("/api/sessions",json={}).json()["id"]
    assert client.post("/api/calibration",json={"session_id":sid}).json()["step_state"]=="CALIBRATING"
    e=main.runtimes[sid]["engine"];e.baseline=metrics();main.persist(sid)
    with main.DB() as db:
        from app.db import CalibrationProfile
        assert db.get(CalibrationProfile,sid).values["jawOpen"]==.05

def test_simultaneous_connection_rejected(client):
    sid=client.post("/api/sessions",json={}).json()["id"]
    with client.websocket_connect("/ws/training/"+sid) as ws:
        ws.receive_json()
        with client.websocket_connect("/ws/training/"+sid) as second:
            assert second.receive_json()["type"]=="error"

def test_full_training_synthetic_detector_and_real_db(client,monkeypatch):
    # Synthetic rules input is confined to this test, never production routes.
    from test_engine import Clock
    sid=client.post("/api/sessions",json={"participant_code":"synthetic-test"}).json()["id"]
    e=main.runtimes[sid]["engine"];clock=Clock();e.clock=clock;e.calibrating_since=clock()
    current={"value":metrics()};counter=0
    monkeypatch.setattr(main.manager,"infer",lambda payload,stamp:{"metrics":current["value"],"pose":[],"faces":[],"inference_ms":1})
    with client.websocket_connect("/ws/training/"+sid) as ws:
        ws.receive_json();ws.send_json({"type":"start"});ws.receive_json()
        def frame():
            nonlocal counter
            counter+=1;clock.tick(.25)
            ws.send_json({"type":"frame","frame_id":counter,"timestamp_ms":int(time.time()*1000)+counter})
            ws.send_bytes(b"synthetic-detector-input")
            return ws.receive_json()
        for _ in range(10):frame()
        assert e.baseline
        for _ in range(12):frame()
        assert e.counts[0]==1
        ws.send_json({"type":"next"});assert ws.receive_json()["step_id"]=="mouth_open"
        for _ in range(3):
            current["value"]=metrics();frame()
            current["value"]=metrics(jawOpen=.7,mouth_open_ratio=.16)
            for _ in range(10):frame()
        assert e.counts[1]==3
        ws.send_json({"type":"next"});assert ws.receive_json()["step_id"]=="pucker"
        for _ in range(3):
            current["value"]=metrics();frame()
            current["value"]=metrics(mouthPucker=.7,mouth_width_ratio=.2)
            for _ in range(10):frame()
        assert e.counts[2]==3
        ws.send_json({"type":"next"});assert ws.receive_json()["step_id"]=="cheek"
        for _ in range(3):
            ws.send_json({"type":"manual_complete"});ws.receive_json()
        assert e.counts==[1,3,3,3]
    response=client.post("/api/sessions/"+sid+"/finish",json={"status":"completed"})
    assert response.status_code==200
    saved=client.get("/api/records/"+sid).json()
    assert saved["completed_steps"]==4 and saved["status"]=="completed"
    assert next(s for s in saved["steps"] if s["step_id"]=="cheek")["detection_mode"]=="MANUAL"

def test_disconnect_storage_failure_does_not_block_next_connection(client,monkeypatch):
    sid=client.post("/api/sessions",json={}).json()["id"]
    original=main.persist
    with client.websocket_connect("/ws/training/"+sid) as ws:
        assert ws.receive_json()["type"]=="connected"
        monkeypatch.setattr(main,"persist",lambda sid: (_ for _ in ()).throw(RuntimeError("test storage failure")))
    assert main.connected is None
    monkeypatch.setattr(main,"persist",original)
    next_sid=client.post("/api/sessions",json={}).json()["id"]
    with client.websocket_connect("/ws/training/"+next_sid) as ws:
        assert ws.receive_json()["type"]=="connected"
