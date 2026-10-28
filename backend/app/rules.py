"""Configurable prototype rules; unavailable measurements never pass."""
from .config import Settings

def forward(m: dict, c: Settings) -> bool:
    return all(m.get(k) is not None and abs(m[k]) <= limit for k, limit in
               [("yaw", c.head_yaw), ("pitch", c.head_pitch), ("roll", c.head_roll)])

def posture(m: dict, c: Settings) -> dict:
    return {"one_person": m["person_count"] == 1,
            "face_visible": m["face_count"] == 1 and m["center_x"] is not None,
            "face_forward": forward(m, c),
            "centered": m["center_x"] is not None and c.center_min <= m["center_x"] <= c.center_max,
            "shoulders_visible": m["shoulder_tilt"] is not None,
            "shoulders_aligned": None if m["shoulder_tilt"] is None else m["shoulder_tilt"] <= c.shoulder_degrees,
            "body_visible": m["body_alignment"] is not None,
            "body_aligned": None if m["body_alignment"] is None else m["body_alignment"] <= c.body_degrees}

def mouth(rule: str, m: dict, baseline: dict, c: Settings) -> dict:
    criteria = {"one_person": m["person_count"] == 1, "face_visible": m["face_count"] == 1 and m["center_x"] is not None,
                "face_forward": forward(m, c)}
    def delta(key):
        return None if m.get(key) is None or baseline.get(key) is None else m[key] - baseline[key]
    if rule == "MOUTH_OPEN":
        j, r = delta("jawOpen"), delta("mouth_open_ratio")
        criteria["mouth_open"] = None if j is None or r is None else j >= c.jaw_delta and r >= c.mouth_ratio_delta
    elif rule == "PUCKER":
        p, j, w = delta("mouthPucker"), delta("jawOpen"), delta("mouth_width_ratio")
        criteria["pucker"] = None if p is None or j is None or w is None else p >= c.pucker_delta and j < c.jaw_delta and w <= -c.mouth_width_delta
    elif rule == "SMILE":
        left, right = delta("mouthSmileLeft"), delta("mouthSmileRight")
        criteria["smile"] = None if left is None or right is None else left >= c.smile_delta and right >= c.smile_delta
    return criteria

def feedback(criteria: dict) -> str:
    messages = {"one_person":"한 명만 카메라 앞에 위치해 주세요.", "face_visible":"얼굴이 화면에 보이도록 위치를 조정해 주세요.",
                "face_forward":"카메라 정면을 바라봐 주세요.", "centered":"화면 중앙에 얼굴을 맞춰 주세요.",
                "shoulders_visible":"양쪽 어깨가 화면에 보이도록 조정해 주세요.", "shoulders_aligned":"어깨를 수평으로 맞춰 주세요.",
                "body_visible":"상체 정렬 확인을 위해 양쪽 골반까지 보이도록 조정해 주세요.",
                "body_aligned":"보이는 상체 중심선을 수직으로 맞춰 주세요.", "mouth_open":"입을 조금 더 벌려 주세요.", "pucker":"입술을 앞으로 모아 오므려 주세요.", "smile":"양쪽 입꼬리를 움직여 주세요."}
    return next((messages.get(k, "조건을 확인해 주세요.") for k, value in criteria.items() if value is not True), "좋아요! 조금만 더 유지하세요.")
