import {visionConfig} from './config';
function iou(a:number[],b:number[]){const area=(p:number[])=>Math.max(0,p[2]-p[0])*Math.max(0,p[3]-p[1]);const intersect=area([Math.max(a[0],b[0]),Math.max(a[1],b[1]),Math.min(a[2],b[2]),Math.min(a[3],b[3])]);return intersect/(area(a)+area(b)-intersect+1e-9)}
export function decode(data:Float32Array,dims:readonly number[],w:number,h:number,scale:number,padX:number,padY:number):number[][][]{
 if(dims.length!==3||dims[1]!==56)throw Error('자세 모델 출력 형식이 올바르지 않습니다.');
 const n=dims[2],candidates:{box:number[],score:number,points:number[][]}[]=[];
 for(let i=0;i<n;i++){const at=(c:number)=>data[c*n+i],score=at(4);if(score<visionConfig.personConfidence)continue;
 const x=at(0),y=at(1),bw=at(2),bh=at(3);
 candidates.push({score,box:[x-bw/2,y-bh/2,x+bw/2,y+bh/2],points:Array.from({length:17},(_,j)=>[(at(5+j*3)-padX)/scale/w,(at(6+j*3)-padY)/scale/h,at(7+j*3)])})}
 candidates.sort((a,b)=>b.score-a.score);const kept:typeof candidates=[];
 for(const p of candidates){if(!kept.some(k=>iou(k.box,p.box)>visionConfig.nmsIou))kept.push(p);if(kept.length===3)break}return kept.map(p=>p.points);
}
