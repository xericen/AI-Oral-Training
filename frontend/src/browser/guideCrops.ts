export interface GuideCrop {viewBox:string;label:string}
export const guideSheet={width:1402,height:1122};
const cells=[
 '2 2 346 276','354 2 343 276','704 2 343 276','1054 2 346 276',
 '2 284 346 272','354 284 343 272','704 284 343 272','1054 284 346 272',
 '2 564 346 272','354 564 343 272','704 564 343 272','1054 564 346 272',
 '2 844 346 274','354 844 343 274'
];
const crop=(cell:number,label:string):GuideCrop=>({viewBox:cells[cell],label});
export const guideCrops:Record<string,GuideCrop>={
 posture:crop(0,'편안한 정면 준비자세'),
 breathe_in:crop(1,'코로 숨을 크게 들이쉬기'),
 breathe_out:crop(2,'입으로 천천히 숨 내쉬기'),
 neck_front:crop(0,'앞을 보는 자세'),
 neck_right:crop(3,'목을 돌려 오른쪽 보기'),
 neck_center_1:crop(0,'가운데로 돌아오기'),
 neck_left:crop(4,'목을 돌려 왼쪽 보기'),
 neck_center_2:crop(0,'가운데로 돌아오기'),
 neck_tilt_right:crop(5,'목을 오른쪽으로 기울이기'),
 neck_center_3:crop(0,'가운데로 돌아오기'),
 neck_tilt_left:crop(6,'목을 왼쪽으로 기울이기'),
 neck_center_4:crop(0,'가운데로 돌아오기'),
 neck_down:crop(7,'고개 숙이기'),
 neck_center_5:crop(0,'가운데로 돌아오기'),
 neck_down_right:crop(8,'숙인 상태에서 오른쪽 어깨 보기'),
 neck_center_6:crop(0,'가운데로 돌아오기'),
 neck_down_left:crop(9,'숙인 상태에서 왼쪽 어깨 보기'),
 neck_center_7:crop(0,'가운데로 돌아오기'),
 shoulder_up:crop(10,'양쪽 어깨 올리기'),
 shoulder_down:crop(11,'양쪽 어깨 내리고 힘 빼기'),
 body_right:crop(12,'상체 오른쪽 기울이기'),
 body_center_1:crop(0,'가운데로 돌아오기'),
 body_left:crop(13,'상체 왼쪽 기울이기'),
 body_center_2:crop(0,'가운데로 돌아오기'),
 cool_breathe_in:crop(1,'코로 숨을 크게 들이쉬기'),
 cool_breathe_out:crop(2,'입으로 천천히 숨 내쉬기'),
 cool_center:crop(0,'편안한 정면 자세')
};
export const guideCropFor=(exerciseId:string)=>guideCrops[exerciseId]||null;
