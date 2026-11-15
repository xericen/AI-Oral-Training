import type {Exercise,Course} from '../types';
import legacy from './exercises.json';
const ex=(id:string,title:string,rule:string,mode:string,description:string,hold=2,reps=1,threshold?:number):Exercise=>({id,title,rule,detection_type:mode,description,hold_seconds:hold,repetitions:reps,auto_complete:mode!=='MANUAL',enabled:true,timeout:60,threshold,confidence:.5,category:mode==='POSE'?'어깨·상체':rule.startsWith('HEAD')?'목':mode==='TIMER'?'안내':'구강',feedbackMessage:'통증 없는 편안한 범위에서 천천히 움직이세요.'});
const manual=(id:string,title:string,rule:string,description:string,hold=2,reps=1,category='구강'):Exercise=>({...ex(id,title,rule,'MANUAL',description,hold,reps),category});
const neutral=(id:string)=>ex(id,'가운데 제자리','HEAD_CENTER','FACE','얼굴을 정면으로 되돌려 편안하게 유지하세요.',1);
const posture={...legacy[0],detection_type:'POSE',category:'준비',timeout:60};

const breath=[
 manual('breathe_in','코로 크게 들이마시기','BREATH_IN','코로 숨을 크게 들이마신 뒤 완료를 눌러 주세요.',3),
 manual('breathe_out','입으로 천천히 내쉬기','BREATH_OUT','입으로 천천히 숨을 내쉰 뒤 완료를 눌러 주세요.',5)
];
const neck:Exercise[]=[
 ex('neck_front','앞을 보기','HEAD_CENTER','FACE','카메라 정면을 편하게 바라보세요.'),
 ex('neck_right','목 돌려 오른쪽 보기','HEAD_RIGHT','FACE','본인의 오른쪽으로 목을 천천히 돌리세요.'),neutral('neck_center_1'),
 ex('neck_left','목 돌려 왼쪽 보기','HEAD_LEFT','FACE','본인의 왼쪽으로 목을 천천히 돌리세요.'),neutral('neck_center_2'),
 ex('neck_tilt_right','목 오른쪽으로 기울이기','HEAD_TILT_RIGHT','FACE','본인의 오른쪽 어깨 쪽으로 목을 가볍게 기울이세요.'),neutral('neck_center_3'),
 ex('neck_tilt_left','목 왼쪽으로 기울이기','HEAD_TILT_LEFT','FACE','본인의 왼쪽 어깨 쪽으로 목을 가볍게 기울이세요.'),neutral('neck_center_4'),
 ex('neck_down','고개 숙이기','HEAD_DOWN','FACE','턱을 가볍게 당기며 고개를 숙이세요.'),
 ex('neck_down_right','숙여 오른쪽 어깨 보기','HEAD_DOWN_RIGHT','FACE','숙인 상태에서 오른쪽 어깨를 보세요.'),neutral('neck_center_5'),
 ex('neck_down_left','숙여 왼쪽 어깨 보기','HEAD_DOWN_LEFT','FACE','숙인 상태에서 왼쪽 어깨를 보세요.')
];
const shoulders=[
 ex('shoulder_up','어깨 천천히 올리기','SHOULDER_UP','POSE','양쪽 어깨를 천천히 올리세요.'),
 ex('shoulder_down','어깨 툭 떨어뜨리기','SHOULDER_NEUTRAL','POSE','어깨의 힘을 빼고 아래로 내려 주세요.'),
 ex('body_front','상체 정면 보기','BODY_CENTER','POSE','몸을 가운데로 바로 세워 주세요.',1),
 ex('body_right','상체 오른쪽 기울이기','BODY_RIGHT','POSE','본인의 오른쪽으로 상체를 조금 기울이세요.'),
 ex('body_center_1','상체 가운데 복귀','BODY_CENTER','POSE','상체를 가운데로 되돌리세요.',1),
 ex('body_left','상체 왼쪽 기울이기','BODY_LEFT','POSE','본인의 왼쪽으로 상체를 조금 기울이세요.')
];

