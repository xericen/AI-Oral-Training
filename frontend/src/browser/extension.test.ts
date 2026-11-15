import {describe,it,expect} from 'vitest';
import {courses,isAI} from './courses';import {guideCropFor,guideCrops,guideSheets} from './guideCrops';import {StepEngine} from './engine';import {evaluate,defaults,loadThresholds,released} from './movement';import {extract,type Metrics} from './features';import {summarize} from './records';
const good=(extra:Metrics={}):Metrics=>({person_count:1,face_count:1,center_x:.5,shoulder_tilt:0,body_alignment:0,body_lean:0,shoulder_height:.8,yaw:0,pitch:0,roll:0,jawOpen:.05,mouthPucker:.05,mouthFunnel:.02,mouthSmileLeft:.05,mouthSmileRight:.05,mouth_open_ratio:.02,mouth_width_ratio:.3,cheek_width:.6,...extra});
const get=(rule:string)=>courses.flatMap(c=>c.exercises).find(e=>e.rule===rule)!;
function init(rule:string,mode?:string){let time=0;const ex={...get(rule),...(mode?{detection_type:mode,auto_complete:mode!=='MANUAL'}:{})};const e=new StepEngine([ex],()=>time);e.baseline=good();e.resume();return {e,step:(m=good(),gap=.25)=>{time+=gap;e.update(m)},jump:(n:number)=>{time+=n}}}
describe('Extended course contracts',()=>{
 it('provides the four document courses with unique step IDs',()=>{expect(courses.map(c=>c.id)).toEqual(['A','B','C','D']);for(const c of courses){expect(new Set(c.exercises.map(e=>e.id)).size).toBe(c.exercises.length);expect(c.exercises.every(e=>e.timeout&&e.hold_seconds>0&&e.repetitions>0)).toBe(true)}});
 it('starts every course with the guide-based preparation posture check',()=>{for(const course of courses){const first=course.exercises[0];expect(first.rule).toBe('POSTURE');expect(first.title).toBe('준비자세 확인');expect(first.description).toContain('몸의 힘을 빼고 편안한 정면 자세');expect(first.detection_type).toBe('POSE')}});
 it('shows one matching woman illustration for every document step',()=>{for(const course of courses)for(const exercise of course.exercises){const guide=guideCropFor(exercise.id);expect(guide,exercise.id).not.toBeNull();expect(guide!.viewBox.split(' ')).toHaveLength(4);expect(guide!.sheet).toContain('generated-')}});
 it('uses four generated woman sheets at their source sizes',()=>{expect(guideSheets).toEqual({body:{sheet:'./guides/generated-exercise-poses-v1.png',width:1402,height:1122,columns:4,rows:4},tongue:{sheet:'./guides/generated-tongue-poses-v1.png',width:1402,height:1122,columns:4,rows:4},chewing:{sheet:'./guides/generated-chewing-poses-v1.png',width:1448,height:1086,columns:4,rows:3},speech:{sheet:'./guides/generated-speech-poses-v1.png',width:1536,height:1024,columns:3,rows:2}});expect(new Set(Object.values(guideCrops).map(item=>item.sheet))).toHaveLength(4)});
 it('keeps every extracted crop inside its source page',()=>{for(const item of Object.values(guideCrops)){const [x,y,width,height]=item.viewBox.split(' ').map(Number);expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(x+width).toBeLessThanOrEqual(item.width);expect(y+height).toBeLessThanOrEqual(item.height)}});
 it('uses the original woman pose sheet for every warm-up action',()=>{const warmup=courses.find(course=>course.id==='A')!;for(const exercise of warmup.exercises.slice(1))expect(guideCropFor(exercise.id)?.sheet).toBe(guideSheets.body.sheet)});
 it('never pretends tongue or breath sound confirmation are AI motion detections',()=>{for(const e of courses.find(c=>c.id==='B')!.exercises.filter(e=>e.category==='혀'&&e.rule!=='MOUTH_OPEN'))expect(e.detection_type).toBe('MANUAL');expect(get('BREATH_IN').detection_type).toBe('BREATH_AUDIO');expect(get('BREATH_OUT').detection_type).toBe('BREATH_AUDIO');expect(isAI('BREATH_AUDIO')).toBe(false);expect(courses[3].exercises.filter(e=>e.rule.startsWith('BREATH')).every(e=>e.detection_type==='MANUAL')).toBe(true);expect(get('CHEEK_IN').detection_type).toBe('MANUAL')});
});
describe('Relative calibrated motions',()=>{
 it('migrates the previous reversed yaw setting to the corrected user direction',()=>{const data=new Map<string,string>([['oral-thresholds',JSON.stringify({...defaults,yawSign:-1})]]),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)}};expect(loadThresholds(storage).yawSign).toBe(1);expect(data.get('oral-thresholds-direction-version')).toBe('2')});
 it.each([['HEAD_RIGHT',{yaw:20}],['HEAD_LEFT',{yaw:-20}],['HEAD_TILT_RIGHT',{roll:-15}],['HEAD_TILT_LEFT',{roll:15}],['HEAD_DOWN',{pitch:16}],['HEAD_DOWN_RIGHT',{pitch:12,yaw:15}],['HEAD_DOWN_LEFT',{pitch:12,yaw:-15}],['HEAD_CENTER',{}],['BODY_RIGHT',{body_lean:-15}],['BODY_LEFT',{body_lean:15}],['BODY_CENTER',{}],['SHOULDER_UP',{shoulder_height:.65}],['SHOULDER_NEUTRAL',{}]] as [string,Metrics][])('supports %s with relative geometry',(rule,m)=>{expect(Object.values(evaluate(get(rule),good(m),good(),defaults)).every(v=>v===true)).toBe(true)});
 it('compares head motion to personal neutral offset',()=>{const b=good({yaw:5,pitch:3,roll:2});expect(evaluate(get('HEAD_RIGHT'),good({yaw:25,pitch:3,roll:2}),b,defaults).head_target).toBe(true)});
 it('does not count opposite direction or invisible shoulders',()=>{expect(evaluate(get('HEAD_RIGHT'),good({yaw:-20}),good(),defaults).head_target).toBe(false);expect(Object.values(evaluate(get('SHOULDER_UP'),good({shoulder_tilt:null,shoulder_height:null}),good(),defaults)).every(v=>v===true)).toBe(false)});
 it('requires neutral return for repeated head motion',()=>{const b=good();expect(released(get('HEAD_RIGHT'),good({yaw:20}),b,defaults)).toBe(false);expect(released(get('HEAD_RIGHT'),good(),b,defaults)).toBe(true)});
 it('does not treat a smile as neutral return between mouth repetitions',()=>{const baseline=good();expect(released(get('MOUTH_OPEN'),good({mouthSmileLeft:.8,mouthSmileRight:.8}),baseline,defaults)).toBe(false);expect(released(get('PUCKER'),good({mouthSmileLeft:.8,mouthSmileRight:.8}),baseline,defaults)).toBe(false);expect(released(get('MOUTH_OPEN'),good(),baseline,defaults)).toBe(true)});
 it.each([['WIDE',{mouth_width_ratio:.36}],['ROUND',{jawOpen:.2,mouthFunnel:.5,mouth_width_ratio:.25}],['CHEEK_PUFF',{cheek_width:.65}],['CHEEK_IN',{cheek_width:.55}] ] as [string,Metrics][])('supports %s while keeping modes separate',(rule,m)=>{expect(Object.values(evaluate(get(rule),good(m),good(),defaults)).every(v=>v===true)).toBe(true)});
 it('uses MediaPipe cheek puff change only with a closed, forward-facing mouth',()=>{const baseline=good({cheekPuff:.05});const valid=evaluate(get('CHEEK_PUFF'),good({cheekPuff:.35}),baseline,defaults);expect(valid.cheek_target).toBe(true);expect(valid.mouth_closed).toBe(true);expect(valid.face_forward).toBe(true);const turned=evaluate(get('CHEEK_PUFF'),good({cheekPuff:.35,yaw:30}),baseline,defaults);expect(turned.face_forward).toBe(false);const open=evaluate(get('CHEEK_PUFF'),good({cheekPuff:.35,jawOpen:.3}),baseline,defaults);expect(open.mouth_closed).toBe(false)});
 it('normalizes body/face ratios across image resolutions',()=>{const pose=Array.from({length:17},()=>[.5,.5,.99]);pose[5]=[.3,.5,.99];pose[6]=[.7,.5,.99];pose[11]=[.4,.9,.99];pose[12]=[.6,.9,.99];const landmarks=Array.from({length:478},()=>[.5,.3,0]);const result={pose:[pose],faces:[{landmarks,blendshapes:{},matrix:null}],width:640,height:480,inference_ms:1};expect(extract(result).shoulder_height).toBeCloseTo(extract({...result,width:1280,height:960}).shoulder_height!)});
});
describe('Guided and AI state boundaries',()=>{
 it('timer completes by time only and is excluded from AI',()=>{const x=init('CHEEK_PUFF');for(let i=0;i<18;i++)x.step();expect(x.e.state).toBe('COMPLETED');expect(isAI(x.e.exercise.detection_type)).toBe(false);expect(x.e.criteria.hold_complete).toBeUndefined()});
 it('lost face resets timer instead of completing unseen',()=>{const x=init('CHEEK_PUFF');for(let i=0;i<6;i++)x.step();x.step(good({face_count:0}));expect(x.e.elapsed).toBe(0);expect(x.e.counts[0]).toBe(0)});
 it('does not complete breathing while the user stays still',()=>{const x=init('BREATH_IN');for(let i=0;i<24;i++)x.step();expect(x.e.counts[0]).toBe(0);expect(x.e.state).toBe('ACTIVE');expect(()=>x.e.manual()).toThrow();x.e.breath(x.e.exercise.id,.5);expect(x.e.state).toBe('HOLDING');for(let i=0;i<14;i++)x.step();expect(x.e.state).toBe('COMPLETED')});
 it('manual needs calibration and never turns into AI',()=>{const x=init('CHEEK_IN');x.step();x.e.manual();expect(x.e.counts[0]).toBe(1);expect(isAI(x.e.exercise.detection_type)).toBe(false)});
 it('timeout gives retry feedback without success',()=>{const x=init('HEAD_RIGHT');x.jump(61);x.step();expect(x.e.counts[0]).toBe(0);expect(x.e.message).toContain('제한시간')});
 it('skip does not fabricate completed counts and previous works',()=>{let t=0;const e=new StepEngine(courses[0].exercises,()=>t);e.baseline=good();e.resume();e.skip();expect(e.index).toBe(1);expect(e.skipped.has(0)).toBe(true);expect(e.counts[0]).toBe(0);e.previous();expect(e.index).toBe(0)});
 it('audio only matches exact text on a fresh visible face',()=>{const x=init('SPEECH','AUDIO');x.step();x.e.audio('다른 말');expect(x.e.counts[0]).toBe(0);x.e.audio('파');expect(x.e.counts[0]).toBe(1);x.jump(3);x.e.audio('파');expect(x.e.counts[0]).toBe(1)});
 it('separates timer and AI summaries for the same movement',()=>{const s={step_id:'x',step_name:'test',target_count:3,success_count:3,retry_count:0,duration_seconds:3,completion_status:'COMPLETED',started_at:'2026-10-28'};const summary=summarize([{id:'x',participant_code:'x',started_at:'2026-10-28',ended_at:null,status:'completed',total_duration_seconds:3,completed_steps:2,total_steps:2,steps:[{...s,detection_mode:'TIMER'},{...s,detection_mode:'FACE'}]}]);expect(summary).toHaveLength(2);expect(summary.filter(s=>isAI(s.mode))).toHaveLength(1)});
});

