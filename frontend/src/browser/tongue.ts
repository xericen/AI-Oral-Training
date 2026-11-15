import * as ort from 'onnxruntime-web/wasm';

export const tongueClasses=['mouth_closed','mouth_open','tongue_down','tongue_left','tongue_middle','tongue_right','tongue_up'] as const;
export type TongueClass=typeof tongueClasses[number];
export interface TonguePrediction {label:TongueClass;confidence:number;latencyMs:number}
export interface TonguePredictionSummary extends TonguePrediction {stable:boolean;samples:number;votes:number}
export interface MouthBounds {x:number;y:number;width:number;height:number}

export const tongueLabels:Record<TongueClass,string>={mouth_closed:'입 다물기',mouth_open:'입 벌리기',tongue_down:'혀 아래',tongue_left:'혀 왼쪽',tongue_middle:'혀 앞으로',tongue_right:'혀 오른쪽',tongue_up:'혀 위'};
const tongueRuleTargets:Record<string,TongueClass>={TONGUE_OUT:'tongue_middle',TONGUE_DOWN:'tongue_down',TONGUE_LEFT:'tongue_left',TONGUE_RIGHT:'tongue_right',TONGUE_UP:'tongue_up'};
export const tongueTargetForRule=(rule:string)=>tongueRuleTargets[rule]??null;
export const isTongueDirectionRule=(rule:string)=>tongueTargetForRule(rule)!==null;

const mouthIndices=[0,13,14,17,61,78,82,87,291,308,312,317];
const mean=[.485,.456,.406],std=[.229,.224,.225];

export function summarizeTonguePredictions(rows:TonguePrediction[],minimumVotes=3):TonguePredictionSummary|null{
 const valid=rows.filter(row=>tongueClasses.includes(row.label)&&Number.isFinite(row.confidence)&&row.confidence>=0&&row.confidence<=1&&Number.isFinite(row.latencyMs)&&row.latencyMs>=0);
 if(!valid.length)return null;
 const scores=new Map<TongueClass,{votes:number;confidence:number}>();
 for(const row of valid){const score=scores.get(row.label)??{votes:0,confidence:0};score.votes++;score.confidence+=row.confidence;scores.set(row.label,score)}
 const winner=[...scores.entries()].sort((a,b)=>b[1].votes-a[1].votes||b[1].confidence-a[1].confidence)[0];
 const matching=valid.filter(row=>row.label===winner[0]);
 return {label:winner[0],confidence:matching.reduce((sum,row)=>sum+row.confidence,0)/matching.length,latencyMs:matching.reduce((sum,row)=>sum+row.latencyMs,0)/matching.length,stable:valid.length>=minimumVotes&&winner[1].votes>=minimumVotes,samples:valid.length,votes:winner[1].votes};
}

export function mouthBounds(landmarks:number[][],sourceWidth:number,sourceHeight:number,padding=.45):MouthBounds|null{
 const points=mouthIndices.map(index=>landmarks[index]).filter(point=>point&&point.length>=2&&point.every(Number.isFinite));
 if(points.length!==mouthIndices.length||sourceWidth<=0||sourceHeight<=0)return null;
 const xs=points.map(point=>point[0]*sourceWidth),ys=points.map(point=>point[1]*sourceHeight);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const baseWidth=maxX-minX,baseHeight=maxY-minY;if(baseWidth<2||baseHeight<2)return null;
 const side=Math.max(baseWidth,baseHeight)*Math.max(1,1+padding*2);
 const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
 const x=Math.max(0,centerX-side/2),y=Math.max(0,centerY-side/2);
 return {x,y,width:Math.min(side,sourceWidth-x),height:Math.min(side,sourceHeight-y)};
}

export class TongueDirectionClassifier{
 private constructor(private session:ort.InferenceSession,private size=224){}
 static async create(model:string|ArrayBuffer|Uint8Array){
  const options:ort.InferenceSession.SessionOptions={executionProviders:['wasm'],graphOptimizationLevel:'all'};
  const session=typeof model==='string'?await ort.InferenceSession.create(model,options):await ort.InferenceSession.create(model instanceof Uint8Array?model:new Uint8Array(model),options);
  if(session.inputNames.length!==1||session.outputNames.length!==1)throw Error('혀 방향 모델의 입출력 구조가 올바르지 않습니다.');
  const input=new Float32Array(3*224*224),outputs=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',input,[1,3,224,224])});
  const logits=Array.from(outputs[session.outputNames[0]]?.data as Float32Array|undefined??[]);
  if(logits.length!==tongueClasses.length||!logits.every(Number.isFinite))throw Error('혀 방향 모델의 7개 클래스 출력을 확인하지 못했습니다.');
  return new TongueDirectionClassifier(session);
 }
 async predict(source:CanvasImageSource,landmarks:number[][],sourceWidth:number,sourceHeight:number):Promise<TonguePrediction|null>{
  const bounds=mouthBounds(landmarks,sourceWidth,sourceHeight);if(!bounds)return null;
  const canvas=new OffscreenCanvas(this.size,this.size),context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return null;
  context.drawImage(source,bounds.x,bounds.y,bounds.width,bounds.height,0,0,this.size,this.size);
  const pixels=context.getImageData(0,0,this.size,this.size).data,input=new Float32Array(3*this.size*this.size);
  for(let index=0;index<this.size*this.size;index++)for(let channel=0;channel<3;channel++)input[channel*this.size*this.size+index]=(pixels[index*4+channel]/255-mean[channel])/std[channel];
  const started=performance.now(),name=this.session.inputNames[0];
  const outputs=await this.session.run({[name]:new ort.Tensor('float32',input,[1,3,this.size,this.size])});
  const logits=Array.from(outputs[this.session.outputNames[0]]?.data as Float32Array|undefined??[]);
  if(logits.length!==tongueClasses.length||!logits.every(Number.isFinite))throw Error('혀 방향 모델이 올바른 7개 클래스 결과를 반환하지 않았습니다.');
  const peak=Math.max(...logits);
  const exponentials=logits.map(value=>Math.exp(value-peak)),total=exponentials.reduce((sum,value)=>sum+value,0),probabilities=exponentials.map(value=>value/total);
  const index=probabilities.indexOf(Math.max(...probabilities));
  return {label:tongueClasses[index],confidence:probabilities[index],latencyMs:performance.now()-started};
 }
}