const salivaTongue:Exercise[]=[
 {...ex('saliva_open','입 크게 벌리기','MOUTH_OPEN','FACE','입을 크게 벌려 주세요.'),category:'혀'},
 manual('tongue_out','혀 앞으로 내밀기','TONGUE_OUT','입을 벌린 채 혀를 앞으로 내밀고 완료를 눌러 주세요.',2,1,'혀'),
 manual('tongue_up','혀 코끝 방향으로 올리기','TONGUE_UP','혀끝을 코끝 방향으로 올린 뒤 완료를 눌러 주세요.',2,1,'혀'),
 manual('tongue_down','혀 턱끝 방향으로 내리기','TONGUE_DOWN','혀끝을 턱끝 방향으로 내린 뒤 완료를 눌러 주세요.',2,1,'혀'),
 manual('tongue_right','혀 오른쪽 입술 끝으로 내밀기','TONGUE_RIGHT','본인 기준 오른쪽 입술 끝으로 혀를 내민 뒤 완료를 눌러 주세요.',2,1,'혀'),
 manual('tongue_left','혀 왼쪽 입술 끝으로 내밀기','TONGUE_LEFT','본인 기준 왼쪽 입술 끝으로 혀를 내민 뒤 완료를 눌러 주세요.',2,1,'혀'),
 manual('tongue_upper_inner','혀를 윗입술 안쪽으로 올리기','TONGUE_UPPER_INNER','입을 다문 채 혀를 윗입술 안쪽으로 올리세요.',2,1,'혀'),
 manual('tongue_trace_clockwise','윗잇몸 따라 시계방향 돌리기','TONGUE_TRACE_CLOCKWISE','혀끝으로 윗잇몸을 따라 시계방향으로 한 바퀴 돌리세요.',4,1,'혀'),
 manual('tongue_lower_inner','혀를 아랫입술 안쪽으로 내리기','TONGUE_LOWER_INNER','입을 다문 채 혀를 아랫입술 안쪽으로 내리세요.',2,1,'혀'),
 manual('tongue_trace_counter','아랫잇몸 따라 반시계방향 돌리기','TONGUE_TRACE_COUNTER','혀끝으로 아랫잇몸을 따라 반시계방향으로 한 바퀴 돌리세요.',4,1,'혀'),
 manual('tongue_cheek_right_inside','혀로 오른쪽 볼 안쪽 밀기','TONGUE_CHEEK_RIGHT_IN','혀로 본인 기준 오른쪽 볼 안쪽을 밀어 주세요.',2,1,'혀'),
 manual('tongue_cheek_left_inside','혀로 왼쪽 볼 안쪽 밀기','TONGUE_CHEEK_LEFT_IN','혀로 본인 기준 왼쪽 볼 안쪽을 밀어 주세요.',2,1,'혀'),
 manual('tongue_cheek_right_out','혀로 오른쪽 볼 내밀기','TONGUE_CHEEK_RIGHT_OUT','혀로 본인 기준 오른쪽 볼을 바깥으로 내밀어 주세요.',2,1,'혀'),
 manual('tongue_cheek_left_out','혀로 왼쪽 볼 내밀기','TONGUE_CHEEK_LEFT_OUT','혀로 본인 기준 왼쪽 볼을 바깥으로 내밀어 주세요.',2,1,'혀')
];

const chewing:Exercise[]=[
 {...ex('cheek_puff','볼 최대한 부풀리기','CHEEK_PUFF','TIMER','양쪽 볼을 최대한 편안하게 부풀리세요.',3),category:'볼'},
 manual('cheek_in','볼 최소한 오므리기','CHEEK_IN','양쪽 볼을 안으로 오므린 뒤 완료를 눌러 주세요.',2,1,'볼'),
 {...ex('stretch_a','아 소리 입 모양','MOUTH_OPEN','FACE','입을 크게 벌려 아 모양을 만들어 주세요.'),category:'입술'},
 manual('tongue_press_bite','혀로 윗잇몸 누르며 어금니 물기','TONGUE_PRESS_BITE','혀로 윗앞니 뒤쪽을 누르면서 어금니를 가볍게 물어 주세요.',3,1,'혀'),
 manual('hum','음 소리 내기','HUM','입을 다문 채 편안하게 음 소리를 내고 완료를 눌러 주세요.',3,1,'발음'),
 {...ex('vowel_i','이 입 모양','WIDE','FACE','입꼬리를 좌우로 넓혀 이 모양을 만들어 주세요.'),category:'입술'},
 {...ex('vowel_a','아 입 모양','MOUTH_OPEN','FACE','입을 크게 벌려 아 모양을 만들어 주세요.'),category:'입술'},
 {...ex('vowel_e','에 입 모양','WIDE','FACE','입술을 옆으로 편안히 넓혀 에 모양을 만들어 주세요.'),category:'입술'},
 {...ex('vowel_u','우 입 모양','PUCKER','FACE','입술을 앞으로 모아 우 모양을 만들어 주세요.'),category:'입술'},
 {...ex('vowel_o','오 입 모양','ROUND','FACE','입술을 둥글게 모아 오 모양을 만들어 주세요.'),category:'입술'},
 manual('jaw_open_resistance','턱을 받치고 입 벌리기','JAW_OPEN_RESIST','엄지손가락을 턱 아래에 대고 입을 천천히 벌린 뒤 완료를 눌러 주세요.',10),
 manual('jaw_close_resistance','턱을 받치고 입 다물기','JAW_CLOSE_RESIST','검지손가락을 턱 위에 대고 입을 천천히 다문 뒤 완료를 눌러 주세요.',10)
];

