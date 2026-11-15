import {visionConfig} from './config';import type {VisionResult} from './features';import {browserAssetVersion} from './modelVersion.generated';
const storedAssetVersionKey='oral-ai-asset-version';
const storedTongueAssetVersionKey='oral-ai-tongue-asset-version';
export function hasStoredModelAssets(){return typeof localStorage!=='undefined'&&localStorage.getItem(storedAssetVersionKey)===browserAssetVersion}
export function hasStoredTongueModelAsset(){return typeof localStorage!=='undefined'&&localStorage.getItem(storedTongueAssetVersionKey)===browserAssetVersion}
export class BrowserVision {
 private worker:Worker|null=null;private serial=0;private pending=new Map<number,{resolve:(v:any)=>void,reject:(e:Error)=>void,timer:ReturnType<typeof setTimeout>}>();private ready:Promise<void>|null=null;private tongueReady:Promise<void>|null=null;
 private request(type:string,data:object,transfer:Transferable[]=[],timeout=visionConfig.inferenceTimeoutMs):Promise<any>{
  if(!this.worker)return Promise.reject(Error('브라우저 분석기가 종료되었습니다.'));
  const id=++this.serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error(type==='init'?'AI 모델 준비 시간이 초과되었습니다. 인터넷 연결과 브라우저 지원을 확인해 주세요.':'분석이 지연되고 있습니다. 일시정지 후 다시 시작해 주세요.'))},timeout);this.pending.set(id,{resolve,reject,timer});this.worker!.postMessage({id,type,...data},transfer)})}
 initialize(){if(this.ready)return this.ready;
 // Classic worker supports MediaPipe's Emscripten importScripts loader.
 this.worker=new Worker(new URL('runtime/browser-ai.worker.js',new URL(import.meta.env.BASE_URL,location.href)));
 this.worker.onmessage=e=>{const p=this.pending.get(e.data.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(e.data.id);if(e.data.error)p.reject(Error(e.data.error));else p.resolve(e.data)};
 this.worker.onerror=e=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error(e.message||'이 브라우저에서 AI 모델을 실행할 수 없습니다.'))}this.pending.clear()};
 this.ready=this.request('init',{base:new URL(import.meta.env.BASE_URL,location.href).href},[],visionConfig.modelTimeoutMs).then(message=>{if(message.persistentCache&&typeof localStorage!=='undefined')localStorage.setItem(storedAssetVersionKey,browserAssetVersion)}).catch(e=>{this.dispose();throw e});return this.ready;
 }
 initializeTongueModel(){if(this.tongueReady)return this.tongueReady;this.tongueReady=this.initialize().then(()=>this.request('initTongue',{base:new URL(import.meta.env.BASE_URL,location.href).href},[],visionConfig.modelTimeoutMs)).then(message=>{if(message.persistentCache&&typeof localStorage!=='undefined')localStorage.setItem(storedTongueAssetVersionKey,browserAssetVersion)}).catch(e=>{this.tongueReady=null;throw e});return this.tongueReady}
 async analyze(video:HTMLVideoElement|ImageBitmap,includeTongue=false):Promise<VisionResult>{await this.initialize();const bitmap=await createImageBitmap(video);const message=await this.request('frame',{bitmap,tongueEnabled:includeTongue},[bitmap]);return message.result}
 dispose(){this.worker?.terminate();this.worker=null;this.ready=null;this.tongueReady=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('브라우저 분석기가 종료되었습니다.'))}this.pending.clear()}
}

let sharedVision:BrowserVision|null=null;
export function getSharedBrowserVision(){return sharedVision??=new BrowserVision()}
export function preloadBrowserVision(){return getSharedBrowserVision().initialize()}
export function resetSharedBrowserVision(){sharedVision?.dispose();sharedVision=null}
