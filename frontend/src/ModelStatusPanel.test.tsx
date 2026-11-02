import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ModelStatusPanel from './ModelStatusPanel';
import type {Analysis,ModelStatus} from './types';
const models:ModelStatus={pose_model_loaded:true,face_model_loaded:true,inference_available:true,error:null,mode:'BROWSER'};
function sample():Analysis{return {type:'analysis_result',step_id:'posture',step_state:'ACTIVE',timestamp_ms:Date.now(),criteria:{},progress:{hold_elapsed:0,hold_target:2,repetition:0,target_repetitions:1,calibrated:true},feedback:{status:'info',message:''},metrics:{face_count:1,jawOpen:.45,mouthPucker:.12},overlay:{pose_keypoints:[Array.from({length:17},(_,i)=>[.5,.5,i===5?.7:.9])],face_landmarks:[[.5,.5,0]]}}}
function render(analysis:Analysis|null,active=true,error=''){return renderToStaticMarkup(<ModelStatusPanel models={models} analysis={analysis} active={active} preparing={false} error={error}/>)}
describe('honest model score presentation',()=>{
 it('distinguishes score/coefficients from unmeasured accuracy',()=>{const html=render(sample());expect(html).toContain('80%');expect(html).toContain('45%');expect(html).toContain('12%');expect(html.match(/미측정/g)).toHaveLength(2);expect(html).toContain('정답률이 아닙니다')});
 it('does not show cached percentages when stopped or errored',()=>{expect(render(sample(),false)).not.toContain('80%');expect(render(sample(),true,'model failed')).not.toContain('45%')});
 it('hides stale frame scores',()=>{const a=sample();a.timestamp_ms=Date.now()-10000;expect(render(a)).not.toContain('80%');expect(render(a)).not.toContain('45%')});
 it('does not turn missing or invalid scores into zero percent',()=>{const a=sample();a.metrics!.jawOpen=NaN;a.metrics!.mouthPucker=2;a.overlay!.pose_keypoints[0][5][2]=-1;expect(render(a)).not.toMatch(/\d+%/);expect(render(null)).not.toMatch(/\d+%/)});
 it('does not aggregate different people into one confidence',()=>{const a=sample();a.overlay!.pose_keypoints.push(a.overlay!.pose_keypoints[0]);a.metrics!.face_count=2;expect(render(a)).not.toContain('80%');expect(render(a)).not.toContain('45%')});
});
