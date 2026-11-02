import type {Exercise} from '../types';import type {Metrics} from './features';import {rules} from './config';import {posture,mouth} from './engine';
export interface Thresholds {turn:number;tilt:number;down:number;body:number;shoulder:number;cheek:number;yawSign:number;rollSign:number}
export const defaults:Thresholds={turn:15,tilt:12,down:12,body:10,shoulder:.08,cheek:.025,yawSign:-1,rollSign:-1};
export function evaluate(ex:Exercise,m:Metrics,b:Metrics,t:Thresholds):Record<string,boolean|null>{
 const delta=(key:string)=>m[key]==null||b[key]==null?null:m[key]!-b[key]!;
 const test=(v:number|null,p:(x:number)=>boolean)=>v===null?null:p(v);
 const any=(...values:(boolean|null)[])=>values.every(value=>value===null)?null:values.some(value=>value===true);
 const basic={one_person:m.person_count===1,face_visible:m.face_count===1&&m.center_x!==null};
 const rel={yaw:delta('yaw'),pitch:delta('pitch'),roll:delta('roll')};
 const front=Object.values(rel).every(v=>v!==null)&&Math.abs(rel.yaw!)<rules.yaw&&Math.abs(rel.pitch!)<rules.pitch&&Math.abs(rel.roll!)<rules.roll;
 const face={...basic,face_forward:front};
 const near=(v:number|null,r:number)=>v!==null&&Math.abs(v)<r;
 const rule=ex.rule;
 if(rule==='POSTURE')return posture(m);
 if(rule.startsWith('HEAD')){
 let condition:boolean|null=null;
 const yaw=rel.yaw===null?null:rel.yaw*t.yawSign,roll=rel.roll===null?null:rel.roll*t.rollSign;
 if(rule==='HEAD_CENTER')condition=near(rel.yaw,8)&&near(rel.pitch,8)&&near(rel.roll,8);
 if(rule==='HEAD_RIGHT')condition=test(yaw,v=>v>=t.turn)&&near(rel.pitch,15)&&near(rel.roll,15);
 if(rule==='HEAD_LEFT')condition=test(yaw,v=>v<=-t.turn)&&near(rel.pitch,15)&&near(rel.roll,15);
 if(rule==='HEAD_TILT_RIGHT')condition=test(roll,v=>v>=t.tilt)&&near(rel.yaw,15);
 if(rule==='HEAD_TILT_LEFT')condition=test(roll,v=>v<=-t.tilt)&&near(rel.yaw,15);
 if(rule==='HEAD_DOWN')condition=test(rel.pitch,v=>v>=t.down)&&near(rel.yaw,15);
 if(rule==='HEAD_DOWN_RIGHT')condition=test(rel.pitch,v=>v>=t.down*.65)&&test(yaw,v=>v>=t.turn*.65);
 if(rule==='HEAD_DOWN_LEFT')condition=test(rel.pitch,v=>v>=t.down*.65)&&test(yaw,v=>v<=-t.turn*.65);
 return {...basic,head_target:condition};
 }
 if(rule.startsWith('SHOULDER')||rule.startsWith('BODY')){
 const lean=delta('body_lean'),height=delta('shoulder_height');
 let target:boolean|null=null;
 if(rule==='SHOULDER_UP')target=test(height,v=>v<=-t.shoulder);
 if(rule==='SHOULDER_NEUTRAL')target=test(height,v=>Math.abs(v)<=t.shoulder*.5);
 if(rule==='BODY_RIGHT')target=test(lean,v=>v<=-t.body);
 if(rule==='BODY_LEFT')target=test(lean,v=>v>=t.body);
 if(rule==='BODY_CENTER')target=test(lean,v=>Math.abs(v)<5);
 return {...basic,shoulders_visible:m.shoulder_tilt!==null,body_visible:m.body_alignment!==null,body_target:target};
 }
 if(['MOUTH_OPEN','PUCKER'].includes(rule))return {...mouth(rule,m,b),face_forward:front};
 const jaw=delta('jawOpen'),width=delta('mouth_width_ratio'),funnel=delta('mouthFunnel');
 if(rule==='WIDE')return {...face,mouth_target:test(width,v=>v>=.035)&&test(jaw,v=>v<rules.jawDelta)};
 if(rule==='ROUND')return {...face,mouth_target:test(funnel,v=>v>=.15)&&test(jaw,v=>v>=.08&&v<.5)&&test(width,v=>v<=-.01)};
 if(rule==='MOUTH_CLOSED')return {...face,mouth_target:test(jaw,v=>v<.08)&&test(delta('mouth_open_ratio'),v=>v<.02)};
 if(rule==='JAW_UP')return {...basic,mouth_target:test(jaw,v=>v>=.15)&&test(rel.pitch,v=>v<=-t.down)};
 if(['CHEEK_PUFF','CHEEK_IN'].includes(rule)){
  const widthChange=delta('cheek_width'),puffChange=delta('cheekPuff');
  const cheekTarget=rule==='CHEEK_PUFF'?any(test(widthChange,v=>v>=t.cheek),test(puffChange,v=>v>=.15)):test(widthChange,v=>v<=-t.cheek);
  return {...face,mouth_closed:test(jaw,v=>v<.08),cheek_target:cheekTarget};
 }
 return {...face,unsupported:null};
}
export function released(ex:Exercise,m:Metrics,b:Metrics,t:Thresholds){
 if(ex.detection_type==='TIMER')return true;
 if(m.face_count!==1||m.person_count!==1)return false;
 if(ex.rule.startsWith('HEAD'))return ['yaw','pitch','roll'].every(k=>m[k]!=null&&b[k]!=null&&Math.abs(m[k]!-b[k]!)<8);
 if(ex.rule.startsWith('BODY'))return m.body_lean!=null&&b.body_lean!=null&&Math.abs(m.body_lean-b.body_lean)<5;
 if(ex.rule.startsWith('SHOULDER'))return m.shoulder_height!=null&&b.shoulder_height!=null&&Math.abs(m.shoulder_height-b.shoulder_height)<t.shoulder*.5;
 return m.jawOpen!=null&&b.jawOpen!=null&&m.mouthPucker!=null&&b.mouthPucker!=null&&Math.abs(m.jawOpen-b.jawOpen)<rules.jawDelta*rules.releaseFraction&&Math.abs(m.mouthPucker-b.mouthPucker)<rules.puckerDelta*rules.releaseFraction&&
 (m.mouth_width_ratio==null||b.mouth_width_ratio==null||Math.abs(m.mouth_width_ratio-b.mouth_width_ratio)<.02);
}
