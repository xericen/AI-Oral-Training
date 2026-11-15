import type {Analysis,Exercise} from '../types';import type {Metrics} from './features';import {rules} from './config';import {evaluate,released,defaults,type Thresholds} from './movement';
type Criteria=Record<string,boolean|null>;
const labels:Record<string,string>={one_person:'한 명만 카메라 앞에 위치해 주세요.',face_visible:'얼굴이 화면에 보이도록 위치를 조정해 주세요.',face_forward:'카메라 정면을 바라봐 주세요.',centered:'화면 중앙에 얼굴을 맞춰 주세요.',shoulders_visible:'양쪽 어깨가 화면에 보이도록 조정해 주세요.',shoulders_aligned:'어깨를 수평으로 맞춰 주세요.',body_visible:'얼굴과 양쪽 어깨가 보이도록 상반신을 맞춰 주세요.',body_aligned:'얼굴과 어깨 중심을 수직으로 맞춰 주세요.',mouth_open:'입을 조금 더 벌려 주세요.',pucker:'입술을 앞으로 모아 오므려 주세요.',neutral_mouth:'입을 편안하게 다문 중립 자세를 유지해 주세요.',head_target:'안내된 방향으로 고개를 조금 더 움직여 주세요.',body_target:'안내된 방향으로 상체를 조금 더 움직여 주세요.',mouth_target:'안내된 입 모양을 조금 더 분명하게 만들어 주세요.',mouth_closed:'입술을 편안하게 닫아 주세요.',cheek_target:'볼 모양을 조금 더 분명하게 만들어 주세요.'};
export function posture(m:Metrics):Criteria{return {one_person:m.person_count===1,face_visible:m.face_count===1&&m.center_x!==null,face_forward:forward(m),centered:m.center_x!==null&&m.center_x>=rules.centerMin&&m.center_x<=rules.centerMax,shoulders_visible:m.shoulder_tilt!==null,shoulders_aligned:m.shoulder_tilt===null?null:m.shoulder_tilt<=rules.shoulderDegrees,body_visible:m.body_alignment!==null,body_aligned:m.body_alignment===null?null:m.body_alignment<=rules.bodyDegrees}}
function forward(m:Metrics){return (['yaw','pitch','roll'] as const).every(k=>m[k]!==null&&Math.abs(m[k]!)<=rules[k])}
export function neutralExpression(m:Metrics){const values=[m.mouthSmileLeft,m.mouthSmileRight];return values.some(value=>value==null)?null:values.every(value=>value!<=rules.neutralSmileMax)}
export function mouth(rule:string,m:Metrics,b:Metrics):Criteria{const c:Criteria={one_person:m.person_count===1,face_visible:m.face_count===1&&m.center_x!==null,face_forward:forward(m)};const delta=(k:string)=>m[k]==null||b[k]==null?null:m[k]!-b[k]!;
 if(rule==='MOUTH_OPEN'){const j=delta('jawOpen'),v=delta('mouth_open_ratio');c.mouth_open=j===null&&v===null?null:(j!==null&&v!==null&&j>=rules.jawDelta&&v>=rules.mouthRatioDelta)||(j!==null&&j>=rules.mouthOpenJawStrong&&(v===null||v>=.012))||(v!==null&&v>=rules.mouthOpenRatioStrong&&(j===null||j>=.08))}
 else if(rule==='PUCKER'){const p=delta('mouthPucker'),j=delta('jawOpen'),w=delta('mouth_width_ratio'),f=delta('mouthFunnel');c.pucker=p===null||j===null?null:j<.3&&((p>=rules.puckerDelta&&((w!==null&&w<=-rules.widthDelta)||(f!==null&&f>=.12)))||p>=rules.puckerStrong)}
 else c.unsupported=null;
 return c;}
