const embedded = window.parent !== window;
export const apiBase = localStorage.getItem('oral-api-base') || (embedded ? 'http://127.0.0.1:8000' : '');
const serverURL = new URL(apiBase || location.origin, location.origin);
export const isLoopbackServer = ['localhost','127.0.0.1','[::1]'].includes(serverURL.hostname);
export const needsLocalPermission = location.protocol === 'https:' && isLoopbackServer;
export const localTrainingURL = new URL('/#/training', serverURL).href;

export async function localPermissionState(): Promise<PermissionState> {
 if (!navigator.permissions?.query) return 'prompt';
 try {
  // Use the granular name. The legacy combined query can crash old Chromium.
  return (await navigator.permissions.query({name:'loopback-network' as PermissionName})).state;
 } catch { return 'prompt'; }
}

export async function api<T>(path:string,body?:unknown):Promise<T>{
 const init:RequestInit & {targetAddressSpace?:'loopback'} = {method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)};
 if(needsLocalPermission)init.targetAddressSpace='loopback';
 const response=await fetch(apiBase+path,init);
 const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'서버 요청에 실패했습니다.');return data;
}
export function socketURL(id:string){const url=new URL(apiBase||location.origin,location.origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.pathname='/ws/training/'+id;return url.href}
