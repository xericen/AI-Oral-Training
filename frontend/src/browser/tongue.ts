import * as ort from 'onnxruntime-web/wasm';

export const tongueClasses=['mouth_closed','mouth_open','tongue_down','tongue_left','tongue_middle','tongue_right','tongue_up'] as const;
export type TongueClass=typeof tongueClasses[number];
export interface TonguePrediction {label:TongueClass;confidence:number;latencyMs:number}
export interface MouthBounds {x:number;y:number;width:number;height:number}

const mouthIndices=[0,13,14,17,61,78,82,87,291,308,312,317];
const mean=[.485,.456,.406],std=[.229,.224,.225];

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
 static async create(modelUrl:string){
  const session=await ort.InferenceSession.create(modelUrl,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
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
  const logits=Array.from(outputs[this.session.outputNames[0]].data as Float32Array),peak=Math.max(...logits);
  const exponentials=logits.map(value=>Math.exp(value-peak)),total=exponentials.reduce((sum,value)=>sum+value,0),probabilities=exponentials.map(value=>value/total);
  const index=probabilities.indexOf(Math.max(...probabilities));
  return {label:tongueClasses[index],confidence:probabilities[index],latencyMs:performance.now()-started};
 }
}
