import ModelStatusPanel from './ModelStatusPanel';
import {useEffect,useRef,useState} from 'react';import {useNavigate} from 'react-router-dom';import {Camera,Check,RefreshCw,Video,VideoOff} from 'lucide-react';
import {useCamera} from './useCamera';import {useTraining,browserExercises} from './useTraining';
const labels:Record<string,string>={one_person:'한 명 검출',face_visible:'얼굴 검출',face_forward:'얼굴 정면',centered:'화면 중앙',shoulders_visible:'양쪽 어깨 검출',shoulders_aligned:'어깨 정렬',body_visible:'골반 검출',body_aligned:'보이는 상체 정렬',mouth_open:'입 벌림 조건',pucker:'입술 오므리기',hold_complete:'유지시간 완료',neutral_mouth:'중립 입 모양',smile:'양쪽 입꼬리 움직임'};
export default function TrainingPage(){
 const exercises=browserExercises;const [finished,setFinished]=useState(false);const overlay=true,mirror=true;const saving=useRef(false);
 const camera=useCamera(),canvas=useRef<HTMLCanvasElement>(null),training=useTraining(camera.video,canvas,overlay),navigate=useNavigate();
 camera.onStop.current=training.disconnect;
 const models=training.models;
 useEffect(()=>{void training.prepare()},[training.prepare]);
 const a=training.analysis,idx=Math.max(0,exercises.findIndex(e=>e.id===a?.step_id)),ex=exercises[idx];
 const complete=a?.step_state==='COMPLETED',last=idx===exercises.length-1;
 useEffect(()=>{
 if(camera.active&&models?.inference_available&&!training.running&&!training.error&&!training.preparing&&!finished&&!saving.current) void training.start();
 },[camera.active,models?.inference_available,training.running,training.error,training.preparing,finished,training.start]);
 useEffect(()=>{
 if(!complete||!training.running||finished)return;
 const t=setTimeout(()=>{if(last){if(!saving.current)void save(true)}else training.control('next')},1200);
 return()=>clearTimeout(t);
 },[complete,last,training.running,finished,training.control]);
 async function save(completed:boolean){
 if(saving.current)return;saving.current=true;
 const row=await training.finish(completed);
 if(row){setFinished(true);camera.stop();navigate('/records/'+row.id)}else saving.current=false;
 }
 const error=camera.error||training.error;
 return <section className="training-studio">
 <div className="studio-toolbar"><span className="real-mode">브라우저 내 AI 분석 · 서버 연결 불필요</span><span>판정 기준은 연구용 가설값입니다.</span></div>
 {training.preparing&&<div className="connection-panel" role="status">브라우저 AI 모델을 준비하고 있습니다. 처음에는 모델 파일 다운로드에 시간이 걸릴 수 있습니다.</div>}
 {error&&<div className="error-banner" role="alert">{error}<button disabled={training.preparing} onClick={()=>void training.reloadModels()}>모델 다시 준비</button></div>}
 <div className="training-grid">
 <aside className="training-steps"><h2>훈련 단계</h2><ol>{exercises.map((s,i)=><li key={s.id} className={i===idx?'current':i<idx?'done':''}><span className="step-marker">{i<idx?<Check size={14}/>:i+1}</span><span>{s.title}</span></li>)}{exercises.length>0&&<li className={finished?'current':''}><span className="step-marker">{exercises.length+1}</span><span>훈련 결과</span></li>}</ol><p className="step-caption">단계는 판정 결과에 따라 진행합니다.</p></aside>
 <div className="training-center"><div className={'live-camera '+(camera.active?'is-live':'')}>
 <video ref={camera.video} autoPlay muted playsInline className={mirror?'mirror':''}/><canvas ref={canvas} className={mirror?'mirror':''}/>
 <div className="camera-topline"><span className={'live-badge '+(training.running?'analyzing':'')}><i/>{training.running?'실시간 분석':camera.active?'카메라 연결됨':'카메라 대기'}</span>
 <button className="webcam-badge" aria-label={camera.active?'Webcam 카메라 끄기':'Webcam 카메라 켜기'} aria-pressed={camera.active} disabled={camera.starting} onClick={()=>camera.active?camera.stop():void camera.start()}>{camera.active?<Video size={15}/>:<VideoOff size={15}/>} {camera.starting?'연결 중…':'Webcam'}</button></div>
 {!camera.active&&<div className="camera-empty"><Camera size={58}/><strong>카메라를 켜고 훈련을 준비하세요</strong><p>얼굴과 양쪽 어깨, 골반까지 화면에 보이도록 앉아 주세요.</p><span>오른쪽 위 Webcam 버튼을 눌러 시작하세요.</span></div>}
 <div className={'camera-feedback state-'+(a?.step_state||'WAITING')} role="status">{error?'분석을 진행할 수 없습니다.':a?.feedback.message||'카메라를 켜면 준비자세 확인이 자동으로 시작됩니다.'}</div></div>
 </div>
 <aside className="training-guide"><h2><span className="guide-info" aria-hidden="true">!</span>{ex?.title||'브라우저 분석 준비'}</h2>
 <figure className="guide-example"><div className="guide-picture" aria-hidden="true">{idx===0?<svg viewBox="0 0 180 150"><circle cx="90" cy="37" r="23" fill="#edcbb3"/><path d="M67 33q-3-47 46 0l-9-10-14-4-12 13" fill="#5b4540"/><path d="M65 67q25-12 50 0l15 66H50Z" fill="white" stroke="#7d9fa2"/><path d="m64 73-14 56m66-56 14 56" stroke="#edcbb3" strokeWidth="12" strokeLinecap="round"/><path d="M90 10v130M50 77h80" stroke="#65baa9" strokeDasharray="4 4"/></svg>:<svg viewBox="0 0 140 110"><ellipse cx="70" cy="55" rx="35" ry={idx===1?44:25} fill="#f3aa99"/><ellipse cx="70" cy="55" rx={idx===2?11:24} ry={idx===1?34:14} fill="#843f3c"/>{idx===1&&<path d="M51 30h38v10H51Z" fill="white"/>}</svg>}</div><figcaption>동작 예시 · 영상 준비 중</figcaption></figure>
 <p className="guide-instruction">{idx===0?'정면을 바라봐 주세요.':idx===1?'입을 크게 벌려 2초간 유지하세요.':'입술을 오므려 2초간 유지하세요.'}</p>
 {ex&&<><div className="hold-target" style={{'--progress':Math.min(1,(a?.progress.hold_elapsed||0)/(a?.progress.hold_target||2))*360+'deg'} as React.CSSProperties}><span>{a&&!a.progress.calibrated?'중립 자세 측정':'유지 시간'}</span><strong>{(a?.progress.hold_elapsed||0).toFixed(1)}<small> / {a?.progress.hold_target||ex.hold_seconds}초</small></strong></div><p className="rep-count">반복 횟수 <b>{a?.progress.repetition||0} / {ex.repetitions}회</b></p></>}
 </aside></div>
 <details className="model-details"><summary>AI 모델 상태 · 성능 확인</summary><ModelStatusPanel models={models} analysis={a} active={camera.active&&training.running} preparing={training.preparing} error={error}/> <ul className="criteria">{Object.entries(a?.criteria||{}).map(([k,v])=><li key={k} className={v===true?'passed':v===null?'unknown':'unmet'}><span>{v===true?'✓':v===null?'?':'○'}</span>{labels[k]||k}{v===null&&' · 확인 불가'}</li>)}</ul>
 <p className="measurement-note">허리·척추 자세와 치료 효과를 판정하지 않습니다. 보이는 특징점만 사용합니다.</p>
 <p className="measurement-note">카메라를 켜면 이 브라우저에서만 자동 분석합니다. 영상은 전송·저장하지 않습니다. 조건을 만족하면 다음 단계로 자동 이동하고 마지막에는 결과를 저장합니다. 중지하려면 Webcam을 끄세요.</p>
 <p className="measurement-note">볼 부풀리기는 자동 판정 기준이 없어 이번 자동 훈련에 포함하지 않습니다.</p>
<p>추론 {a?.performance?.inference_ms??'—'}ms · 처리 {a?.performance?.fps??'—'} FPS · 브라우저 처리</p><div className="metrics">{Object.entries(a?.metrics||{}).map(([k,v])=><span key={k}>{k}: {v===null?'확인 불가':v.toFixed(3)}</span>)}</div><button disabled={training.running||training.preparing} onClick={()=>void training.reloadModels()}><RefreshCw size={14}/>모델 다시 준비</button></details>
 </section>
}