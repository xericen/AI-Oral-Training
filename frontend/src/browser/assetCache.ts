export const assetCachePrefix='oral-ai-assets-';
type CacheStore=Pick<CacheStorage,'open'|'keys'|'delete'>;

const defaultStore=()=>typeof caches==='undefined'?undefined:caches;
async function bytes(response:Response,url:string){if(!response.ok)throw Error(`AI 자산을 불러오지 못했습니다: ${url} (${response.status})`);return new Uint8Array(await response.arrayBuffer())}

export async function loadCachedAsset(url:string,version:string,store:CacheStore|undefined=defaultStore(),fetcher:typeof fetch=fetch){
 if(!store)return bytes(await fetcher(url),url);
 const cache=await store.open(assetCachePrefix+version),hit=await cache.match(url);
 if(hit)return bytes(hit,url);
 const response=await fetcher(url,{cache:'no-store'});if(!response.ok)throw Error(`AI 자산을 불러오지 못했습니다: ${url} (${response.status})`);
 await cache.put(url,response.clone());return bytes(response,url);
}

export async function removeOldAssetCaches(version:string,store:CacheStore|undefined=defaultStore()){
 if(!store)return;const current=assetCachePrefix+version;
 await Promise.all((await store.keys()).filter(key=>key.startsWith(assetCachePrefix)&&key!==current).map(key=>store.delete(key)));
}
