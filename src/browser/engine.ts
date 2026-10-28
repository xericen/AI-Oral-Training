import type {Analysis,Exercise} from '../types';import type {Metrics} from './features';import {rules} from './config';
type Criteria=Record<string,boolean|null>;
const labels:Record<string,string>={one_person:'한 명만 카메라 앞에 위치해 주세요.',face_visible:'얼굴이 화면에 보이도록 위치를 조정해 주세요.',face_forward:'카메라 정면을 바라봐 주세요.',centered:'화면 중앙에 얼굴을 맞춰 주세요.',shoulders_visible:'양쪽 어깨가 화면에 보이도록 조정해 주세요.',shoulders_aligned:'어깨를 수평으로 맞춰 주세요.',body_visible:'양쪽 골반까지 화면에 보이도록 조정해 주세요.',body_aligned:'보이는 상체 중심선을 수직으로 맞춰 주세요.',mouth_open:'입을 조금 더 벌려 주세요.',pucker:'입술을 앞으로 모아 오므려 주세요.',neutral_mouth:'입을 편안하게 다문 중립 자세를 유지해 주세요.'};
export function posture(m:Metrics):Criteria{return {one_person:m.person_count===1,face_visible:m.face_count===1&&m.center_x!==null,face_forward:forward(m),centered:m.center_x!==null&&m.center_x>=rules.centerMin&&m.center_x<=rules.centerMax,shoulders_visible:m.shoulder_tilt!==null,shoulders_aligned:m.shoulder_tilt===null?null:m.shoulder_tilt<=rules.shoulderDegrees,body_visible:m.body_alignment!==null,body_aligned:m.body_alignment===null?null:m.body_alignment<=rules.bodyDegrees}}
function forward(m:Metrics){return (['yaw','pitch','roll'] as const).every(k=>m[k]!==null&&Math.abs(m[k]!)<=rules[k])}
export function mouth(rule:string,m:Metrics,b:Metrics):Criteria{const c:Criteria={one_person:m.person_count===1,face_visible:m.face_count===1&&m.center_x!==null,face_forward:forward(m)};const delta=(k:string)=>m[k]==null||b[k]==null?null:m[k]!-b[k]!;
 if(rule==='MOUTH_OPEN'){const j=delta('jawOpen'),v=delta('mouth_open_ratio');c.mouth_open=j===null||v===null?null:j>=rules.jawDelta&&v>=rules.mouthRatioDelta}
 else if(rule==='PUCKER'){const p=delta('mouthPucker'),j=delta('jawOpen'),w=delta('mouth_width_ratio');c.pucker=p===null||j===null||w===null?null:p>=rules.puckerDelta&&j<rules.jawDelta&&w<=-rules.widthDelta}
 else c.unsupported=null;
 return c;}