describe('Head nod fallback and breath event boundaries',()=>{
 it('accepts a corroborated downward nod with negative pitch but rejects looking up',()=>{
 const b=good({pitch:4,head_nod_ratio:.4});
 expect(evaluate(get('HEAD_DOWN'),good({pitch:-10,head_nod_ratio:.49}),b,defaults).head_target).toBe(true);
 expect(evaluate(get('HEAD_DOWN'),good({pitch:-10,head_nod_ratio:.32}),b,defaults).head_target).toBe(false);
 expect(evaluate(get('HEAD_DOWN'),good({pitch:18,head_nod_ratio:.32}),b,defaults).head_target).toBe(false);
 expect(evaluate(get('HEAD_DOWN'),good({pitch:null,head_nod_ratio:.49}),b,defaults).head_target).not.toBe(true);
 expect(evaluate(get('HEAD_DOWN'),good({pitch:-10,head_nod_ratio:.49,yaw:30}),b,defaults).head_target).toBe(false);
 });
 it('rejects stale events, wrong steps, pause, short sounds, missing face and duplicate completions',()=>{
 const x=init('BREATH_OUT');x.step();
 for(const d of [.2,NaN,Infinity,7])x.e.breath(x.e.exercise.id,d);
 x.e.breath('breathe_in',1);expect(x.e.counts[0]).toBe(0);
 x.jump(1);x.e.breath(x.e.exercise.id,1);expect(x.e.counts[0]).toBe(0);
 x.step(good({face_count:0}));x.e.breath(x.e.exercise.id,1);expect(x.e.counts[0]).toBe(0);
 x.step();x.e.pause();x.e.breath(x.e.exercise.id,1);expect(x.e.counts[0]).toBe(0);
 x.e.resume();x.step();x.e.breath(x.e.exercise.id,1);x.e.breath(x.e.exercise.id,1);expect(x.e.counts[0]).toBe(0);for(let i=0;i<22;i++)x.step();expect(x.e.counts[0]).toBe(1);
 });
 it('does not accept breath events before calibration or in unrelated manual steps',()=>{
 const e=new StepEngine([get('BREATH_IN')]);e.resume();e.breath(e.exercise.id,1);expect(e.counts[0]).toBe(0);
 const x=init('CHEEK_IN');x.step();x.e.breath(x.e.exercise.id,1);expect(x.e.counts[0]).toBe(0);
 });
});

