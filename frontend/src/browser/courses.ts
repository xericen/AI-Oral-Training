import type {Exercise,Course} from '../types';
import legacy from './exercises.json';
const ex=(id:string,title:string,rule:string,mode:string,description:string,hold=2,reps=1,threshold?:number):Exercise=>({id,title,rule,detection_type:mode,description,hold_seconds:hold,repetitions:reps,auto_complete:mode!=='MANUAL',enabled:true,timeout:60,threshold,confidence:.5,category:mode==='POSE'?'어깨·상체':rule.startsWith('HEAD')?'목':mode==='TIMER'?'안내':'구강',feedbackMessage:'통증 없는 편안한 범위에서 천천히 움직이세요.'});
const neutral=(id:string)=>ex(id,'정면 복귀','HEAD_CENTER','FACE','얼굴을 정면으로 되돌려 편안하게 유지하세요.',1);
const posture={...legacy[0],detection_type:'POSE',category:'준비',timeout:60};
const neck:Exercise[]=[
 ex('neck_front','정면 바라보기','HEAD_CENTER','FACE','카메라 정면을 편하게 바라보세요.'),
 ex('neck_right','고개 오른쪽 돌리기','HEAD_RIGHT','FACE','본인의 오른쪽으로 고개를 천천히 돌리세요.',2),neutral('neck_center_1'),
 ex('neck_left','고개 왼쪽 돌리기','HEAD_LEFT','FACE','본인의 왼쪽으로 고개를 천천히 돌리세요.'),neutral('neck_center_2'),
 ex('neck_tilt_right','고개 오른쪽 기울이기','HEAD_TILT_RIGHT','FACE','본인의 오른쪽 어깨 쪽으로 고개를 가볍게 기울이세요.'),neutral('neck_center_3'),
 ex('neck_tilt_left','고개 왼쪽 기울이기','HEAD_TILT_LEFT','FACE','본인의 왼쪽 어깨 쪽으로 고개를 가볍게 기울이세요.'),neutral('neck_center_4'),
 ex('neck_down','고개 숙이기','HEAD_DOWN','FACE','턱을 가볍게 당기며 고개를 숙이세요.'),neutral('neck_center_5'),
 ex('neck_down_right','숙여 오른쪽 어깨 보기','HEAD_DOWN_RIGHT','FACE','고개를 살짝 숙인 채 본인의 오른쪽 어깨 방향으로 돌리세요.'),neutral('neck_center_6'),
 ex('neck_down_left','숙여 왼쪽 어깨 보기','HEAD_DOWN_LEFT','FACE','고개를 살짝 숙인 채 본인의 왼쪽 어깨 방향으로 돌리세요.'),neutral('neck_center_7')];
const shoulders=[
 ex('shoulder_up','양쪽 어깨 올리기','SHOULDER_UP','POSE','얼굴과 상반신 중심은 그대로 두고 양쪽 어깨를 천천히 올리세요.'),
 ex('shoulder_down','양쪽 어깨 내리기','SHOULDER_NEUTRAL','POSE','어깨의 힘을 빼고 처음 높이로 내려 주세요.'),
 ex('body_right','상체 오른쪽 기울이기','BODY_RIGHT','POSE','양쪽 어깨가 보이는 상태에서 본인의 오른쪽으로 상체를 조금 기울이세요.'),ex('body_center_1','상체 정면 복귀','BODY_CENTER','POSE','얼굴 중심을 양쪽 어깨 중심 위로 되돌려 주세요.',1),
 ex('body_left','상체 왼쪽 기울이기','BODY_LEFT','POSE','양쪽 어깨가 보이는 상태에서 본인의 왼쪽으로 상체를 조금 기울이세요.'),ex('body_center_2','상체 정면 복귀','BODY_CENTER','POSE','상체를 처음 중앙 자세로 되돌려 주세요.',1)];