function median(values:number[]){if(!values.length)return null;const v=[...values].sort((a,b)=>a-b),i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2}
export class StepEngine{
 index=0;state='WAITING';baseline:Metrics|null=null;samples:Metrics[]=[];last:number|null=null;elapsed=0;conditionLostAt:number|null=null;counts:number[];retries:number[];release=false;criteria:Criteria={};message='카메라를 켜고 분석을 시작해 주세요.';calibrationStart=0;
 durations:number[]=[];observedAt=0;visible=false;stepStart=0;skipped=new Set<number>();thresholds:Thresholds={...defaults};
 constructor(public exercises:Exercise[],private clock:()=>number=()=>performance.now()/1000){this.counts=exercises.map(()=>0);this.retries=exercises.map(()=>0);this.durations=exercises.map(()=>0)}
 get exercise(){return this.exercises[this.index]}
 reset(){this.last=null;this.elapsed=0;this.conditionLostAt=null}
 calibrate(){if(this.counts.some(n=>n>0))throw Error('진행 중 재보정은 새 훈련에서 시작해 주세요.');this.baseline=null;this.samples=[];this.state='CALIBRATING';this.calibrationStart=this.clock();this.reset();this.message='입을 편안하게 다문 중립 자세로 2초 유지해 주세요.'}
 resume(){this.reset();this.stepStart=this.clock();if(!this.baseline)this.calibrate();else {this.state=this.counts[this.index]>=this.exercise.repetitions?'COMPLETED':'READY';this.message=this.exercise.description}}
 pause(error?:string){this.reset();this.samples=[];this.criteria={};this.state=error?'ERROR':'PAUSED';this.message=error||'일시정지했습니다.'}
 next(){if(this.counts[this.index]<this.exercise.repetitions)throw Error('현재 단계의 목표 횟수를 먼저 완료해 주세요.');if(this.index<this.exercises.length-1){this.index++;this.stepStart=this.clock();this.state='READY';this.release=false;this.reset();this.criteria={};this.message=this.exercise.description}}
 previous(){if(this.index>0){this.index--;this.reset();this.release=false;this.state=this.counts[this.index]>=this.exercise.repetitions?'COMPLETED':'READY';this.stepStart=this.clock();this.message=this.exercise.description}}
 skip(){this.skipped.add(this.index);if(this.index<this.exercises.length-1){this.index++;this.reset();this.release=false;this.stepStart=this.clock();this.state='READY';this.criteria={};this.message='이전 단계는 건너뜀으로 기록합니다. '+this.exercise.description}else{this.state='SKIPPED';this.message='마지막 단계를 건너뛰었습니다. 종료하여 부분 기록을 저장하세요.'}}
 audio(text:string){if(!this.baseline||!this.visible||this.clock()-this.observedAt>rules.maxAge||this.state==='PAUSED'||this.state==='ERROR'||this.state==='WAITING'||this.exercise.detection_type!=='AUDIO')return;const clean=(s:string)=>s.replace(/[^가-힣]/g,'');if(clean(text)===clean(this.exercise.audioText||'')){this.counts[this.index]=Math.min(this.exercise.repetitions,this.counts[this.index]+1);this.state=this.counts[this.index]>=this.exercise.repetitions?'COMPLETED':'ACTIVE';this.message='음성 텍스트 일치 · 발음 정확도 평가는 아닙니다.'}}
 manual(){if(!this.baseline||!this.visible)throw Error('중립 보정 후 얼굴이 보이는 상태에서 확인해 주세요.');if(['WAITING','PAUSED','ERROR'].includes(this.state))throw Error('분석을 시작하거나 재개해 주세요.');if(this.exercise.auto_complete||this.exercise.detection_type!=='MANUAL')throw Error('자동 판정 단계는 직접 성공 처리할 수 없습니다.');this.counts[this.index]=Math.min(this.exercise.repetitions,this.counts[this.index]+1);this.state=this.counts[this.index]>=this.exercise.repetitions?'COMPLETED':'ACTIVE';this.message='사용자 직접 완료로 기록했습니다. AI 성공 판정이 아닙니다.'}
 update(m:Metrics,stale=false){
 const now=this.clock();const frameGap=now-this.observedAt;this.observedAt=now;this.visible=!stale&&m.face_count===1&&m.person_count===1;
 if(!['WAITING','PAUSED','ERROR','COMPLETED','SKIPPED'].includes(this.state)&&frameGap>=0&&frameGap<=rules.maxGap)this.durations[this.index]+=frameGap;
 if(['WAITING','PAUSED','ERROR'].includes(this.state))return;
 if(this.state==='SKIPPED')return;if(this.counts[this.index]>=this.exercise.repetitions){this.state='COMPLETED';return}
 let gap=this.last===null?null:now-this.last;
 if(stale){this.reset();this.samples=[];this.state='RETRY';this.criteria={};this.message='분석이 지연되고 있습니다. 최신 화면으로 다시 시도해 주세요.';return}
 const all=(c:Criteria)=>Object.values(c).every(v=>v===true);
 const feedback=(c:Criteria)=>labels[Object.keys(c).find(k=>c[k]!==true)||'']||'측정 조건을 확인해 주세요.';
 if(!this.baseline){this.state='CALIBRATING';this.criteria={one_person:m.person_count===1,face_visible:m.face_count===1&&m.center_x!==null,centered:m.center_x!==null&&m.center_x>=rules.centerMin&&m.center_x<=rules.centerMax,shoulders_visible:m.shoulder_tilt!==null,neutral_mouth:m.jawOpen!==null&&m.mouthPucker!==null&&m.mouth_open_ratio!==null&&m.jawOpen<=rules.neutralJawMax&&m.mouthPucker<=rules.neutralPuckerMax&&m.mouth_open_ratio<=rules.neutralMouthRatioMax&&neutralExpression(m)===true};
 if(!all(this.criteria)){this.reset();this.samples=[];this.message=feedback(this.criteria)}
 else{if(gap===null||gap>rules.maxGap){this.samples=[];this.elapsed=0;gap=0}this.last=now;this.samples.push({...m});this.elapsed+=gap!;
 if(this.elapsed>=rules.calibrationSeconds&&this.samples.length>=rules.calibrationSamples){this.baseline={};for(const key of Object.keys(m))this.baseline[key]=median(this.samples.map(s=>s[key]).filter((v):v is number=>v!==null&&Number.isFinite(v)));this.samples=[];this.reset();this.state='READY';this.message='캘리브레이션 완료. 준비자세를 유지해 주세요.'}else this.message='중립 자세를 측정하고 있어요.'}
 if(now-this.calibrationStart>rules.calibrationTimeout&&!this.baseline){this.calibrationStart=now;this.samples=[];this.reset();this.state='CALIBRATING';this.message='얼굴과 양쪽 어깨를 다시 확인하고 자동 측정을 계속할게요.'}return}
 if(this.exercise.detection_type==='TIMER'){
 this.criteria={face_visible:m.face_count===1&&m.person_count===1};
 if(!all(this.criteria)){this.reset();this.state='RETRY';this.message='얼굴이 보이도록 해 주세요. 시간 안내를 잠시 멈춥니다.';return}
 if(gap===null||gap>rules.maxGap||gap<0)gap=0;this.last=now;this.elapsed+=gap;
 this.state='HOLDING';this.message='시간 안내 중 · 실제 동작이나 호흡을 감지한 결과가 아닙니다.';
 if(this.elapsed>=this.exercise.hold_seconds){this.counts[this.index]++;this.state=this.counts[this.index]>=this.exercise.repetitions?'COMPLETED':'SUCCESS';this.reset();this.message='안내 시간이 끝났습니다. AI 성공 판정이 아닙니다.'}return;
 }
 if(this.exercise.detection_type==='AUDIO'){this.state=this.visible?'ACTIVE':'RETRY';this.message='마이크 버튼을 눌러 한 번씩 말해 주세요. 음성 텍스트 확인이며 발음 평가는 아닙니다.';return}
 if(this.exercise.timeout&&now-this.stepStart>this.exercise.timeout){this.reset();this.state='RETRY';this.criteria={};this.message='단계 제한시간이 지났습니다. 잠시 쉬거나 다음으로 건너뛰고 미완료로 기록할 수 있습니다.';return}
 if(!this.exercise.auto_complete){this.state='ACTIVE';this.criteria={};this.message='현재는 동작 안내 및 직접 완료 모드입니다.';return}
 this.criteria=evaluate(this.exercise,m,this.baseline,this.thresholds);
 if(this.release){this.reset();if(released(this.exercise,m,this.baseline,this.thresholds)){this.release=false;this.state='READY'}this.message='중립 상태로 돌아온 뒤 다음 반복을 시작해 주세요.';return}
 if(!all(this.criteria)){if(this.elapsed>0){if(this.conditionLostAt===null)this.conditionLostAt=now;this.last=null;if(now-this.conditionLostAt<=rules.conditionGraceSeconds){this.state='HOLDING';this.message='인식이 잠시 흔들렸어요. 같은 자세를 유지해 주세요.';return}this.retries[this.index]++}this.reset();this.state='RETRY';this.message=feedback(this.criteria);return}
 const recoveredFromBriefLoss=this.conditionLostAt!==null;this.conditionLostAt=null;
 if(gap===null||gap>rules.maxGap||gap<0){if(!recoveredFromBriefLoss)this.elapsed=0;gap=0}this.last=now;this.elapsed+=gap;this.state='HOLDING';this.message='잘하고 있어요! 자세를 유지하세요.';
 if(this.elapsed>=this.exercise.hold_seconds){this.counts[this.index]++;this.release=true;this.state=this.counts[this.index]>=this.exercise.repetitions?'COMPLETED':'SUCCESS';this.message='동작을 성공적으로 완료했습니다!';this.criteria.hold_complete=true}
 }
 snapshot():Analysis{return {type:'analysis_result',step_id:this.exercise.id,step_state:this.state,criteria:{...this.criteria},progress:{hold_elapsed:Math.min(this.elapsed,this.exercise.hold_seconds),hold_target:this.exercise.hold_seconds,repetition:this.counts[this.index],target_repetitions:this.exercise.repetitions,calibrated:this.baseline!==null},feedback:{status:this.state.toLowerCase(),message:this.message}}}
}
