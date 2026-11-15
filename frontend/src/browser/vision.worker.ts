import * as ort from 'onnxruntime-web/wasm';
import {FaceLandmarker,FilesetResolver} from '@mediapipe/tasks-vision';
import {visionConfig} from './config';import type {VisionResult} from './features';
import {TongueDirectionClassifier} from './tongue';
import {loadCachedAsset,removeOldAssetCaches} from './assetCache';import {browserAssetVersion} from './modelVersion.generated';
let pose:ort.InferenceSession|null=null,face:FaceLandmarker|null=null,tongue:TongueDirectionClassifier|null=null,lastTime=0;
const size=visionConfig.inputSize;
import {decode} from './pose';
import {selectCentralSubject,matchSubjectFace} from './subject';
async function init(base:string){
 if(!(await FilesetResolver.isSimdSupported()))throw Error('이 브라우저는 AI 실행에 필요한 WebAssembly SIMD를 지원하지 않습니다. 최신 Chrome 또는 Edge를 이용해 주세요.');
 const [poseBytes,faceBytes,ortWasm,visionWasm]=await Promise.all([
  loadCachedAsset(base+'models/yolo11n-pose-320.onnx',browserAssetVersion),loadCachedAsset(base+'models/face_landmarker.task',browserAssetVersion),
  loadCachedAsset(base+'runtime/onnx/ort-wasm-simd-threaded.wasm',browserAssetVersion),loadCachedAsset(base+'runtime/vision/vision_wasm_internal.wasm',browserAssetVersion)
 ]);
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=base+'runtime/onnx/';ort.env.wasm.wasmBinary=ortWasm;
 const poseReady=ort.InferenceSession.create(poseBytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'}).then(async session=>{
  // Compile and warm up the graph while MediaPipe is loading in parallel.
  await session.run({[session.inputNames[0]]:new ort.Tensor('float32',new Float32Array(3*size*size),[1,3,size,size])});return session;
 });
 const visionWasmUrl=URL.createObjectURL(new Blob([visionWasm],{type:'application/wasm'}));
 try{const faceReady=FaceLandmarker.createFromOptions({wasmLoaderPath:base+'runtime/vision/vision_wasm_internal.js',wasmBinaryPath:visionWasmUrl},{baseOptions:{modelAssetBuffer:faceBytes,delegate:'CPU'},runningMode:'VIDEO',numFaces:2,outputFaceBlendshapes:true,outputFacialTransformationMatrixes:true});[pose,face]=await Promise.all([poseReady,faceReady]);await removeOldAssetCaches(browserAssetVersion)}finally{URL.revokeObjectURL(visionWasmUrl)}
}
async function infer(bitmap:ImageBitmap,tongueEnabled=false):Promise<VisionResult>{
 if(!pose||!face)throw Error('브라우저 AI 모델이 준비되지 않았습니다.');const start=performance.now(),w=bitmap.width,h=bitmap.height;
 const input=new OffscreenCanvas(size,size),ctx=input.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('이 브라우저는 오프스크린 캔버스를 지원하지 않습니다.');
 const scale=Math.min(size/w,size/h),rw=Math.round(w*scale),rh=Math.round(h*scale),px=Math.floor((size-rw)/2),py=Math.floor((size-rh)/2);
 ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,size,size);ctx.drawImage(bitmap,px,py,rw,rh);
 const rgba=ctx.getImageData(0,0,size,size).data,tensor=new Float32Array(3*size*size);
 for(let i=0;i<size*size;i++)for(let c=0;c<3;c++)tensor[c*size*size+i]=rgba[i*4+c]/255;
 const outputs=await pose.run({[pose.inputNames[0]]:new ort.Tensor('float32',tensor,[1,3,size,size])});const output=outputs[pose.outputNames[0]];
 const subject=selectCentralSubject(decode(output.data as Float32Array,output.dims,w,h,scale,px,py),w,h);
 if(!subject)return {pose:[],faces:[],width:w,height:h,inference_ms:Math.round((performance.now()-start)*10)/10,tongue:null,tongue_error:null};
 const head=new OffscreenCanvas(size,size),headContext=head.getContext('2d');if(!headContext)throw Error('얼굴 분석 캔버스를 준비하지 못했습니다.');
 const {x,y,side}=subject.crop;headContext.drawImage(bitmap,x,y,side,side,0,0,size,size);
 lastTime=Math.max(lastTime+1,performance.now());
 const result=face.detectForVideo(head,lastTime),candidates=result.faceLandmarks.map((pts,i)=>({landmarks:pts.map(p=>[(x+p.x*side)/w,(y+p.y*side)/h,p.z]),blendshapes:Object.fromEntries((result.faceBlendshapes[i]?.categories||[]).map(c=>[c.categoryName,c.score])),matrix:result.facialTransformationMatrixes[i]?.data?Array.from(result.facialTransformationMatrixes[i].data):null}));
 const matched=matchSubjectFace(subject,candidates,w,h),faces=matched?[matched]:[];
 let tongueResult=null,tongueError:string|null=null;
 if(tongueEnabled&&tongue&&faces.length===1)try{tongueResult=await tongue.predict(bitmap,faces[0].landmarks,w,h)}catch(error){tongueError=(error as Error).message||'혀 방향 추론에 실패했습니다.';tongue=null}
 return {pose:[subject.points],faces,width:w,height:h,inference_ms:Math.round((performance.now()-start)*10)/10,tongue:tongueResult,tongue_error:tongueError};
}
self.onmessage=async(event:MessageEvent)=>{const {id,type,base,bitmap,tongueEnabled}=event.data;try{if(type==='init'){await init(base);self.postMessage({id,ready:true,persistentCache:typeof caches!=='undefined'})}else if(type==='initTongue'){const modelBytes=await loadCachedAsset(base+'models/tongue-direction.onnx',browserAssetVersion),classifier=await TongueDirectionClassifier.create(modelBytes);tongue=classifier;self.postMessage({id,ready:true,persistentCache:typeof caches!=='undefined'})}else if(type==='frame'){const result=await infer(bitmap,Boolean(tongueEnabled));self.postMessage({id,result})}}catch(e){self.postMessage({id,error:(e as Error).message||'브라우저 AI 분석에 실패했습니다.'})}finally{bitmap?.close()}};
