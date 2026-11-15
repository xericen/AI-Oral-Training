import type {Face} from './features';

export interface CentralSubject {points:number[][];nose:number[];shoulderWidth:number;crop:{x:number;y:number;side:number}}
const visible=(point:number[]|undefined,confidence=.35):point is number[]=>!!point&&point.length>=3&&point.every(Number.isFinite)&&point[2]>=confidence&&point[0]>=0&&point[0]<=1&&point[1]>=0&&point[1]<=1;

/** Select one torso in the central 30% of the frame, independently of detector order. */
export function selectCentralSubject(poses:number[][][],width:number,height:number):CentralSubject|null{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 const candidates:CentralSubject[]=[];
 for(const points of poses){
  if(!visible(points[5],.5)||!visible(points[6],.5)||!visible(points[0]))continue;
  const center=(points[5][0]+points[6][0])/2;
  if(center<.35||center>.65)continue;
  const nose=points[0],shoulderWidth=Math.hypot((points[5][0]-points[6][0])*width,(points[5][1]-points[6][1])*height);
  if(shoulderWidth<24||nose[1]>Math.max(points[5][1],points[6][1]))continue;
  const side=Math.min(width,height,shoulderWidth*.95);
  const crop={x:Math.max(0,Math.min(width-side,nose[0]*width-side/2)),y:Math.max(0,Math.min(height-side,nose[1]*height-side*.45)),side};
  candidates.push({points,nose,shoulderWidth,crop});
 }
 candidates.sort((a,b)=>Math.abs((a.points[5][0]+a.points[6][0])/2-.5)-Math.abs((b.points[5][0]+b.points[6][0])/2-.5)||b.shoulderWidth-a.shoulderWidth);
 return candidates[0]??null;
}

/** Never combine the chosen torso with an unrelated or ambiguous face. */
export function matchSubjectFace(subject:CentralSubject,faces:Face[],width:number,height:number):Face|null{
 const {nose,shoulderWidth,crop}=subject;
 const candidates=faces.flatMap(face=>{
  const point=face.landmarks[1];if(!point||!point.every(Number.isFinite))return [];
  const x=point[0]*width,y=point[1]*height;
  if(x<crop.x||x>crop.x+crop.side||y<crop.y||y>crop.y+crop.side)return [];
  const distance=Math.hypot(x-nose[0]*width,y-nose[1]*height);
  return distance<=shoulderWidth*.3?[{face,distance}]:[];
 }).sort((a,b)=>a.distance-b.distance);
 if(!candidates.length||(candidates[1]&&candidates[1].distance-candidates[0].distance<shoulderWidth*.12))return null;
 return candidates[0].face;
}
