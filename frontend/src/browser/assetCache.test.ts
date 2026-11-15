import {describe,expect,it,vi} from 'vitest';
import {assetCachePrefix,loadCachedAsset,removeOldAssetCaches} from './assetCache';

function store(){const cachesByName=new Map<string,Map<string,Response>>();return {cachesByName,api:{open:vi.fn(async(name:string)=>{const values=cachesByName.get(name)||new Map<string,Response>();cachesByName.set(name,values);return {match:async(url:string)=>values.get(url)?.clone(),put:async(url:string,response:Response)=>{values.set(url,response.clone())}}}),keys:async()=>[...cachesByName.keys()],delete:async(name:string)=>cachesByName.delete(name)}}}

describe('persistent AI asset cache',()=>{
 it('downloads an asset once and reuses it after a simulated refresh',async()=>{const fake=store(),fetcher=vi.fn(async()=>new Response(new Uint8Array([1,2,3])));expect([...await loadCachedAsset('https://app/model.onnx','v1',fake.api as never,fetcher as never)]).toEqual([1,2,3]);expect([...await loadCachedAsset('https://app/model.onnx','v1',fake.api as never,fetcher as never)]).toEqual([1,2,3]);expect(fetcher).toHaveBeenCalledTimes(1)});
 it('downloads again only for a new version and removes the old cache',async()=>{const fake=store(),fetcher=vi.fn(async()=>new Response(new Uint8Array([4])));await loadCachedAsset('https://app/model.onnx','v1',fake.api as never,fetcher as never);await loadCachedAsset('https://app/model.onnx','v2',fake.api as never,fetcher as never);expect(fetcher).toHaveBeenCalledTimes(2);await removeOldAssetCaches('v2',fake.api as never);expect([...fake.cachesByName.keys()]).toEqual([assetCachePrefix+'v2'])});
});
