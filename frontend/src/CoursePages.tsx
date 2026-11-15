import {Link} from 'react-router-dom';
import {useState} from 'react';
import {courses} from './browser/courses';
import {defaults,loadThresholds,thresholdDirectionVersion,type Thresholds} from './browser/movement';

export const selectedCourseId=()=>{const saved=typeof localStorage==='undefined'?null:localStorage.getItem('oral-selected-course');return courses.some(c=>c.id===saved)?saved!:courses[0].id};

export function CourseChooser({selected,onSelect}:{selected:string,onSelect:(id:string)=>void}){
 return <div className="course-choice-grid">{courses.map(c=><button type="button" className={'course-choice-card '+(selected===c.id?'selected':'')} key={c.id} aria-pressed={selected===c.id} onClick={()=>onSelect(c.id)}><strong>{c.title}</strong><span>{c.description}</span><small>{c.exercises.length-1}개 동작{selected===c.id?' · 선택됨':''}</small></button>)}</div>
}

export function CoursePage(){
 const [selected,setSelected]=useState(selectedCourseId);
 function choose(id:string){localStorage.setItem('oral-selected-course',id);setSelected(id)}
 const course=courses.find(c=>c.id===selected)!;
 return <main className="content-page course-choice-page"><h1>어떤 운동을 할까요?</h1><p className="course-choice-lead">원하는 네모 상자를 눌러주세요.</p><CourseChooser selected={selected} onSelect={choose}/><div className="selected-course-action"><span>현재 선택</span><strong>{course.title}</strong><Link className="primary-link" to={'/training?course='+course.id}>훈련하기</Link></div></main>
}

export function SettingsPage({participant,setParticipant}:{participant:string,setParticipant:(value:string)=>void}){
 const [mirror,setMirror]=useState(localStorage.getItem('oral-mirror')!=='false'),[overlay,setOverlay]=useState(localStorage.getItem('oral-overlay')!=='false'),[audioMode,setAudioMode]=useState(localStorage.getItem('oral-audio-mode')==='true'),[experimental,setExperimental]=useState(localStorage.getItem('oral-experimental')==='true');
 const [thresholds,setThresholds]=useState<Thresholds>(()=>loadThresholds());
 function save(key:string,value:boolean){localStorage.setItem(key,String(value))}
 function updateThreshold(key:keyof Thresholds,value:number){const next={...thresholds,[key]:value};setThresholds(next);localStorage.setItem('oral-thresholds',JSON.stringify(next));if(key==='yawSign')localStorage.setItem('oral-thresholds-direction-version',thresholdDirectionVersion)}
 return <main className="content-page person-settings-page"><span className="settings-eyebrow">사람 설정</span><h1>내 정보와 카메라·마이크</h1>
 <section className="settings-section"><h2>내 정보</h2><label>참여자 코드<input maxLength={64} value={participant} pattern="[A-Za-z0-9_-]+" onChange={e=>setParticipant(e.target.value.replace(/[^A-Za-z0-9_-]/g,''))}/></label></section>
 <section className="settings-section"><h2>카메라 화면</h2><p>Webcam은 사용자가 직접 켤 때만 권한을 요청합니다. 영상은 기기 안에서 처리하고 저장·전송하지 않습니다.</p><label><input type="checkbox" checked={mirror} onChange={e=>{setMirror(e.target.checked);save('oral-mirror',e.target.checked)}}/>거울 화면 기본 사용</label><br/><label><input type="checkbox" checked={overlay} onChange={e=>{setOverlay(e.target.checked);save('oral-overlay',e.target.checked)}}/>특징점 기본 표시</label></section>
 <section className="settings-section"><h2>마이크</h2><label><input type="checkbox" checked={audioMode} onChange={e=>{setAudioMode(e.target.checked);save('oral-audio-mode',e.target.checked)}}/>발음 단계에서 마이크로 말 확인</label><p>‘이번 발음 듣기’를 누를 때만 마이크 권한을 요청합니다. 미지원 또는 권한 거부 시 마이크 없이 시간 안내로 진행할 수 있습니다.</p></section>
 <details className="advanced-settings"><summary>개인별 움직임 설정</summary><label><input type="checkbox" checked={experimental} onChange={e=>{setExperimental(e.target.checked);save('oral-experimental',e.target.checked)}}/>실험적 볼 외형 판정 사용 · 정확도 미검증</label><div className="threshold-settings">{([['turn','목 돌림',8,30,1],['tilt','목 기울임',8,25,1],['down','고개 숙임',8,25,1],['body','상체 기울임',5,20,1],['shoulder','어깨 상승',.04,.2,.01],['cheek','볼 외형 변화',.01,.08,.005]] as const).map(([key,label,min,max,step])=><label key={key}>{label} {thresholds[key]}<input type="range" min={min} max={max} step={step} value={thresholds[key]} onChange={e=>updateThreshold(key,Number(e.target.value))}/></label>)}</div><label><input type="checkbox" checked={thresholds.yawSign!==defaults.yawSign} onChange={e=>updateThreshold('yawSign',e.target.checked?-defaults.yawSign:defaults.yawSign)}/>목 좌우 방향 반전</label><br/><label><input type="checkbox" checked={thresholds.rollSign!==defaults.rollSign} onChange={e=>updateThreshold('rollSign',e.target.checked?-defaults.rollSign:defaults.rollSign)}/>목 기울임 방향 반전</label></details>
 <div className="settings-links"><Link to="/calibration">중립 자세 측정</Link><Link to="/">홈으로 돌아가기</Link></div></main>
}
