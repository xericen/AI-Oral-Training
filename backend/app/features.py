"""Geometry uses image pixels; all values come from detectors."""
import math
import numpy as np
from .config import Settings

def shoulder_tilt(a: list, b: list) -> float:
    return math.degrees(math.atan2(abs(b[1] - a[1]), abs(b[0] - a[0])))

def body_alignment(shoulders: np.ndarray, hips: np.ndarray) -> float:
    dx, dy = shoulders - hips
    return math.degrees(math.atan2(abs(dx), abs(dy)))

def head_angles(matrix) -> dict:
    if matrix is None:
        return {"yaw": None, "pitch": None, "roll": None}
    try:
        r = np.asarray(matrix, dtype=float)[:3, :3]
        u, _, vt = np.linalg.svd(r)
        r = u @ vt
        if np.linalg.det(r) < 0:
            return {"yaw": None, "pitch": None, "roll": None}
        return {"yaw": math.degrees(math.atan2(-r[2, 0], math.hypot(r[0, 0], r[1, 0]))),
                "pitch": math.degrees(math.atan2(r[2, 1], r[2, 2])),
                "roll": math.degrees(math.atan2(r[1, 0], r[0, 0]))}
    except (ValueError, TypeError, np.linalg.LinAlgError):
        return {"yaw": None, "pitch": None, "roll": None}

def extract(pose: list, faces: list, width: int, height: int, cfg: Settings) -> dict:
    m = {"person_count": len(pose), "face_count": len(faces), "shoulder_tilt": None,
         "body_alignment": None, "center_x": None, "mouth_open_ratio": None,
         "mouth_width_ratio": None, "jawOpen": None, "mouthPucker": None,
         "mouthFunnel": None, "cheekPuff": None, "mouthSmileLeft": None,
         "mouthSmileRight": None, "yaw": None, "pitch": None, "roll": None}
    if len(pose) == 1:
        pts = np.asarray(pose[0], dtype=float)
        def visible(indices):
            return all(pts[i, 2] >= cfg.keypoint_confidence and 0 < pts[i, 0] < width and 0 < pts[i, 1] < height for i in indices)
        if visible([5, 6]):
            m["shoulder_tilt"] = shoulder_tilt(pts[5], pts[6])
            if visible([11, 12]):
                m["body_alignment"] = body_alignment(pts[[5, 6], :2].mean(0), pts[[11, 12], :2].mean(0))
    if len(faces) == 1:
        face = faces[0]
        pts = np.array([[p[0]*width, p[1]*height] for p in face["landmarks"]])
        if len(pts) >= 478 and np.isfinite(pts).all() and (pts >= 0).all() and (pts[:, 0] <= width).all() and (pts[:, 1] <= height).all():
            reference = np.linalg.norm(pts[234] - pts[454])
            if reference > 1:
                m["mouth_open_ratio"] = float(np.linalg.norm(pts[13] - pts[14]) / reference)
                m["mouth_width_ratio"] = float(np.linalg.norm(pts[61] - pts[291]) / reference)
                m["center_x"] = float((pts[234, 0] + pts[454, 0]) / (2*width))
                for key in ["jawOpen", "mouthPucker", "mouthFunnel", "cheekPuff", "mouthSmileLeft", "mouthSmileRight"]:
                    m[key] = face["blendshapes"].get(key)
                m.update(head_angles(face.get("matrix")))
    return m
