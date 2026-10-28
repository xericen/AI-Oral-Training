"""Optional real-model smoke tests; not webcam accuracy or clinical evaluation."""
import time
from pathlib import Path
import cv2
import numpy as np
import pytest
from app.config import settings
from app.detectors import ModelManager

@pytest.mark.real
def test_real_model_outputs():
    if not (settings.model_dir/"face_landmarker.task").exists():
        pytest.skip("Run scripts/download_models.py first")
    m=ModelManager(settings);m.load()
    try:
        assert m.status()["inference_available"],m.status()
        blank=cv2.imencode(".jpg",np.zeros((480,640,3),np.uint8))[1].tobytes()
        out=m.infer(blank,int(time.time()*1000))
        assert out["metrics"]["face_count"]==0 and out["metrics"]["person_count"]==0
        image=Path(__file__).parent/"fixtures"/"portrait.jpg"
        if not image.exists():pytest.skip("Official MediaPipe portrait fixture not installed")
        out=m.infer(image.read_bytes(),int(time.time()*1000)+1)
        assert out["metrics"]["face_count"]==1
        assert len(out["faces"][0]["landmarks"])==478
        for key in ["jawOpen","mouthPucker","mouthFunnel","cheekPuff"]:
            assert key in out["faces"][0]["blendshapes"]
        assert out["metrics"]["mouth_open_ratio"] is not None
        assert out["metrics"]["yaw"] is not None
        print({"metrics":out["metrics"],"latency_ms":out["inference_ms"]})
    finally:m.close()

@pytest.mark.real
def test_real_websocket_and_invalid_jpeg(tmp_path,monkeypatch):
    from fastapi.testclient import TestClient
    from app import main
    from app.db import make_database
    eng,db=make_database("sqlite:///"+str(tmp_path/"real.sqlite3"))
    monkeypatch.setattr(main,"DB",db)
    monkeypatch.setattr(main,"manager",ModelManager(settings))
    main.runtimes.clear();main.connected=None
    with TestClient(main.app) as client:
        assert client.get("/api/model/status").json()["inference_available"]
        sid=client.post("/api/sessions",json={"participant_code":"real-fixture-test"}).json()["id"]
        with client.websocket_connect("/ws/training/"+sid) as ws:
            ws.receive_json();ws.send_json({"type":"start"});ws.receive_json()
            ws.send_json({"type":"frame","frame_id":1,"timestamp_ms":int(time.time()*1000)})
            ws.send_bytes((Path(__file__).parent/"fixtures"/"portrait.jpg").read_bytes())
            result=ws.receive_json()
            assert result["type"]=="analysis_result"
            assert result["detections"]["face_detected"]
            assert len(result["overlay"]["face_landmarks"])==478
            assert result["progress"]["repetition"]==0
            assert result["criteria"]["body_visible"] is False
            ws.send_json({"type":"frame","frame_id":2,"timestamp_ms":int(time.time()*1000)+1})
            ws.send_bytes(b"invalid-jpeg")
            assert ws.receive_json()["type"]=="error"
            assert main.runtimes[sid]["engine"].elapsed==0
        assert client.post("/api/sessions/"+sid+"/finish",json={"status":"cancelled"}).status_code==200
        assert client.get("/api/records/"+sid).json()["completed_steps"]==0
    eng.dispose()
