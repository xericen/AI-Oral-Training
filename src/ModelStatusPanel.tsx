import type {Analysis,ModelStatus} from './types';
import {rules} from './browser/config';

interface Props {models:ModelStatus|null;analysis:Analysis|null;active:boolean;preparing:boolean;error:string}
const percent=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1?Math.round(value*100)+'%':'—';

/** Show model outputs as scores, never as evaluated accuracy. */
export default function ModelStatusPanel({models,analysis,active,preparing,error}:Props){
 const fresh=active&&!error&&analysis?.timestamp_ms!==undefined&&Date.now()-analysis.timestamp_ms<=rules.maxAge*1000;
 const poses=fresh?analysis?.overlay?.pose_keypoints:undefined;
 const shoulders=poses?.length===1?[poses[0][5],poses[0][6]]:null;
 const shoulderScore=shoulders?.every(p=>p&&p.length>=3&&p.slice(0,2).every(v=>Number.isFinite(v)&&v>0&&v<1)&&Number.isFinite(p[2])&&p[2]>=0&&p[2]<=1)?(shoulders[0][2]+shoulders[1][2])/2:null;
 const faceVisible=!!(fresh&&analysis?.metrics?.face_count===1&&analysis?.overlay?.face_landmarks.length);
 const status=(loaded:boolean|undefined)=>error?'확인 오류':loaded?'준비 완료':preparing?'준비 중':'준비 필요';
 return <div className="model-overview">
 <div className="model-status-grid">
 <article className="model-status-card"><header><h3>자세 인식 · YOLO (욜로)</h3><span>{status(models?.pose_model_loaded)}</span></header><p>어깨·팔·골반 위치와 상체 정렬을 확인합니다.</p><small>사용 모델: YOLO11n-pose</small><dl><div><dt>현재 어깨 검출 신뢰 점수</dt><dd>{percent(shoulderScore)}</dd></div><div><dt>평가 정확도</dt><dd>미측정</dd></div></dl><p className="score-explanation">양쪽 어깨 키포인트 점수의 평균입니다. 정답률이나 바른 자세의 확률이 아닙니다.</p></article>
 <article className="model-status-card"><header><h3>얼굴·입 움직임 · MediaPipe</h3><span>{status(models?.face_model_loaded)}</span></header><p>얼굴 방향·입 벌리기·입술 오므리기를 확인합니다.</p><small>사용 모델: Face Landmarker (미디어파이프)</small><dl><div><dt>현재 얼굴 검출</dt><dd>{fresh?(faceVisible?'검출됨':'미검출 / 한 명 확인 필요'):'대기'}</dd></div><div><dt>입 벌림 계수</dt><dd>{percent(faceVisible?analysis?.metrics?.jawOpen:null)}</dd></div><div><dt>입술 오므림 계수</dt><dd>{percent(faceVisible?analysis?.metrics?.mouthPucker:null)}</dd></div><div><dt>평가 정확도</dt><dd>미측정</dd></div></dl><p className="score-explanation">입 움직임 계수(0~1)를 %로 표시합니다. 검출 신뢰도·성공률·정답률이 아닙니다.</p></article>
 </div>
 <p className="evaluation-note"><strong>현재 성능: 평가 전</strong> · 사전학습 모델을 사용 중입니다. 정답이 표시된 별도 평가 데이터가 없어 정확도·Precision·Recall·F1은 아직 산출하지 않았습니다. 추후 동일한 평가 데이터와 기준으로 학습 전후를 비교해야 합니다.</p>
 {!active&&<p>카메라를 켜면 현재 검출 점수와 입 움직임 계수가 표시됩니다. 값이 없으면 —로 표시합니다.</p>}
 </div>
}
