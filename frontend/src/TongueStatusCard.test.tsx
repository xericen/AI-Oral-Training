import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import TongueStatusCard from './TongueStatusCard';
import type {Analysis,ModelStatus} from './types';

const models:ModelStatus={pose_model_loaded:true,face_model_loaded:true,tongue_model_loaded:true,tongue_model_error:null,inference_available:true,error:null,mode:'BROWSER'};
const analysis:Analysis={type:'analysis_result',step_id:'tongue_right',step_state:'ACTIVE',criteria:{},progress:{hold_elapsed:0,hold_target:2,repetition:0,target_repetitions:1,calibrated:true},feedback:{status:'info',message:''},tongue:{label:'tongue_right',confidence:.734,latency_ms:20,stable:true,samples:5,votes:4}};

describe('tongue model demonstration card',()=>{
 it('shows the real class output while explicitly keeping completion manual',()=>{const html=renderToStaticMarkup(<TongueStatusCard models={models} analysis={analysis} rule="TONGUE_RIGHT" active/>);expect(html).toContain('혀 오른쪽');expect(html).toContain('73%');expect(html).toContain('자동 성공 판정 안 함');expect(html).toContain('출력은 운동 완료와 별도')});
 it('shows a model error instead of a prediction',()=>{const html=renderToStaticMarkup(<TongueStatusCard models={{...models,tongue_model_loaded:false,tongue_model_error:'invalid output'}} analysis={analysis} rule="TONGUE_RIGHT" active/>);expect(html).toContain('모델 연결 오류');expect(html).not.toContain('현재 모델 출력')});
 it('does not show a stale prediction while analysis is inactive',()=>{const html=renderToStaticMarkup(<TongueStatusCard models={models} analysis={analysis} rule="TONGUE_RIGHT" active={false}/>);expect(html).toContain('Webcam을 켜면');expect(html).not.toContain('73%')});
});
