import {useCallback,useEffect,useRef,useState} from 'react';
import type {Analysis,TrainingSession,ModelStatus} from './types';
import {getSharedBrowserVision,resetSharedBrowserVision,type BrowserVision} from './browser/client';import {StepEngine} from './browser/engine';import {extract} from './browser/features';import {saveRecord} from './browser/records';import {visionConfig,modelVersion,rules} from './browser/config';import exerciseData from './browser/exercises.json';import {identify,queueRecord} from './browser/sync';import type {Exercise} from './types';import {defaults,type Thresholds} from './browser/movement';
import {upperBodyPointIds,upperBodySegments} from './browser/overlay';
import {isTongueDirectionRule,summarizeTonguePredictions,type TonguePrediction} from './browser/tongue';
export const browserExercises=exerciseData.filter(ex=>ex.enabled && ex.auto_complete);
export function useTraining(video:React.RefObject<HTMLVideoElement|null>,canvas:React.RefObject<HTMLCanvasElement|null>,overlay:boolean,exercises:Exercise[]=browserExercises,courseId='A',courseName='준비·정리 체조',thresholds:Thresholds=defaults){
 const [session,setSession]=useState<TrainingSession|null>(null),[analysis,setAnalysis]=useState<Analysis|null>(null),[error,setError]=useState(''),[running,setRunning]=useState(false),[models,setModels]=useState<ModelStatus|null>(null),[preparing,setPreparing]=useState(false);
 const vision=useRef<BrowserVision|null>(null),engine=useRef<StepEngine|null>(null),current=useRef<TrainingSession|null>(null),started=useRef(0),stepStarted=useRef<Record<string,number>>({}),ready=useRef<Promise<boolean>|null>(null),tongueHistory=useRef<TonguePrediction[]>([]);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),run=useRef(false),mounted=useRef(true),generation=useRef(0),modelGeneration=useRef(0),busy=useRef(false),starting=useRef(false),showOverlay=useRef(overlay);
 const selected=useRef({exercises,courseId,courseName,thresholds});selected.current={exercises,courseId,courseName,thresholds};
 const owner=useRef<string|null>(null),lastPersist=useRef(0),previousStep=useRef(''),lastState=useRef('');
 useEffect(()=>{void identify().then(id=>{owner.current=id})},[]);
 showOverlay.current=overlay;
 const clear=useCallback(()=>{clearTimeout(timer.current);tongueHistory.current=[];const c=canvas.current;c?.getContext('2d')?.clearRect(0,0,c.width,c.height)},[canvas]);
 const publish=useCallback(()=>{if(engine.current&&mounted.current)setAnalysis(engine.current.snapshot())},[]);
 const persist=useCallback(async(status?:string)=>{const e=engine.current,r=current.current;if(!e||!r)return;const now=performance.now()/1000;
 r.revision=(r.revision||0)+1;r.total_duration_seconds=now-started.current;r.completed_steps=e.counts.filter((n,i)=>n>=e.exercises[i].repetitions).length;r.analysis=e.snapshot();r.calibration=e.baseline||undefined;
 if(status)r.status=status;
 for(let i=0;i<e.exercises.length;i++){const ex=e.exercises[i],s=r.steps![i];s.detection_mode=ex.detection_type;s.success_count=e.counts[i];s.retry_count=e.retries[i];
 if(i===e.index){if(!s.started_at){s.started_at=new Date().toISOString();stepStarted.current[ex.id]=now}s.duration_seconds=e.durations[i]}
 if(e.counts[i]>=ex.repetitions)e.skipped.delete(i);
 if(e.skipped.has(i))s.completion_status='SKIPPED';
 else if(e.counts[i]>=ex.repetitions){s.completion_status='COMPLETED';s.completed_at=s.completed_at||new Date().toISOString()}else if(i===e.index)s.completion_status=e.state;}
 await saveRecord(r);queueRecord(r,status==='completed'||status==='cancelled'||previousStep.current!==e.exercise.id||e.state==='COMPLETED');previousStep.current=e.exercise.id;if(mounted.current)setSession({...r});
 },[]);
 const prepare=useCallback(()=>{if(ready.current)return ready.current;setPreparing(true);setError('');const g=++modelGeneration.current;const client=getSharedBrowserVision(),needsTongue=selected.current.exercises.some(ex=>isTongueDirectionRule(ex.rule));vision.current=client;
 ready.current=client.initialize().then(async()=>{let tongueLoaded:boolean|undefined,tongueError:string|null|undefined;if(needsTongue){try{await client.initializeTongueModel();tongueLoaded=true;tongueError=null}catch(err){tongueLoaded=false;tongueError=(err as Error).message||'혀 방향 모델을 준비하지 못했습니다.'}}if(g!==modelGeneration.current||!mounted.current)return false;setModels({pose_model_loaded:true,face_model_loaded:true,tongue_model_loaded:tongueLoaded,tongue_model_error:tongueError,inference_available:true,error:null,mode:'BROWSER'});return true}).catch(e=>{if(g===modelGeneration.current&&mounted.current){setModels({pose_model_loaded:false,face_model_loaded:false,tongue_model_loaded:needsTongue?false:undefined,tongue_model_error:needsTongue?e.message:undefined,inference_available:false,error:e.message,mode:'BROWSER'});setError('브라우저 AI 모델을 준비하지 못했습니다. '+e.message);ready.current=null}return false}).finally(()=>{if(g===modelGeneration.current&&mounted.current)setPreparing(false)});return ready.current;
 },[]);
 const pause=useCallback(()=>{generation.current++;run.current=false;setRunning(false);clear();engine.current?.pause();publish();void persist('paused').catch(e=>setError(e.message))},[clear,publish,persist]);
 const disconnect=useCallback(()=>{generation.current++;run.current=false;setRunning(false);clear();engine.current?.pause();publish();void persist('interrupted').catch(e=>setError(e.message))},[clear,publish,persist]);
 const draw=useCallback((a:Analysis)=>{const c=canvas.current,v=video.current;if(!c||!v)return;c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,c.width,c.height);if(!showOverlay.current||!a.overlay||!a.timestamp_ms||Date.now()-a.timestamp_ms>visionConfig.inferenceTimeoutMs)return;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 const point=(p:number[],radius=2)=>{ctx.beginPath();ctx.arc(p[0]*c.width,p[1]*c.height,radius,0,Math.PI*2);ctx.fill()};
 const path=(pts:number[][],ids:number[],closed=false)=>{const visible=ids.filter(i=>pts[i]&&Number.isFinite(pts[i][0])&&Number.isFinite(pts[i][1]));if(visible.length<2)return;ctx.beginPath();visible.forEach((id,index)=>{const p=pts[id],x=p[0]*c.width,y=p[1]*c.height;index?ctx.lineTo(x,y):ctx.moveTo(x,y)});if(closed)ctx.closePath();ctx.stroke()};
 ctx.strokeStyle='#61f0ae';ctx.fillStyle='#61f0ae';ctx.lineWidth=3;ctx.shadowColor='#0a3d36aa';ctx.shadowBlur=4;
 for(const pts of a.overlay.pose_keypoints){for(const segment of upperBodySegments(pts)){ctx.save();ctx.globalAlpha=segment.strong?1:.55;ctx.setLineDash(segment.strong?[]:[5,5]);ctx.beginPath();ctx.moveTo(pts[segment.from][0]*c.width,pts[segment.from][1]*c.height);ctx.lineTo(pts[segment.to][0]*c.width,pts[segment.to][1]*c.height);ctx.stroke();ctx.restore()}if(pts[5]?.[2]>=.45&&pts[6]?.[2]>=.45){const left=[pts[5][0]*c.width,pts[5][1]*c.height],right=[pts[6][0]*c.width,pts[6][1]*c.height],center=[(left[0]+right[0])/2,(left[1]+right[1])/2],width=Math.hypot(right[0]-left[0],right[1]-left[1]);ctx.beginPath();ctx.moveTo(center[0],center[1]-width*.16);ctx.lineTo(center[0],center[1]);ctx.stroke()}for(const i of upperBodyPointIds(pts)){ctx.save();ctx.globalAlpha=pts[i][2]>=.45?1:.55;point(pts[i],i===5||i===6?4:3);ctx.restore()}}
 const face=a.overlay.face_landmarks;if(face.length){ctx.strokeStyle='#63d9ff';ctx.fillStyle='#b8efff';ctx.lineWidth=1.6;ctx.shadowBlur=3;const contours=[
  [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109],
  [33,160,158,133,153,144,163,7],[362,385,387,263,373,380,390,249],
  [70,63,105,66,107,55,65],[336,296,334,293,300,285,295],
  [168,6,197,195,5,4,1,19,94,2],[61,146,91,181,84,17,314,405,321,375,291,308,324,318,402,317,14,87,178,88,95,78]
 ];contours.forEach((ids,index)=>path(face,ids,index!==5));const detail=[1,4,10,33,133,263,362,61,291,13,14,152,234,454];detail.forEach(i=>face[i]&&point(face[i],1.8))}
 ctx.restore();
 },[canvas,video]);

 const tick=useRef<()=>Promise<void>>(async()=>{});
 tick.current=async()=>{if(!run.current||!mounted.current)return;if(busy.current){timer.current=setTimeout(()=>void tick.current(),50);return}
 const v=video.current,client=vision.current,e=engine.current;if(!v||v.readyState<2||!client||!e){disconnect();return}const g=generation.current,stamp=Date.now();busy.current=true;
 try{const result=await client.analyze(v,selected.current.exercises.some(ex=>isTongueDirectionRule(ex.rule)));if(g!==generation.current||!run.current||!mounted.current)return;
 const metrics=extract(result);e.update(metrics,(Date.now()-stamp)/1000>rules.maxAge);
 const tongueError=result.tongue_error;if(tongueError)setModels(previous=>previous?{...previous,tongue_model_loaded:false,tongue_model_error:tongueError}:previous);
 if(result.tongue&&result.faces.length===1){tongueHistory.current=[...tongueHistory.current,result.tongue as TonguePrediction].slice(-5)}else tongueHistory.current=[];
 const tongueSummary=summarizeTonguePredictions(tongueHistory.current);
 const a:Analysis={...e.snapshot(),timestamp_ms:Date.now(),metrics,tongue:tongueSummary?{label:tongueSummary.label,confidence:tongueSummary.confidence,latency_ms:tongueSummary.latencyMs,stable:tongueSummary.stable,samples:tongueSummary.samples,votes:tongueSummary.votes}:null,overlay:{pose_keypoints:result.pose,face_landmarks:result.faces.length===1?result.faces[0].landmarks:[]},performance:{inference_ms:result.inference_ms,fps:Math.round(10000/Math.max(result.inference_ms,1))/10}};
 setAnalysis(a);draw(a);if(performance.now()-lastPersist.current>1000||lastState.current!==e.state){lastPersist.current=performance.now();lastState.current=e.state;await persist('active');}
 if(e.state==='ERROR'){run.current=false;setRunning(false);setError(e.message);clear();return}
 }catch(err){if(g!==generation.current||!mounted.current)return;run.current=false;setRunning(false);e.pause((err as Error).message);setError((err as Error).message);publish();clear();void persist('interrupted').catch(()=>{});}
 finally{busy.current=false;if(g===generation.current&&run.current)timer.current=setTimeout(()=>void tick.current(),visionConfig.frameIntervalMs)}
 };
 const start=useCallback(async()=>{if(run.current||starting.current)return;starting.current=true;const g=generation.current;setError('');
 try{if(!(await prepare())||!mounted.current||g!==generation.current)return;if(!current.current){owner.current=await identify();if(!mounted.current||g!==generation.current)return;engine.current=new StepEngine(selected.current.exercises);engine.current.thresholds={...selected.current.thresholds};started.current=performance.now()/1000;stepStarted.current={};current.current={id:crypto.randomUUID(),participant_code:localStorage.getItem('oral-participant')||'local-user',started_at:new Date().toISOString(),ended_at:null,status:'active',total_duration_seconds:0,completed_steps:0,total_steps:selected.current.exercises.length,course_id:selected.current.courseId,course_name:selected.current.courseName,owner_id:owner.current,revision:0,mode:'BROWSER',model_version:modelVersion,steps:selected.current.exercises.map(ex=>({step_id:ex.id,step_name:ex.title,detection_mode:ex.detection_type,started_at:null,completed_at:null,success_count:0,target_count:ex.repetitions,retry_count:0,duration_seconds:0,completion_status:'WAITING'}))}}
 engine.current!.resume();await persist('active');if(!mounted.current||g!==generation.current)return;publish();generation.current++;run.current=true;setRunning(true);void tick.current();
 }catch(e){if(mounted.current&&g===generation.current){setError((e as Error).message);run.current=false;setRunning(false)}}finally{starting.current=false}},[prepare,persist,publish]);
 const control=useCallback((type:string)=>{try{setError('');const e=engine.current;if(!e)return;if(type==='timer_fallback'){e.exercises.forEach(ex=>{if(ex.detection_type==='AUDIO'){ex.detection_type='TIMER';ex.auto_complete=true}});e.reset()}
 else if(type==='cheek_fallback'){e.exercises.forEach(ex=>{if(ex.rule.startsWith('CHEEK')){ex.detection_type=ex.rule==='CHEEK_PUFF'?'TIMER':'MANUAL';ex.auto_complete=ex.detection_type==='TIMER'}});e.reset()}
 else if(type==='previous')e.previous();else if(type==='skip')e.skip();else if(type==='retry_step'){e.stepStart=performance.now()/1000;e.resume()}else if(type==='next')e.next();else if(type==='manual_complete')e.manual();else if(type==='calibrate')e.calibrate();publish();void persist().catch(err=>{setError(err.message);pause()})}catch(err){setError((err as Error).message)}},[pause,persist,publish]);
 const audio=useCallback((text:string)=>{engine.current?.audio(text);publish();void persist().catch(e=>setError(e.message))},[publish,persist]);
 const finish=useCallback(async(completed:boolean)=>{const e=engine.current,r=current.current;if(!e||!r)return;try{if(completed&&!e.counts.every((n,i)=>n>=e.exercises[i].repetitions))throw Error('모든 단계를 완료해야 완료 기록으로 저장할 수 있습니다.');generation.current++;run.current=false;setRunning(false);clear();e.pause();r.ended_at=new Date().toISOString();await persist(completed?'completed':'cancelled');const saved=structuredClone(r);current.current=null;engine.current=null;setSession(null);setAnalysis(null);return saved;}catch(err){setError((err as Error).message)}},[persist,clear]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;modelGeneration.current++;run.current=false;clearTimeout(timer.current);engine.current?.pause();void persist('interrupted').catch(()=>{});vision.current=null;ready.current=null}},[persist]);
 useEffect(()=>{if(!overlay){const c=canvas.current;c?.getContext('2d')?.clearRect(0,0,c.width,c.height)}},[overlay,canvas]);
 const reloadModels=useCallback(()=>{disconnect();modelGeneration.current++;ready.current=null;resetSharedBrowserVision();vision.current=null;setModels(null);return prepare()},[disconnect,prepare]);
 return {session,analysis,audio,error,running,start,pause,disconnect,control,finish,models,preparing,prepare,reloadModels};
}
