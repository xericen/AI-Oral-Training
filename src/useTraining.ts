import {useCallback,useEffect,useRef,useState} from 'react';
import type {Analysis,TrainingSession,ModelStatus} from './types';
import {BrowserVision} from './browser/client';import {StepEngine} from './browser/engine';import {extract} from './browser/features';import {saveRecord} from './browser/records';import {visionConfig,modelVersion,rules} from './browser/config';import exerciseData from './browser/exercises.json';
export const browserExercises=exerciseData.filter(ex=>ex.enabled && ex.auto_complete);
export function useTraining(video:React.RefObject<HTMLVideoElement|null>,canvas:React.RefObject<HTMLCanvasElement|null>,overlay:boolean){
 const [session,setSession]=useState<TrainingSession|null>(null),[analysis,setAnalysis]=useState<Analysis|null>(null),[error,setError]=useState(''),[running,setRunning]=useState(false),[models,setModels]=useState<ModelStatus|null>(null),[preparing,setPreparing]=useState(false);
 const vision=useRef<BrowserVision|null>(null),engine=useRef<StepEngine|null>(null),current=useRef<TrainingSession|null>(null),started=useRef(0),stepStarted=useRef<Record<string,number>>({}),ready=useRef<Promise<boolean>|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),run=useRef(false),mounted=useRef(true),generation=useRef(0),modelGeneration=useRef(0),busy=useRef(false),starting=useRef(false),showOverlay=useRef(overlay);
 showOverlay.current=overlay;
 const clear=useCallback(()=>{clearTimeout(timer.current);const c=canvas.current;c?.getContext('2d')?.clearRect(0,0,c.width,c.height)},[canvas]);
 const publish=useCallback(()=>{if(engine.current&&mounted.current)setAnalysis(engine.current.snapshot())},[]);
 const persist=useCallback(async(status?:string)=>{const e=engine.current,r=current.current;if(!e||!r)return;const now=performance.now()/1000;
 r.total_duration_seconds=now-started.current;r.completed_steps=e.counts.filter((n,i)=>n>=e.exercises[i].repetitions).length;r.analysis=e.snapshot();r.calibration=e.baseline||undefined;
 if(status)r.status=status;
 for(let i=0;i<e.exercises.length;i++){const ex=e.exercises[i],s=r.steps![i];s.success_count=e.counts[i];s.retry_count=e.retries[i];
 if(i===e.index){if(!s.started_at){s.started_at=new Date().toISOString();stepStarted.current[ex.id]=now}s.duration_seconds=now-(stepStarted.current[ex.id]??now)}
 if(e.counts[i]>=ex.repetitions){s.completion_status='COMPLETED';s.completed_at=s.completed_at||new Date().toISOString()}else if(i===e.index)s.completion_status=e.state;}
 await saveRecord(r);if(mounted.current)setSession({...r});
 },[]);
 const prepare=useCallback(()=>{if(ready.current)return ready.current;setPreparing(true);setError('');const g=++modelGeneration.current;const client=new BrowserVision();vision.current?.dispose();vision.current=client;
 ready.current=client.initialize().then(()=>{if(g!==modelGeneration.current||!mounted.current)return false;setModels({pose_model_loaded:true,face_model_loaded:true,inference_available:true,error:null,mode:'BROWSER'});return true}).catch(e=>{if(g===modelGeneration.current&&mounted.current){setModels({pose_model_loaded:false,face_model_loaded:false,inference_available:false,error:e.message,mode:'BROWSER'});setError('브라우저 AI 모델을 준비하지 못했습니다. '+e.message);ready.current=null}return false}).finally(()=>{if(g===modelGeneration.current&&mounted.current)setPreparing(false)});return ready.current;
 },[]);
 const pause=useCallback(()=>{generation.current++;run.current=false;setRunning(false);clear();engine.current?.pause();publish();void persist('paused').catch(e=>setError(e.message))},[clear,publish,persist]);
 const disconnect=useCallback(()=>{generation.current++;run.current=false;setRunning(false);clear();engine.current?.pause();publish();void persist('interrupted').catch(e=>setError(e.message))},[clear,publish,persist]);
 const draw=useCallback((a:Analysis)=>{const c=canvas.current,v=video.current;if(!c||!v)return;c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,c.width,c.height);if(!showOverlay.current||!a.overlay||!a.timestamp_ms||Date.now()-a.timestamp_ms>visionConfig.inferenceTimeoutMs)return;
 ctx.strokeStyle='#5be29d';ctx.fillStyle='#5be29d';ctx.lineWidth=2;
 const dot=(p:number[])=>{ctx.beginPath();ctx.arc(p[0]*c.width,p[1]*c.height,2.5,0,Math.PI*2);ctx.fill()};
 if(a.step_id==='posture'){for(const pts of a.overlay.pose_keypoints){for(const [i,j] of [[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12]]){if(pts[i]?.[2]<.5||pts[j]?.[2]<.5)continue;ctx.beginPath();ctx.moveTo(pts[i][0]*c.width,pts[i][1]*c.height);ctx.lineTo(pts[j][0]*c.width,pts[j][1]*c.height);ctx.stroke()}if([5,6,11,12].every(i=>pts[i]?.[2]>=.5)){ctx.beginPath();ctx.moveTo((pts[5][0]+pts[6][0])*c.width/2,(pts[5][1]+pts[6][1])*c.height/2);ctx.lineTo((pts[11][0]+pts[12][0])*c.width/2,(pts[11][1]+pts[12][1])*c.height/2);ctx.stroke()}pts.filter(p=>p[2]>=.5).forEach(dot)}}
 else{const pts=a.overlay.face_landmarks;const lip=[61,146,91,181,84,17,314,405,321,375,291,308,324,318,402,317,14,87,178,88,95,78,13];const oval=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];const ids=a.step_id==='mouth_open'?[...lip,...oval]:a.step_id==='cheek'?[50,280,205,425,234,454,...lip]:lip;for(const i of ids)if(pts[i])dot(pts[i])}
 },[canvas,video]);

 const tick=useRef<()=>Promise<void>>(async()=>{});
 tick.current=async()=>{if(!run.current||!mounted.current)return;if(busy.current){timer.current=setTimeout(()=>void tick.current(),50);return}
 const v=video.current,client=vision.current,e=engine.current;if(!v||v.readyState<2||!client||!e){disconnect();return}const g=generation.current,stamp=Date.now();busy.current=true;
 try{const result=await client.analyze(v);if(g!==generation.current||!run.current||!mounted.current)return;
 const metrics=extract(result);e.update(metrics,(Date.now()-stamp)/1000>rules.maxAge);
 const a:Analysis={...e.snapshot(),timestamp_ms:Date.now(),metrics,overlay:{pose_keypoints:result.pose,face_landmarks:result.faces.length===1?result.faces[0].landmarks:[]},performance:{inference_ms:result.inference_ms,fps:Math.round(10000/Math.max(result.inference_ms,1))/10}};
 setAnalysis(a);draw(a);await persist('active');
 if(e.state==='ERROR'){run.current=false;setRunning(false);setError(e.message);clear();return}
 }catch(err){if(g!==generation.current||!mounted.current)return;run.current=false;setRunning(false);e.pause((err as Error).message);setError((err as Error).message);publish();clear();void persist('interrupted').catch(()=>{});}
 finally{busy.current=false;if(g===generation.current&&run.current)timer.current=setTimeout(()=>void tick.current(),visionConfig.frameIntervalMs)}
 };
 const start=useCallback(async()=>{if(run.current||starting.current)return;starting.current=true;const g=generation.current;setError('');
 try{if(!(await prepare())||!mounted.current||g!==generation.current)return;if(!current.current){engine.current=new StepEngine(browserExercises);started.current=performance.now()/1000;stepStarted.current={};current.current={id:crypto.randomUUID(),participant_code:localStorage.getItem('oral-participant')||'local-user',started_at:new Date().toISOString(),ended_at:null,status:'active',total_duration_seconds:0,completed_steps:0,total_steps:browserExercises.length,mode:'BROWSER',model_version:modelVersion,steps:browserExercises.map(ex=>({step_id:ex.id,step_name:ex.title,detection_mode:ex.detection_type,started_at:null,completed_at:null,success_count:0,target_count:ex.repetitions,retry_count:0,duration_seconds:0,completion_status:'WAITING'}))}}
 engine.current!.resume();await persist('active');if(!mounted.current||g!==generation.current)return;publish();generation.current++;run.current=true;setRunning(true);void tick.current();
 }catch(e){if(mounted.current&&g===generation.current){setError((e as Error).message);run.current=false;setRunning(false)}}finally{starting.current=false}},[prepare,persist,publish]);
 const control=useCallback((type:string)=>{try{setError('');const e=engine.current;if(!e)return;if(type==='next')e.next();else if(type==='manual_complete')e.manual();else if(type==='calibrate')e.calibrate();publish();void persist().catch(err=>{setError(err.message);pause()})}catch(err){setError((err as Error).message)}},[pause,persist,publish]);
 const finish=useCallback(async(completed:boolean)=>{const e=engine.current,r=current.current;if(!e||!r)return;try{if(completed&&!e.counts.every((n,i)=>n>=e.exercises[i].repetitions))throw Error('모든 단계를 완료해야 완료 기록으로 저장할 수 있습니다.');generation.current++;run.current=false;setRunning(false);clear();e.pause();r.ended_at=new Date().toISOString();await persist(completed?'completed':'cancelled');const saved=structuredClone(r);current.current=null;engine.current=null;setSession(null);setAnalysis(null);return saved;}catch(err){setError((err as Error).message)}},[persist,clear]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;modelGeneration.current++;run.current=false;clearTimeout(timer.current);engine.current?.pause();void persist('interrupted').catch(()=>{});vision.current?.dispose();vision.current=null;ready.current=null}},[persist]);
 useEffect(()=>{if(!overlay){const c=canvas.current;c?.getContext('2d')?.clearRect(0,0,c.width,c.height)}},[overlay,canvas]);
 const reloadModels=useCallback(()=>{disconnect();modelGeneration.current++;ready.current=null;vision.current?.dispose();vision.current=null;setModels(null);return prepare()},[disconnect,prepare]);
 return {session,analysis,error,running,start,pause,disconnect,control,finish,models,preparing,prepare,reloadModels};
}