const swallowSpeech:Exercise[]=[
 manual('swallow_breathe_in','코로 숨 크게 들이쉬기','BREATH_IN','코로 숨을 크게 들이마신 뒤 완료를 눌러 주세요.',3),
 manual('swallow_saliva','숨 멈추고 침 삼키기','SWALLOW','숨을 잠시 멈추고 침을 꿀꺽 삼킨 뒤 완료를 눌러 주세요.',3),
 manual('swallow_breathe_out','입으로 천천히 내쉬기','BREATH_OUT','입으로 천천히 숨을 내쉰 뒤 완료를 눌러 주세요.',5),
 {...ex('swallow_open','입 크게 벌리기','MOUTH_OPEN','FACE','입을 크게 벌려 주세요.'),category:'혀'},
 manual('swallow_tongue_out','혀 앞으로 내밀기','TONGUE_OUT','혀를 앞으로 내민 뒤 완료를 눌러 주세요.',2,1,'혀'),
 manual('swallow_tongue_up','혀 코끝 방향으로 올리기','TONGUE_UP','혀끝을 코끝 방향으로 올린 뒤 완료를 눌러 주세요.',2,1,'혀'),
 manual('swallow_tongue_down','혀 턱끝 방향으로 내리기','TONGUE_DOWN','혀끝을 턱끝 방향으로 내린 뒤 완료를 눌러 주세요.',2,1,'혀'),
 manual('swallow_tongue_right','혀 오른쪽으로 내밀기','TONGUE_RIGHT','혀를 오른쪽 입술 끝으로 내민 뒤 완료를 눌러 주세요.',2,1,'혀'),
 manual('swallow_tongue_left','혀 왼쪽으로 내밀기','TONGUE_LEFT','혀를 왼쪽 입술 끝으로 내민 뒤 완료를 눌러 주세요.',2,1,'혀'),
 ...['파','타','카','라','파타카라'].map((word,i)=>({...ex('speech_'+i,word+' 발음 연습','SPEECH','TIMER',word+'를 큰 소리로 정확히 말해 보세요.',3,3),category:'발음',audioText:word}))
];

export const courses:Course[]=[
 {id:'A',title:'준비·정리 체조',description:'호흡, 목과 어깨를 차례로 풀기',exercises:[posture,...breath,...neck,...shoulders]},
 {id:'B',title:'침샘·혀 운동',description:'혀를 입 안팎과 좌우로 움직이기',exercises:[posture,...salivaTongue]},
 {id:'C',title:'씹기·입술 운동',description:'볼, 입술과 턱의 힘 기르기',exercises:[posture,...chewing]},
 {id:'D',title:'삼키기·말하기 운동',description:'삼키기 순서와 파·타·카·라 발음',exercises:[posture,...swallowSpeech]}
];
export const modeLabel=(mode:string)=>({POSE:'자세 AI · 미검증 기준',POSE_FACE:'자세 AI',FACE:'얼굴 AI · 미검증 기준',CUSTOM_MODEL:'추가 모델 필요',TIMER:'시간 안내 · AI 판정 아님',MANUAL:'직접 확인 · AI 판정 아님',AUDIO:'음성 텍스트 · 실험적'}[mode]||mode);
export const isAI=(mode:string)=>['POSE','POSE_FACE','FACE','CUSTOM_MODEL'].includes(mode);
