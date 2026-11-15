export interface GuideCrop {viewBox:string;label:string;sheet:string;width:number;height:number}

export const guideSheets={
 body:{sheet:'./guides/generated-exercise-poses-v1.png',width:1402,height:1122,columns:4,rows:4},
 tongue:{sheet:'./guides/generated-tongue-poses-v1.png',width:1402,height:1122,columns:4,rows:4},
 chewing:{sheet:'./guides/generated-chewing-poses-v1.png',width:1448,height:1086,columns:4,rows:3},
 speech:{sheet:'./guides/generated-speech-poses-v1.png',width:1536,height:1024,columns:3,rows:2}
} as const;

const cell=(page:keyof typeof guideSheets,index:number,label:string):GuideCrop=>{
 const source=guideSheets[page],column=index%source.columns,row=Math.floor(index/source.columns);
 const cellWidth=source.width/source.columns,cellHeight=source.height/source.rows,inset=4;
 return {sheet:source.sheet,width:source.width,height:source.height,label,viewBox:`${Math.round(column*cellWidth+inset)} ${Math.round(row*cellHeight+inset)} ${Math.round(cellWidth-inset*2)} ${Math.round(cellHeight-inset*2)}`};
};

const body=(index:number,label:string)=>cell('body',index,label);
const tongue=(index:number,label:string)=>cell('tongue',index,label);
const chewing=(index:number,label:string)=>cell('chewing',index,label);
const speech=(index:number,label:string)=>cell('speech',index,label);

export const guideCrops:Record<string,GuideCrop>={
 posture:body(0,'편안한 정면 준비자세'),
 breathe_in:body(1,'코로 숨을 크게 들이쉬기'),
 breathe_out:body(2,'입으로 천천히 숨 내쉬기'),
 neck_front:body(0,'앞을 보는 자세'),
 neck_right:body(3,'목을 돌려 오른쪽 보기'),
 neck_center_1:body(0,'가운데 제자리로 돌아오기'),
 neck_left:body(4,'목을 돌려 왼쪽 보기'),
 neck_center_2:body(0,'앞을 보는 자세'),
 neck_tilt_right:body(5,'목을 오른쪽으로 기울이기'),
 neck_center_3:body(0,'가운데 제자리로 돌아오기'),
 neck_tilt_left:body(6,'목을 왼쪽으로 기울이기'),
 neck_center_4:body(0,'앞을 보는 자세'),
 neck_down:body(7,'고개 숙이기'),
 neck_down_right:body(8,'숙여 오른쪽 어깨 보기'),
 neck_center_5:body(0,'가운데 제자리로 돌아오기'),
 neck_down_left:body(9,'숙여 왼쪽 어깨 보기'),
 shoulder_up:body(10,'어깨 천천히 올리기'),
 shoulder_down:body(11,'어깨 툭 떨어뜨리기'),
 body_front:body(0,'상체 정면 보기'),
 body_right:body(12,'상체 오른쪽 기울이기'),
 body_center_1:body(0,'상체 가운데 복귀'),
 body_left:body(13,'상체 왼쪽 기울이기'),

 saliva_open:tongue(0,'입을 크게 벌리기'),
 tongue_out:tongue(1,'혀를 앞으로 내밀기'),
 tongue_up:tongue(2,'혀를 코끝 방향으로 올리기'),
 tongue_down:tongue(3,'혀를 턱끝 방향으로 내리기'),
 tongue_right:tongue(4,'혀를 오른쪽 입술 끝으로 내밀기'),
 tongue_left:tongue(5,'혀를 왼쪽 입술 끝으로 내밀기'),
 tongue_upper_inner:tongue(6,'혀를 윗입술 안쪽으로 올리기'),
 tongue_trace_clockwise:tongue(7,'윗잇몸 따라 시계방향 돌리기'),
 tongue_lower_inner:tongue(8,'혀를 아랫입술 안쪽으로 내리기'),
 tongue_trace_counter:tongue(9,'아랫잇몸 따라 반시계방향 돌리기'),
 tongue_cheek_right_inside:tongue(10,'혀로 오른쪽 볼 안쪽 밀기'),
 tongue_cheek_left_inside:tongue(11,'혀로 왼쪽 볼 안쪽 밀기'),
 tongue_cheek_right_out:tongue(12,'혀로 오른쪽 볼 내밀기'),
 tongue_cheek_left_out:tongue(13,'혀로 왼쪽 볼 내밀기'),

 cheek_puff:chewing(0,'볼 최대한 부풀리기'),
 cheek_in:chewing(1,'볼 최소한 오므리기'),
 stretch_a:chewing(2,'아 소리 입 모양'),
 tongue_press_bite:chewing(3,'혀로 윗잇몸 누르며 어금니 물기'),
 hum:chewing(4,'음 소리 내기'),
 vowel_i:chewing(5,'이 입 모양'),
 vowel_a:chewing(6,'아 입 모양'),
 vowel_e:chewing(7,'에 입 모양'),
 vowel_u:chewing(8,'우 입 모양'),
 vowel_o:chewing(9,'오 입 모양'),
 jaw_open_resistance:chewing(10,'턱을 받치고 입 벌리기'),
 jaw_close_resistance:chewing(11,'턱을 받치고 입 다물기'),

 swallow_breathe_in:body(1,'코로 숨 크게 들이쉬기'),
 swallow_saliva:speech(0,'숨 멈추고 침 삼키기'),
 swallow_breathe_out:body(2,'입으로 천천히 내쉬기'),
 swallow_open:tongue(0,'입을 크게 벌리기'),
 swallow_tongue_out:tongue(1,'혀를 앞으로 내밀기'),
 swallow_tongue_up:tongue(2,'혀를 코끝 방향으로 올리기'),
 swallow_tongue_down:tongue(3,'혀를 턱끝 방향으로 내리기'),
 swallow_tongue_right:tongue(4,'혀를 오른쪽으로 내밀기'),
 swallow_tongue_left:tongue(5,'혀를 왼쪽으로 내밀기'),
 speech_0:speech(1,'파 발음 연습'),
 speech_1:speech(2,'타 발음 연습'),
 speech_2:speech(3,'카 발음 연습'),
 speech_3:speech(4,'라 발음 연습'),
 speech_4:speech(5,'파타카라 발음 연습')
};

export const guideCropFor=(exerciseId:string)=>guideCrops[exerciseId]||null;
