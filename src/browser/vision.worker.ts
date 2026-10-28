import * as ort from 'onnxruntime-web/wasm';
import {FaceLandmarker,FilesetResolver} from '@mediapipe/tasks-vision';
import {visionConfig} from './config';import type {VisionResult} from './features';
let pose:ort.InferenceSession|null=null,face:FaceLandmarker|null=null,lastTime=0;
const size=visionConfig.inputSize;
import {decode} from './pose';
async function init(base:string){
 if(!(await FilesetResolver.isSimdSupported()))throw Error('이 브라우저는 AI 실행에 필요한 WebAssembly SIMD를 지원하지 않습니다. 최신 Chrome 또는 Edge를 이용해 주세요.');
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=base+'runtime/onnx/';
 pose=await ort.InferenceSession.create(base+'models/yolo11n-pose-320.onnx',{executionProviders:['wasm'],graphOptimizationLevel:'all'});
 const files=await FilesetResolver.forVisionTasks(base+'runtime/vision');
 face=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:base+'models/face_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:2,outputFaceBlendshapes:true,outputFacialTransformationMatrixes:true});
 // Warm up the real ONNX graph; loading is only reported ready after this succeeds.
 await pose.run({[pose.inputNames[0]]:new ort.Tensor('float32',new Float32Array(3*size*size),[1,3,size,size])});
}
async function infer(bitmap:ImageBitmap):Promise<VisionResult>{
 if(!pose||!face)throw Error('브라우저 AI 모델이 준비되지 않았습니다.');const start=performance.now(),w=bitmap.width,h=bitmap.height;
 const input=new OffscreenCanvas(size,size),ctx=input.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('이 브라우저는 오프스크린 캔버스를 지원하지 않습니다.');
 const scale=Math.min(size/w,size/h),rw=Math.round(w*scale),rh=Math.round(h*scale),px=Math.floor((size-rw)/2),py=Math.floor((size-rh)/2);
 ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,size,size);ctx.drawImage(bitmap,px,py,rw,rh);
 const rgba=ctx.getImageData(0,0,size,size).data,tensor=new Float32Array(3*size*size);
 for(let i=0;i<size*size;i++)for(let c=0;c<3;c++)tensor[c*size*size+i]=rgba[i*4+c]/255;
 const outputs=await pose.run({[pose.inputNames[0]]:new ort.Tensor('float32',tensor,[1,3,size,size])});const output=outputs[pose.outputNames[0]];
 const points=decode(output.data as Float32Array,output.dims,w,h,scale,px,py);
 lastTime=Math.max(lastTime+1,performance.now());
 const result=face.detectForVideo(bitmap,lastTime);
 return {pose:points,faces:result.faceLandmarks.map((pts,i)=>({landmarks:pts.map(p=>[p.x,p.y,p.z]),blendshapes:Object.fromEntries((result.faceBlendshapes[i]?.categories||[]).map(c=>[c.categoryName,c.score])),matrix:result.facialTransformationMatrixes[i]?.data?Array.from(result.facialTransformationMatrixes[i].data):null})),width:w,height:h,inference_ms:Math.round((performance.now()-start)*10)/10};
}
self.onmessage=async(event:MessageEvent)=>{const {id,type,base,bitmap}=event.data;try{if(type==='init'){await init(base);self.postMessage({id,ready:true})}else if(type==='frame'){const result=await infer(bitmap);self.postMessage({id,result})}}catch(e){self.postMessage({id,error:(e as Error).message||'브라우저 AI 분석에 실패했습니다.'})}finally{bitmap?.close()}};