function median(values:number[]){if(!values.length)return null;const v=[...values].sort((a,b)=>a-b),i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2}
export class StepEngine{
 index=0;state='WAITING';baseline:Metrics|null=null;samples:Metrics[]=[];last:number|null=null;elapsed=0;counts:number[];retries:number[];release=false;criteria:Criteria={};message='카메라를 켜고 분석을 시작해 주세요.';calibrationStart=0;
 constructor(public exercises:Exercise[],private clock:()=>number=()=>performance.now()/1000){this.counts=exercises.map(()=>0);this.retries=exercises.map(()=>0)}
 get exercise(){return this.exercises[this.index]}
 reset(){this.last=null;this.elapsed=0}
 calibrate(){if(this.counts.some(n=>n>0))throw Error('진행 중 재보정은 새 훈련에서 시작해 주세요.');this.baseline=null;this.samples=[];this.state='CALIBRATING';this.calibrationStart=this.clock();this.reset();this.message='입을 편안하게 다문 중립 자세로 2초 유지해 주세요.'}
 resume(){this.reset();if(!this.baseline)this.calibrate();else {this.state=this.counts[this.index]>=this.exercise.repetitions?'COMPLETED':'READY';this.message=this.exercise.description}}
 pause(error?:string){this.reset();this.samples=[];this.criteria={};this.state=error?'ERROR':'PAUSED';this.message=error||'일시정지했습니다.'}
 next(){if(this.counts[this.index]<this.exercise.repetitions)throw Error('현재 단계의 목표 횟수를 먼저 완료해 주세요.');if(this.index<this.exercises.length-1){this.index++;this.state='READY';this.release=false;this.reset();this.criteria={};this.message=this.exercise.description}}
 manual(){if(['WAITING','PAUSED','ERROR'].includes(this.state))throw Error('분석을 시작하거나 재개해 주세요.');if(this.exercise.auto_complete||this.exercise.detection_type!=='MANUAL')throw Error('자동 판정 단계는 직접 성공 처리할 수 없습니다.');this.counts[this.index]=Math.min(this.exercise.repetitions,this.counts[this.index]+1);this.state=this.counts[this.index]>=this.exercise.repetitions?'COMPLETED':'ACTIVE';this.message='사용자 직접 완료로 기록했습니다. AI 성공 판정이 아닙니다.'}
 update(m:Metrics,stale=false){
 const now=this.clock();if(['WAITING','PAUSED','ERROR'].includes(this.state))return;
 if(this.counts[this.index]>=this.exercise.repetitions){this.state='COMPLETED';return}
 let gap=this.last===null?null:now-this.last;
 if(stale){this.reset();this.samples=[];this.state='RETRY';this.criteria={};this.message='분석이 지연되고 있습니다. 최신 화면으로 다시 시도해 주세요.';return}
 const all=(c:Criteria)=>Object.values(c).every(v=>v===true);
 const feedback=(c:Criteria)=>labels[Object.keys(c).find(k=>c[k]!==true)||'']||'측정 조건을 확인해 주세요.';
 if(!this.baseline){this.state='CALIBRATING';this.criteria={...posture(m),neutral_mouth:m.jawOpen!==null&&m.jawOpen<rules.neutralJawMax&&m.mouthPucker!==null&&m.mouthPucker<rules.neutralPuckerMax};
 if(!all(this.criteria)){this.reset();this.samples=[];this.message=feedback(this.criteria)}
 else{if(gap===null||gap>rules.maxGap){this.samples=[];this.elapsed=0;gap=0}this.last=now;this.samples.push({...m});this.elapsed+=gap!;
 if(this.elapsed>=rules.calibrationSeconds&&this.samples.length>=rules.calibrationSamples){this.baseline={};for(const key of Object.keys(m))this.baseline[key]=median(this.samples.map(s=>s[key]).filter((v):v is number=>v!==null&&Number.isFinite(v)));this.samples=[];this.reset();this.state='READY';this.message='캘리브레이션 완료. 준비자세를 유지해 주세요.'}else this.message='중립 자세를 측정하고 있어요.'}
 if(now-this.calibrationStart>rules.calibrationTimeout&&!this.baseline)this.pause('캘리브레이션에 실패했습니다. 얼굴·어깨·골반을 보이게 조정한 뒤 재시도해 주세요.');return}
 if(!this.exercise.auto_complete){this.state='ACTIVE';this.criteria={};this.message='현재는 동작 안내 및 직접 완료 모드입니다.';return}
 this.criteria=this.exercise.rule==='POSTURE'?posture(m):mouth(this.exercise.rule,m,this.baseline);
 if(this.release){this.reset();if(m.face_count===1&&m.person_count===1&&m.jawOpen!==null&&m.mouthPucker!==null&&m.jawOpen<this.baseline.jawOpen!+rules.jawDelta*rules.releaseFraction&&m.mouthPucker<this.baseline.mouthPucker!+rules.puckerDelta*rules.releaseFraction){this.release=false;this.state='READY'}this.message='중립 상태로 돌아온 뒤 다음 반복을 시작해 주세요.';return}
 if(!all(this.criteria)){if(this.elapsed>0)this.retries[this.index]++;this.reset();this.state='RETRY';this.message=feedback(this.criteria);return}
 if(gap===null||gap>rules.maxGap||gap<0){this.elapsed=0;gap=0}this.last=now;this.elapsed+=gap;this.state='HOLDING';this.message='잘하고 있어요! 자세를 유지하세요.';
 if(this.elapsed>=this.exercise.hold_seconds){this.counts[this.index]++;this.release=true;this.state=this.counts[this.index]>=this.exercise.repetitions?'COMPLETED':'SUCCESS';this.message='동작을 성공적으로 완료했습니다!';this.criteria.hold_complete=true}
 }
 snapshot():Analysis{return {type:'analysis_result',step_id:this.exercise.id,step_state:this.state,criteria:{...this.criteria},progress:{hold_elapsed:Math.min(this.elapsed,this.exercise.hold_seconds),hold_target:this.exercise.hold_seconds,repetition:this.counts[this.index],target_repetitions:this.exercise.repetitions,calibrated:this.baseline!==null},feedback:{status:this.state.toLowerCase(),message:this.message}}}
}
