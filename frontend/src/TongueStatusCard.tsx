import type {Analysis,ModelStatus} from './types';
import {tongueLabels,tongueTargetForRule,type TongueClass} from './browser/tongue';

interface Props {models:ModelStatus|null;analysis:Analysis|null;rule:string;active:boolean}
const percent=(value:number)=>Math.round(value*100)+'%';
const knownLabel=(value:string):value is TongueClass=>Object.prototype.hasOwnProperty.call(tongueLabels,value);

/** Demonstration-only output. It is deliberately disconnected from StepEngine completion. */
export default function TongueStatusCard({models,analysis,rule,active}:Props){
 if(models?.tongue_model_loaded===undefined&&models?.tongue_model_error===undefined)return null;
 const prediction=active&&analysis?.tongue&&knownLabel(analysis.tongue.label)?analysis.tongue:null,target=tongueTargetForRule(rule);
 return <section className="tongue-status-card" aria-live="polite">
  <header><strong>혀 방향 AI 시연</strong><span>자동 성공 판정 안 함</span></header>
  {models?.tongue_model_error?<p className="tongue-model-error" role="alert">모델 연결 오류: {models.tongue_model_error}</p>:!models?.tongue_model_loaded?<p>혀 방향 모델을 준비하고 있습니다.</p>:prediction?<div className="tongue-prediction"><span>현재 모델 출력</span><b>{tongueLabels[prediction.label as TongueClass]}</b><small>신뢰 점수 {percent(prediction.confidence)} · 최근 {prediction.votes}/{prediction.samples}프레임 일치{prediction.stable?' · 표시 안정':' · 확인 중'}</small></div>:<p>{active?'얼굴과 입이 한 명만 선명하게 보이면 방향이 표시됩니다.':'Webcam을 켜면 방향 결과가 표시됩니다.'}</p>}
  {target?<p className="tongue-target">현재 안내 방향: <b>{tongueLabels[target]}</b></p>:rule.startsWith('TONGUE_')&&<p className="tongue-target">이 동작은 현재 7개 방향 모델의 자동 판정 범위 밖입니다.</p>}
  <small className="tongue-evaluation">테스트 정확도 66.75% · Macro F1 65.82% · 출력은 운동 완료와 별도입니다.</small>
 </section>;
}
