import math
import numpy as np
import pytest
from app.config import Settings
from app.schemas import Exercise
from app.engine import StepEngine
from app.features import shoulder_tilt,body_alignment,head_angles,extract
from app.rules import posture,mouth

class Clock:
    def __init__(self): self.t=0
    def __call__(self): return self.t
    def tick(self,d=.2): self.t+=d

def metrics(**changes):
    return dict(person_count=1,face_count=1,center_x=.5,shoulder_tilt=1.,body_alignment=1.,yaw=0.,pitch=0.,roll=0.,
                jawOpen=.05,mouthPucker=.05,mouthFunnel=.02,cheekPuff=.01,mouth_open_ratio=.02,mouth_width_ratio=.3,**changes) if not changes else {**metrics(),**changes}

def make(rule="MOUTH_OPEN",count=2):
    clock=Clock()
    cfg=Settings(calibration_samples=3,calibration_seconds=.4)
    ex=Exercise(id="test",title="test",description="",detection_type="FACE",rule=rule,hold_seconds=.4,repetitions=count,auto_complete=True)
    e=StepEngine([ex],cfg,clock);e.baseline=metrics();e.resume()
    return e,clock

def test_geometry_and_rotation():
    assert shoulder_tilt([100,10],[0,10])==0
    assert shoulder_tilt([0,0],[10,10])==45
    assert body_alignment(np.array([10,0]),np.array([10,50]))==0
    assert head_angles(np.eye(4))=={"yaw":0.,"pitch":0.,"roll":0.}
    r=np.eye(4);a=math.radians(30);r[:3,:3]=[[math.cos(a),0,math.sin(a)],[0,1,0],[-math.sin(a),0,math.cos(a)]]
    assert head_angles(r)["yaw"]==pytest.approx(30)
    assert head_angles(None)["yaw"] is None

def test_face_ratio_pixel_aspect_and_visibility():
    points=[[.5,.5,0.] for _ in range(478)]
    points[234]=[.25,.5,0];points[454]=[.75,.5,0];points[13]=[.5,.45,0];points[14]=[.5,.55,0]
    m=extract([], [{"landmarks":points,"blendshapes":{"jawOpen":.5},"matrix":np.eye(4)}],640,480,Settings())
    assert m["mouth_open_ratio"]==pytest.approx(48/320)
    assert m["shoulder_tilt"] is None
    assert posture(m,Settings())["body_aligned"] is None

@pytest.mark.parametrize("change",[{"face_count":0},{"person_count":2},{"yaw":25},{"body_alignment":None},{"shoulder_tilt":None}])
def test_posture_invalid(change):
    assert not all(v is True for v in posture(metrics(**change),Settings()).values())

def test_mouth_deltas_and_pucker():
    c=Settings();base=metrics()
    assert mouth("MOUTH_OPEN",metrics(jawOpen=.6,mouth_open_ratio=.12),base,c)["mouth_open"]
    assert not mouth("MOUTH_OPEN",metrics(jawOpen=.6),base,c)["mouth_open"]
    assert mouth("PUCKER",metrics(mouthPucker=.6,mouth_width_ratio=.2),base,c)["pucker"]
    assert not mouth("PUCKER",metrics(mouthPucker=.6,mouth_width_ratio=.2,jawOpen=.7),base,c)["pucker"]

def test_hold_and_release_latch():
    e,c=make();m=metrics(jawOpen=.6,mouth_open_ratio=.15)
    for _ in range(4):e.update(m);c.tick()
    assert e.counts==[1]
    for _ in range(20):e.update(m);c.tick()
    assert e.counts==[1]
    e.update(metrics());c.tick()
    for _ in range(4):e.update(m);c.tick()
    assert e.counts==[2] and e.state=="COMPLETED"

@pytest.mark.parametrize("bad",[metrics(face_count=0),metrics(person_count=2),metrics(jawOpen=.05,mouth_open_ratio=.02)])
def test_condition_loss_resets(bad):
    e,c=make();m=metrics(jawOpen=.6,mouth_open_ratio=.15)
    e.update(m);c.tick();e.update(m);assert e.elapsed>0;c.tick();e.update(bad)
    assert e.elapsed==0 and e.counts==[0] and e.retries==[1]

def test_long_gap_stale_pause_never_counts():
    e,c=make();m=metrics(jawOpen=.6,mouth_open_ratio=.15)
    e.update(m);c.tick(2);e.update(m);assert e.elapsed==0
    c.tick();e.update(m);e.update({},stale=True);assert e.elapsed==0
    e.pause();c.tick(10);e.update(m);assert e.counts==[0] and e.elapsed==0

def test_calibration_median_and_failure():
    e,c=make();e.baseline={};e.calibrate()
    for _ in range(5):
        e.update(metrics());c.tick()
        if e.baseline: break
    assert e.baseline["jawOpen"]==.05 and e.state=="READY"
    e2,c=make();e2.baseline={};e2.calibrate();c.tick(21);e2.update(metrics(face_count=0))
    assert e2.state=="ERROR" and not e2.baseline

def test_no_skip_or_manual_fake_success():
    e,c=make()
    with pytest.raises(ValueError):e.advance()
    with pytest.raises(ValueError):e.manual_complete()
    ex=e.exercise.model_copy(update={"auto_complete":False,"detection_type":"MANUAL","rule":"MANUAL"})
    e=StepEngine([ex],Settings(),c);e.baseline=metrics();e.resume();e.manual_complete()
    assert e.counts==[1]
    e.pause()
    with pytest.raises(ValueError):e.manual_complete()

def test_unsupported_head_pose_cannot_pass():
    assert not all(v is True for v in mouth("MOUTH_OPEN",metrics(yaw=None,jawOpen=.6,mouth_open_ratio=.15),metrics(),Settings()).values())

def test_smile_rule_uses_both_sides():
    base={**metrics(),"mouthSmileLeft":.01,"mouthSmileRight":.01}
    good={**base,"mouthSmileLeft":.5,"mouthSmileRight":.5}
    assert mouth("SMILE",good,base,Settings())["smile"]
    assert not mouth("SMILE",{**good,"mouthSmileRight":.01},base,Settings())["smile"]

def test_manual_exercise_configuration_cannot_enable_automatic_success():
    with pytest.raises(ValueError):
        Exercise(id="cheek",title="볼",description="",detection_type="MANUAL",rule="MANUAL",hold_seconds=2,repetitions=3,auto_complete=True)