const breath=[ex('breathe_in','코로 들이마시기','BREATH_IN','TIMER','코로 편하게 숨을 들이마시는 안내입니다. 실제 호흡 감지가 아닙니다.',3),ex('breathe_out','입으로 내쉬기','BREATH_OUT','TIMER','입으로 천천히 숨을 내쉬세요. 타이머 안내이며 호흡량을 측정하지 않습니다.',5)];
const lips=[
 {...legacy[1],detection_type:'FACE',category:'입술',timeout:60}, {...legacy[2],detection_type:'FACE',category:'입술',timeout:60},
 ex('cheek_puff','볼 부풀리기','CHEEK_PUFF','TIMER','양쪽 볼에 편하게 공기를 넣으세요. 기본은 시간 안내이며 AI 성공 판정이 아닙니다.',3,3),
 ex('cheek_in','볼 오므리기','CHEEK_IN','MANUAL','볼을 안으로 당겼다가 풀어 주세요. 완료할 때마다 직접 확인하세요. 자동 구분은 미검증입니다.',2,3),
 ex('vowel_a','아 입 모양','MOUTH_OPEN','FACE','아 모양으로 입을 벌리고 유지하세요. 소리·발음은 판정하지 않습니다.',2,3),
 ex('vowel_i','이 입 모양','WIDE','FACE','이 모양으로 입꼬리를 좌우로 넓혀 주세요. 발음 여부는 판정하지 않습니다.',2,3),
 ex('vowel_u','우 입 모양','PUCKER','FACE','우 모양으로 입술을 앞으로 모아 주세요. 발음 여부는 판정하지 않습니다.',2,3),
 ex('vowel_o','오 입 모양','ROUND','FACE','입술을 둥글게 하고 입을 조금 벌리세요. 우와의 구분은 실험적입니다.',2,3),
 ex('jaw_open','턱 운동 · 입 벌리기','MOUTH_OPEN','FACE','턱에 무리 없는 범위에서 입을 벌리세요.'),
 ex('jaw_close','턱 운동 · 입 다물기','MOUTH_CLOSED','FACE','입을 편안하게 다물어 주세요.'),
 ex('jaw_up','입 벌린 채 턱 올리기','JAW_UP','FACE','입을 조금 벌린 채 턱 방향을 가볍게 위로 움직이세요. 실제 턱관절 힘은 측정하지 않습니다.'),
 ex('jaw_press','입 다문 채 턱 누르기 안내','JAW_PRESS','TIMER','입을 다문 상태로 자료의 동작을 천천히 따라 하세요. 누르는 힘은 측정하지 않습니다.',3)];
const tongue=[
 ...[['out','혀 내밀기'],['up','혀 위쪽'],['down','혀 아래쪽'],['right','혀 오른쪽'],['left','혀 왼쪽'],
 ['lip_right','입술 오른쪽 따라가기'],['lip_left','입술 왼쪽 따라가기'],['lip_up','윗입술 따라가기'],['lip_down','아랫입술 따라가기'],
 ['cheek_right','혀로 오른쪽 볼 안쪽 밀기'],['cheek_left','혀로 왼쪽 볼 안쪽 밀기']].map(([id,title])=>({...ex('tongue_'+id,title,'TONGUE','TIMER',title+' 동작을 편안하게 따라 하세요. 혀 검출 모델이 없어 시간 안내만 제공합니다.',3,3),category:'혀'})),
 {...neutral('tongue_center'),title:'편안한 정면 복귀'}];
const speech=['파','타','카','라','파타카라'].map((word,i)=>({...ex('speech_'+i,word+' 발음 연습','SPEECH','TIMER',word+'를 천천히 말해 보세요. 기본은 시간 안내이며 발음 정확도 평가는 아닙니다.',4,3),category:'발음',audioText:word}));
export const courses:Course[]=[
 {id:'basic',title:'기본 운동',description:'입 벌리기와 입술 오므리기',exercises:[posture,...lips.slice(0,2)]},
 {id:'A',title:'몸풀기',description:'숨쉬기, 목과 어깨 풀기',exercises:[posture,...breath,...neck,...shoulders]},
 {id:'B',title:'입 운동',description:'입술, 볼과 턱 움직이기',exercises:[posture,...lips]},
 {id:'C',title:'혀 운동',description:'혀를 여러 방향으로 움직이기',exercises:[posture,...tongue]},
 {id:'D',title:'말하기 운동',description:'파·타·카·라 말하기',exercises:[posture,...speech]},
 {id:'E',title:'전체 운동',description:'몸풀기부터 말하기까지 모두',exercises:[posture,...breath,...neck,...shoulders,...lips,...tongue,...speech,...breath.map(e=>({...e,id:'cool_'+e.id,title:'정리 · '+e.title})),neutral('cool_center')]}
];
export const modeLabel=(mode:string)=>({POSE:'자세 AI · 미검증 기준',POSE_FACE:'자세 AI',FACE:'얼굴 AI · 미검증 기준',CUSTOM_MODEL:'추가 모델 필요',TIMER:'시간 안내 · AI 판정 아님',MANUAL:'직접 확인 · AI 판정 아님',AUDIO:'음성 텍스트 · 실험적'}[mode]||mode);
export const isAI=(mode:string)=>['POSE','POSE_FACE','FACE','CUSTOM_MODEL'].includes(mode);
