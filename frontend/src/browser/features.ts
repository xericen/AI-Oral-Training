import {rules} from './config';
export interface Face {landmarks:number[][];blendshapes:Record<string,number>;matrix:number[]|null}
export interface TongueResult {label:string;confidence:number;latencyMs:number}
export interface VisionResult {pose:number[][][];faces:Face[];width:number;height:number;inference_ms:number;tongue?:TongueResult|null;tongue_error?:string|null}
export type Metrics=Record<string,number|null>;
export function tilt(a:number[],b:number[]){return Math.atan2(Math.abs(b[1]-a[1]),Math.abs(b[0]-a[0]))*180/Math.PI}
export function alignment(shoulder:number[],hip:number[]){return Math.atan2(Math.abs(shoulder[0]-hip[0]),Math.abs(shoulder[1]-hip[1]))*180/Math.PI}
export function angles(matrix:number[]|null){if(!matrix||matrix.length!==16||!matrix.every(Number.isFinite))return {yaw:null,pitch:null,roll:null};const m=[...matrix];for(let j=0;j<3;j++){const scale=Math.hypot(m[j],m[4+j],m[8+j]);if(scale<1e-6)return {yaw:null,pitch:null,roll:null};for(let i=0;i<3;i++)m[i*4+j]/=scale}return {yaw:Math.atan2(-m[8],Math.hypot(m[0],m[4]))*180/Math.PI,pitch:Math.atan2(m[9],m[10])*180/Math.PI,roll:Math.atan2(m[4],m[0])*180/Math.PI}}
export function extract(result:VisionResult):Metrics{
 const {pose,faces,width:w,height:h}=result;
 const m:Metrics={person_count:pose.length,face_count:faces.length,shoulder_tilt:null,body_alignment:null,body_lean:null,shoulder_height:null,center_x:null,mouth_open_ratio:null,mouth_width_ratio:null,jawOpen:null,mouthPucker:null,mouthFunnel:null,cheekPuff:null,mouthSmileLeft:null,mouthSmileRight:null,yaw:null,pitch:null,roll:null};
 if(pose.length===1){const p=pose[0].map(p=>[p[0]*w,p[1]*h,p[2]]);const visible=(ids:number[])=>ids.every(i=>p[i]?.[2]>=rules.confidence&&p[i][0]>0&&p[i][0]<w&&p[i][1]>0&&p[i][1]<h);
 if(visible([5,6])){m.shoulder_tilt=tilt(p[5],p[6]);const s=[(p[5][0]+p[6][0])/2,(p[5][1]+p[6][1])/2];const faceNose=faces.length===1?faces[0].landmarks[1]:null;const poseNose=visible([0])?[p[0][0]/w,p[0][1]/h]:null;const nose=faceNose&&faceNose.every(Number.isFinite)?faceNose:poseNose;const shoulderWidth=Math.hypot(p[5][0]-p[6][0],p[5][1]-p[6][1]);
 if(nose){const n=[nose[0]*w,nose[1]*h];m.body_alignment=alignment(n,s);m.body_lean=Math.atan2(s[0]-n[0],s[1]-n[1])*180/Math.PI;if(shoulderWidth>10)m.shoulder_height=(s[1]-n[1])/shoulderWidth;}
 }}
 if(faces.length===1){const f=faces[0],p=f.landmarks.map(p=>[p[0]*w,p[1]*h]);const ids=[234,454,13,14,61,291];if(p.length>=478&&ids.every(i=>p[i].every(Number.isFinite)&&p[i][0]>=0&&p[i][0]<=w&&p[i][1]>=0&&p[i][1]<=h)){const dist=(a:number,b:number)=>Math.hypot(p[a][0]-p[b][0],p[a][1]-p[b][1]);const ref=dist(234,454);if(ref>1){m.center_x=(p[234][0]+p[454][0])/(2*w);m.mouth_open_ratio=dist(13,14)/ref;m.mouth_width_ratio=dist(61,291)/ref;m.mouth_aspect=dist(13,14)/Math.max(1,dist(61,291));
 const extra=[50,280,205,425,1];if(extra.every(i=>p[i]?.every(Number.isFinite))){m.cheek_width=dist(50,280)/ref;m.cheek_left=dist(205,1)/ref;m.cheek_right=dist(425,1)/ref;}for(const key of ['jawOpen','mouthPucker','mouthFunnel','cheekPuff','mouthSmileLeft','mouthSmileRight'])m[key]=Number.isFinite(f.blendshapes[key])?f.blendshapes[key]:null;Object.assign(m,angles(f.matrix))}}}
 return m;
}