describe('Breath timing, timeout and nod regression',()=>{
 it.each(['BREATH_IN','BREATH_OUT','HEAD_DOWN','CHEEK_PUFF','CHEEK_IN'])('exposes timeout and skip for %s without a success',rule=>{
 const x=init(rule);x.step();x.jump(61);x.step();expect(x.e.snapshot().progress.timed_out).toBe(true);expect(x.e.counts[0]).toBe(0);
 x.e.breath(x.e.exercise.id,1);expect(x.e.counts[0]).toBe(0);
 x.e.skip();expect(x.e.skipped.has(0)).toBe(true);expect(x.e.state).toBe('SKIPPED');
 });
 it('restarts timeout on retry and clears an interrupted breath countdown',()=>{
 const x=init('BREATH_IN');x.step();x.e.breath(x.e.exercise.id,.6);x.step();x.step();expect(x.e.elapsed).toBeGreaterThan(0);
 x.step(good({face_count:0}));expect(x.e.elapsed).toBe(0);x.step();expect(x.e.criteria.breath_sound).toBe(false);
 x.jump(61);x.step();x.e.resume();x.step();expect(x.e.snapshot().progress.timed_out).toBe(false);expect(x.e.state).toBe('ACTIVE');
 });
 it('does not finish by time alone or extend a countdown with duplicate sound events',()=>{
 const x=init('BREATH_IN');for(let i=0;i<20;i++)x.step();expect(x.e.counts[0]).toBe(0);
 x.e.breath(x.e.exercise.id,.5);x.step();x.step();const elapsed=x.e.elapsed;x.e.breath(x.e.exercise.id,.5);expect(x.e.elapsed).toBe(elapsed);
 for(let i=0;i<14;i++)x.step();expect(x.e.counts[0]).toBe(1);
 });
 it.each([['HEAD_DOWN',0],['HEAD_DOWN_RIGHT',15],['HEAD_DOWN_LEFT',-15]])('accepts smaller corroborated downward motion for %s', (rule,yaw)=>{
 const baseline=good({head_nod_ratio:.4});
 expect(evaluate(get(String(rule)),good({pitch:-12,head_nod_ratio:.43,yaw:Number(yaw)}),baseline,defaults).head_target).toBe(true);
 expect(evaluate(get(String(rule)),good({pitch:-12,head_nod_ratio:.37,yaw:Number(yaw)}),baseline,defaults).head_target).toBe(false);
 });
});
