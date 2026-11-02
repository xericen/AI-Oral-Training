import {useEffect,useState} from 'react';import {Link,useParams} from 'react-router-dom';
import {CalendarDays,CheckCircle2,ChevronRight,Clock3,RotateCw} from 'lucide-react';
import {summarize} from './browser/records';import {combinedRecords,recordRequest,importLocalRecord} from './browser/sync';import type {TrainingSession} from './types';
const statusLabel:Record<string,string>={completed:'완료',cancelled:'중도 종료',active:'진행 중',interrupted:'연결 중단',paused:'일시정지'};
const dateText=(value:string)=>new Date(value).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
const timeText=(value:string)=>new Date(value).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
const percent=(done:number,total:number)=>total?Math.round(done/total*100):0;
export default function RecordsPage(){
 const {id}=useParams();const [rows,setRows]=useState<TrainingSession[]>([]),[detail,setDetail]=useState<TrainingSession|null>(null),[error,setError]=useState(''),[warning,setWarning]=useState(''),[date,setDate]=useState(''),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let alive=true;setLoading(true);setError('');setDetail(null);
 void combinedRecords(id?'':date).then(async result=>{if(!alive)return;setRows(result.rows);setWarning(result.warning);
 if(id){let r=result.rows.find(r=>r.id===id);if(!r)r=await recordRequest('get',{id});if(alive)setDetail(r!)}
 }).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)});
 return()=>{alive=false};
 },[id,refresh,date]);
 const filtered=rows.filter(r=>!date||r.started_at.slice(0,10)===date),summary=summarize(filtered);
 const totalSteps=filtered.reduce((n,r)=>n+r.total_steps,0),completedSteps=filtered.reduce((n,r)=>n+r.completed_steps,0);
 const refreshButton=<button className="record-refresh" type="button" aria-label="운동 기록 새로고침" title="새로고침" disabled={loading} onClick={()=>setRefresh(n=>n+1)}><RotateCw size={23} className={loading?'is-spinning':''}/></button>;
 return <main className="content-page records-page">
 <header className="records-heading"><div><span>나의 운동</span><h1>운동 기록 통계</h1></div>{refreshButton}</header>
 {loading&&<p className="record-loading" role="status">기록을 불러오는 중입니다.</p>}{warning&&<p className="sync-notice record-warning" role="status">{warning}</p>}{error&&<p role="alert" className="error-banner">{error}</p>}
 {detail?<RecordDetail detail={detail} onImported={()=>setRefresh(n=>n+1)} onError={setError}/>:
 <><section className="record-filter"><label htmlFor="record-date"><CalendarDays size={20}/>날짜로 보기</label><input id="record-date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>{date&&<button type="button" onClick={()=>setDate('')}>전체 보기</button>}</section>
 <section className="record-summary" aria-label="운동 기록 요약">
  <article><span>총 운동 횟수</span><strong>{filtered.length}<small>회</small></strong></article>
  <article><span>끝까지 완료</span><strong>{filtered.filter(r=>r.status==='completed').length}<small>회</small></strong></article>
  <article><span>단계 완료율</span><strong>{percent(completedSteps,totalSteps)}<small>%</small></strong></article>
 </section>
 {summary.length>0&&<section className="exercise-summary"><div className="record-section-title"><h2>운동별 통계</h2><span>운동마다 얼마나 완료했는지 확인하세요.</span></div><div className="exercise-summary-grid">{summary.map(item=><article key={item.step_id+item.mode}><div><strong>{item.name}</strong><span>{item.n}회 진행</span></div><b>{percent(item.completed,item.n)}% 완료</b><progress max={100} value={percent(item.completed,item.n)}/></article>)}</div></section>}
 <section className="recent-records"><div className="record-section-title"><h2>최근 운동 기록</h2><span>{date?dateText(date+'T00:00:00'):'전체 날짜'}</span></div>
 {!filtered.length&&!loading?<div className="record-empty"><CheckCircle2 size={38}/><strong>아직 운동 기록이 없습니다.</strong><span>운동을 완료하면 여기에 표시됩니다.</span></div>:
 <div className="record-card-list">{filtered.map(r=>{const progress=percent(r.completed_steps,r.total_steps);return <Link className="record-card" to={'/records/'+r.id} key={r.id}><div className="record-card-main"><span>{dateText(r.started_at)} · {timeText(r.started_at)}</span><strong>{r.course_name||'기본 운동'}</strong><small>{r.completed_steps}/{r.total_steps}단계 완료</small></div><div className="record-card-result"><span className={'record-status status-'+r.status}>{statusLabel[r.status]||r.status}</span><b>{progress}%</b><ChevronRight size={22}/></div><progress max={100} value={progress}/></Link>})}</div>}
 </section></>}
 </main>
}
function RecordDetail({detail,onImported,onError}:{detail:TrainingSession;onImported:()=>void;onError:(message:string)=>void}){
 const progress=percent(detail.completed_steps,detail.total_steps);
 return <section className="record-detail"><Link className="record-back" to="/records">← 기록 목록</Link>
 <div className="record-detail-hero"><div><span>{dateText(detail.started_at)} · {timeText(detail.started_at)}</span><h2>{detail.course_name||'기본 운동'}</h2></div><span className={'record-status status-'+detail.status}>{statusLabel[detail.status]||detail.status}</span></div>
 <div className="record-detail-summary"><article><Clock3 size={22}/><span>운동 시간</span><strong>{Math.round(detail.total_duration_seconds)}초</strong></article><article><CheckCircle2 size={22}/><span>완료 단계</span><strong>{detail.completed_steps}/{detail.total_steps}</strong></article><article><span>전체 진행률</span><strong>{progress}%</strong><progress max={100} value={progress}/></article></div>
 {!detail.owner_id&&<button className="record-account-save" onClick={()=>void importLocalRecord(detail).then(onImported).catch(e=>onError(e.message))}>계정 기록에 추가</button>}
 <div className="record-section-title"><h2>운동 결과</h2><span>단계별 완료 여부를 확인하세요.</span></div>
 <div className="step-result-list">{detail.steps?.map(step=><article key={step.step_id}><div><strong>{step.step_name}</strong><span>{step.duration_seconds.toFixed(1)}초</span></div><span className={'step-result '+(step.completion_status==='COMPLETED'?'done':step.completion_status==='SKIPPED'?'skipped':'pending')}>{step.completion_status==='COMPLETED'?'완료':step.completion_status==='SKIPPED'?'건너뜀':'미완료'}</span><small>{step.success_count}/{step.target_count}회 진행</small></article>)}</div>
 </section>
}
