import type {TrainingSession} from '../types';
import {listRecords as localList} from './records';
const endpoint='/wiz/api/page.capstone/training_records';
export async function recordRequest(action:string,data:object={}):Promise<any>{
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try {
  const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action,data:JSON.stringify(data)}),signal:controller.signal});
  const text=await response.text();let body:any;
  try{body=JSON.parse(text)}catch{throw new Error(response.ok?'서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.':'기록 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')}
  if(!response.ok||body.code!==200)throw new Error(body.data?.message||body.message||'서버 기록 요청에 실패했습니다.');
  return body.data;
 }catch(error){
  if((error as Error).name==='AbortError')throw new Error('기록 서버 응답이 늦습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.');
  throw error;
 }finally{clearTimeout(timer)}
}
let owner:string|null=null;
export async function identify(){try{const r=await recordRequest('identity');owner=r.user_id;return owner}catch{owner=null;return null}}
const pending=new Map<string,TrainingSession>();let timer:ReturnType<typeof setTimeout>|null=null;let flight:Promise<void>|null=null;let lastError:Error|null=null;
export function queueRecord(record:TrainingSession,force=false){
 if(!record.owner_id)return;pending.set(record.id,structuredClone(record));
 if(force){void flushRecords();return}
 if(!timer)timer=setTimeout(()=>{timer=null;void flushRecords()},2500);
}
export async function flushRecords(){
 if(flight)return flight;
 flight=(async()=>{await identify();if(!owner)return;
 for(let attempt=0;attempt<20;attempt++){
  const entry=[...pending].find(([,row])=>row.owner_id===owner);if(!entry)break;const [id,row]=entry;
  try{
   await recordRequest('save',{...row,analysis:undefined,calibration:undefined});
   if(pending.get(id)?.revision===row.revision)pending.delete(id);
   lastError=null;window.dispatchEvent(new CustomEvent('oral-sync',{detail:{error:'',pending:pending.size}}));
  }catch(e){lastError=e as Error;window.dispatchEvent(new CustomEvent('oral-sync',{detail:{error:lastError.message,pending:pending.size}}));break}
 }
 })().finally(()=>{flight=null;if(pending.size&&!timer)timer=setTimeout(()=>{timer=null;void flushRecords()},15000)});return flight;
}
export async function retryRecords(){
 const id=await identify();if(!id)throw Error('로그인 상태를 확인한 뒤 다시 시도해 주세요.');
 const rows=await localList();for(const row of rows)if(row.owner_id===id)pending.set(row.id,row);
 lastError=null;await flushRecords();
 if(pending.size)throw lastError||Error('서버 저장이 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.');
}
export async function importLocalRecord(record:TrainingSession){
 const id=await identify();if(!id)throw Error('로그인 후 가져올 수 있습니다.');
 if(record.owner_id&&record.owner_id!==id)throw Error('다른 계정의 로컬 기록입니다.');
 const row={...record,owner_id:id,revision:(record.revision||0)+1};
 await recordRequest('save',{...row,analysis:undefined,calibration:undefined});
}
export async function combinedRecords(date=''){
 const id=await identify(),local=(await localList()).filter(r=>!r.owner_id||r.owner_id===id);
 if(!id)return {rows:local,warning:'비로그인 상태: 이 브라우저의 로컬 기록만 표시합니다.',user:null};
 try {const response=await recordRequest('list',{date});const map=new Map<string,TrainingSession>(local.map(r=>[r.id,r]));for(const r of response.records as TrainingSession[]){const l=map.get(r.id);if(!l||(l.revision||0)<=(r.revision||0))map.set(r.id,{...r,sync_status:'synced'})}
 return {rows:[...map.values()].sort((a,b)=>b.started_at.localeCompare(a.started_at)),warning:'',user:id};
 }catch(e){return {rows:local,warning:(e as Error).message,user:id}}
}
