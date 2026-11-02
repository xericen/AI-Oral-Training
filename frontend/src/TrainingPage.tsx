import ModelStatusPanel from './ModelStatusPanel';
import HoldProgress from './HoldProgress';
import {useEffect,useMemo,useRef,useState} from 'react';import {useNavigate,useSearchParams} from 'react-router-dom';import {Camera,Check,Eye,EyeOff,Maximize2,Minimize2,RefreshCw,Video,VideoOff} from 'lucide-react';
import {useCamera} from './useCamera';import {useTraining} from './useTraining';import {speechRecognitionSupported,useSpeech} from './useSpeech';
import {courses,modeLabel} from './browser/courses';import {configureExercises} from './browser/capabilities';import {guideCropFor,guideSheet} from './browser/guideCrops';import {defaults,type Thresholds} from './browser/movement';import {selectedCourseId} from './CoursePages';import type {Exercise} from './types';
const EXERCISE_POSE_SHEET='./guides/generated-exercise-poses-v1.png';
function Illustration({exercise}:{exercise:Exercise}){
 const head=exercise.rule.startsWith('HEAD'),body=exercise.detection_type==='POSE';
 const right=exercise.rule.includes('RIGHT'),left=exercise.rule.includes('LEFT'),guide=guideCropFor(exercise.id);
 if(guide)return <svg className="guide-pose-crop" viewBox={guide.viewBox} role="img" aria-label={guide.label}><title>{guide.label}</title><image href={EXERCISE_POSE_SHEET} width={guideSheet.width} height={guideSheet.height}/></svg>;
 if(exercise.rule.startsWith('BREATH'))return <div className={'breathing-orb '+(exercise.rule==='BREATH_IN'?'inhale':'exhale')} style={{animationDuration:exercise.hold_seconds+'s'}}> {exercise.rule==='BREATH_IN'?'들이마시기':'내쉬기'} </div>;
 if(head||body)return <svg viewBox="0 0 180 150" role="img" aria-label={exercise.title+' 방향 안내'}><path d="M65 72h50l20 68H45Z" fill="#e6f6f2" stroke="#56958b"/><circle cx="90" cy="39" r="25" fill="#edcbb3"/><path d="M80 43h20M90 23v20" stroke="#5b4540"/><path d={right?'M65 45H20m0 0 12-12m-12 12 12 12':left?'M115 45h45m0 0-12-12m12 12-12 12':'M90 3v140'} stroke="#169b89" strokeWidth="4" fill="none"/><text x="90" y="145" textAnchor="middle" fontSize="10">본인 기준 · 거울 화면</text></svg>;
 if(exercise.category==='혀')return <svg viewBox="0 0 140 110" role="img" aria-label="혀 운동 안내 그림 · 자동 추적 아님"><ellipse cx="70" cy="50" rx="36" ry="24" fill="#843f3c"/><path d="M50 52q20-10 40 0v25q-20 25-40 0Z" fill="#e58a91"/><path d="M70 56v24" stroke="#a64c61"/></svg>;
 if(exercise.audioText)return <div className="speech-example">{exercise.audioText}</div>;
 return <svg viewBox="0 0 140 110" role="img" aria-label={exercise.title+' 입 모양 안내'}><ellipse cx="70" cy="55" rx={exercise.rule==='PUCKER'?23:40} ry={exercise.rule==='MOUTH_OPEN'?44:25} fill="#f3aa99"/><ellipse cx="70" cy="55" rx={exercise.rule==='PUCKER'?10:exercise.rule==='ROUND'?18:28} ry={exercise.rule==='MOUTH_OPEN'?32:exercise.rule==='WIDE'?5:14} fill="#843f3c"/></svg>;
}
export default function TrainingPage({calibrationOnly=false}:{calibrationOnly?:boolean}){
 const [params]=useSearchParams();
 const requested=params.get('course');const [courseId]=useState(courses.some(c=>c.id===requested)?requested!:selectedCourseId()),[audioMode,setAudioMode]=useState(localStorage.getItem('oral-audio-mode')==='true'),[experimental,setExperimental]=useState(localStorage.getItem('oral-experimental')==='true'),[mirror]=useState(localStorage.getItem('oral-mirror')!=='false'),[overlay,setOverlay]=useState(localStorage.getItem('oral-overlay')!=='false'),[wanted,setWanted]=useState(true),[finished,setFinished]=useState(false);
 const [thresholds]=useState<Thresholds>(()=>{try{const v=JSON.parse(localStorage.getItem('oral-thresholds')||'null');if(v&&Object.keys(defaults).every(k=>typeof v[k]==='number'&&Number.isFinite(v[k])))return {...defaults,...v}}catch{}return {...defaults}});
 const [fullscreen,setFullscreen]=useState(false),[cameraRatio,setCameraRatio]=useState('4 / 3');
 const speechSupported=speechRecognitionSupported();
 const course=useMemo(()=>calibrationOnly?{id:'calibration',title:'중립 자세 측정',description:'정면 기준 측정 · 얼굴과 양쪽 어깨가 보이는지 확인',exercises:[courses[0].exercises[0]]}:courses.find(c=>c.id===courseId)!,[courseId,calibrationOnly]);
 const exercises=useMemo(()=>configureExercises(course.exercises,{audioMode,experimentalCheek:experimental,speechSupported}),[course,audioMode,experimental,speechSupported]);
 const camera=useCamera(),canvas=useRef<HTMLCanvasElement>(null),cameraFrame=useRef<HTMLDivElement>(null),training=useTraining(camera.video,canvas,overlay,exercises,course.id,course.title,thresholds),navigate=useNavigate(),saving=useRef(false);
 camera.onStop.current=training.disconnect;const models=training.models;
 useEffect(()=>{if(!calibrationOnly)localStorage.setItem('oral-selected-course',courseId)},[courseId,calibrationOnly]);
 useEffect(()=>{void training.prepare()},[training.prepare]);
 useEffect(()=>{const fn=()=>setFullscreen(document.fullscreenElement===cameraFrame.current);document.addEventListener('fullscreenchange',fn);return()=>document.removeEventListener('fullscreenchange',fn)},[]);
 const a=training.analysis,idx=Math.max(0,exercises.findIndex(e=>e.id===a?.step_id)),ex=exercises[idx],guidePose=guideCropFor(ex.id),complete=a?.step_state==='COMPLETED',last=idx===exercises.length-1;
 const speech=useSpeech(training.audio,audioMode&&training.running,ex.id);
 useEffect(()=>{
 if(wanted&&camera.active&&models?.inference_available&&!training.running&&!training.error&&!training.preparing&&!finished&&!saving.current)void training.start();
 },[wanted,camera.active,models?.inference_available,training.running,training.error,training.preparing,finished,training.start]);
 useEffect(()=>{if(!complete||!training.running||finished)return;const t=setTimeout(()=>{if(last){if(!saving.current)void save(true)}else training.control('next')},1200);return()=>clearTimeout(t)},[complete,last,training.running,finished,training.control,idx]);
 async function save(completed:boolean){if(saving.current)return;saving.current=true;speech.stop();const row=await training.finish(completed);if(row){setFinished(true);camera.stop();navigate('/records/'+row.id)}else saving.current=false}
 async function toggleFullscreen(){const frame=cameraFrame.current;if(!frame)return;try{if(document.fullscreenElement)await document.exitFullscreen();else await frame.requestFullscreen()}catch{setFullscreen(false)}}
 const error=camera.error||training.error;
 const stepsDone=training.session?.completed_steps||0;
 return <section className="training-studio">
 <div className="studio-toolbar"><span className="real-mode">브라우저 내 YOLO Pose + MediaPipe</span><span>연구용 시연 · 실제 웹캠 정확도 미검증 · 통증이 있으면 중단하세요.</span></div>
 <section className="selected-training-course" aria-label="현재 선택한 코스"><span>현재 선택한 코스</span><b>{course.title}</b><p>{course.description}</p></section>
 <div className="course-progress"><b>{course.title}</b><span>{idx+1} / {exercises.length}단계 · 완료 {stepsDone}</span><progress max={exercises.length} value={stepsDone}/></div>
 {training.preparing&&<div className="connection-panel" role="status">AI 모델 준비 중입니다. 첫 다운로드에는 시간이 걸릴 수 있습니다.</div>}
 {error&&<div className="error-banner" role="alert">{error}<button disabled={training.preparing} onClick={()=>{setWanted(true);void training.reloadModels()}}>모델 다시 준비</button></div>}
 <div className="training-grid">
 <aside className="training-steps"><h2>훈련 단계</h2><ol>{exercises.map((s,i)=>{const status=training.session?.steps?.[i]?.completion_status;return <li key={s.id} className={i===idx?'current':status==='COMPLETED'?'done':''}><span className="step-marker">{status==='COMPLETED'?<Check size={14}/>:i+1}</span><span>{s.title}{status==='SKIPPED'?' · 건너뜀':''}</span></li>})}</ol></aside>
 <div className="training-center"><div ref={cameraFrame} className={'live-camera '+(camera.active?'is-live':'')} style={{'--camera-ratio':cameraRatio} as React.CSSProperties}>
 <video ref={camera.video} autoPlay muted playsInline aria-label="실시간 카메라 화면" className={mirror?'mirror':''} onLoadedMetadata={event=>{const video=event.currentTarget;if(video.videoWidth>0&&video.videoHeight>0)setCameraRatio(video.videoWidth+' / '+video.videoHeight)}}/><canvas ref={canvas} className={mirror?'mirror':''}/>
 <div className="camera-topline"><span className={'live-badge '+(training.running?'analyzing':'')}><i/>{training.running?'실시간 분석':camera.active?'카메라 연결됨':'카메라 대기'}</span><div className="camera-actions"><button className="recognition-badge" type="button" aria-pressed={overlay} aria-label={overlay?'인식 표시 숨기기':'인식 표시 보기'} onClick={()=>{const next=!overlay;setOverlay(next);localStorage.setItem('oral-overlay',String(next))}}>{overlay?<Eye size={15}/>:<EyeOff size={15}/>} {overlay?'인식 숨김':'인식 보기'}</button><button className="fullscreen-badge" type="button" aria-label={fullscreen?'전체 화면 닫기':'카메라 전체 화면 보기'} onClick={()=>void toggleFullscreen()}>{fullscreen?<Minimize2 size={15}/>:<Maximize2 size={15}/>}<span>{fullscreen?'화면 축소':'전체 화면'}</span></button><button className="webcam-badge" aria-label={camera.active?'Webcam 카메라 끄기':'Webcam 카메라 켜기'} disabled={camera.starting} onClick={()=>camera.active?camera.stop():void camera.start()}>{camera.active?<Video size={15}/>:<VideoOff size={15}/>} Webcam</button></div></div>
 {!camera.active&&<div className="camera-empty"><Camera size={58}/><strong>Webcam을 켜면 자동으로 준비합니다</strong><p>얼굴과 양쪽 어깨가 보이도록 상반신만 맞춰 주세요.</p></div>}
 <div className={'camera-feedback state-'+(a?.step_state||'WAITING')} role="status">{error?'분석을 진행할 수 없습니다.':a?.feedback.message||'카메라를 켜고 편안한 정면 자세를 취하세요.'}</div></div>
 <div className="live-state">얼굴 {a?.metrics?.face_count===1?'검출':'대기'} · 상체 {a?.metrics?.body_alignment!=null?'검출':'확인 필요'} · 영상은 기기 내 처리</div>
 </div>
 <aside className="training-guide"><h2>{ex.title}</h2><strong className="mode-badge">{modeLabel(ex.detection_type)}{ex.experimental?' · 실험적':''}</strong>
 <figure className={'guide-example '+(guidePose?'guide-pose-example':'')}><div className="guide-picture"><Illustration exercise={ex}/></div><figcaption>{guidePose?'새로 제작한 현재 동작 이미지':'직접 제작한 개념도 · 원본 운동 사진 아님'}</figcaption></figure>
 {ex.rule!=='POSTURE'&&<p className="guide-instruction">{ex.description}</p>}
 {ex.rule==='POSTURE'&&<ul className="preparation-checklist"><li>몸과 어깨의 힘을 편안하게 빼기</li><li>카메라 정면 바라보기</li><li>얼굴과 양쪽 어깨를 화면 안에 맞추기</li></ul>}
 <HoldProgress label={a&&!a.progress.calibrated?'중립 자세 측정':ex.detection_type==='TIMER'?'안내 시간':'유지 시간'} elapsed={a?.progress.hold_elapsed||0} target={a?.progress.hold_target||ex.hold_seconds}/>
 <p className="rep-count">{['TIMER','MANUAL','AUDIO'].includes(ex.detection_type)?'안내·확인 횟수':'AI 조건 충족 횟수'} <b>{a?.progress.repetition||0} / {ex.repetitions}회</b></p>
 {ex.detection_type==='MANUAL'&&<button disabled={!training.running||!a?.progress.calibrated||complete} onClick={()=>training.control('manual_complete')}>직접 1회 완료 확인</button>}
 {ex.detection_type==='AUDIO'&&<div className="speech-controls"><button disabled={!training.running||!a?.progress.calibrated||speech.listening||complete||!speech.supported} onClick={speech.listen}>{speech.listening?'듣는 중…':'이번 발음 듣기'}</button><p>{speech.supported?'한국어 텍스트 일치만 확인합니다.':'음성 API 미지원'}</p><p>{speech.transcript}</p>{speech.error&&<p role="alert">{speech.error}</p>}<button onClick={()=>{speech.stop();training.control('timer_fallback');setAudioMode(false);localStorage.setItem('oral-audio-mode','false')}}>마이크 없이 시간 안내로 진행</button></div>}
 {ex.experimental&&<button onClick={()=>{training.control('cheek_fallback');setExperimental(false);localStorage.setItem('oral-experimental','false')}}>볼 운동을 시간 안내로 전환</button>}
 <p className="measurement-note">시간·직접 확인 완료는 AI 인식 성공과 별도로 기록합니다.</p>
 </aside></div>
 <details className="model-details"><summary>AI 모델 상태 · 조건 · 성능 확인</summary><ModelStatusPanel models={models} analysis={a} active={camera.active&&training.running} preparing={training.preparing} error={error}/>
 <ul className="criteria">{Object.entries(a?.criteria||{}).map(([k,v])=><li key={k} className={v===true?'passed':v===null?'unknown':'unmet'}>{v===true?'✓':v===null?'?':'○'} {k}</li>)}</ul>
 <p>추론 {a?.performance?.inference_ms??'—'}ms · 처리 {a?.performance?.fps??'—'} FPS. 검출 점수는 운동 정답률이 아닙니다.</p>
 <button disabled={training.running||training.preparing} onClick={()=>void training.reloadModels()}><RefreshCw size={14}/>모델 다시 준비</button>
 </details>
 </section>
}
