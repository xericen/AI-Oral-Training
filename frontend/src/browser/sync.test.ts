import {afterEach,describe,expect,it,vi} from 'vitest';
import {recordRequest} from './sync';

afterEach(()=>vi.unstubAllGlobals());

describe('Training record server errors',()=>{
 it('keeps the server reason instead of replacing it with a generic retry message',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,text:async()=>JSON.stringify({code:503,data:{message:'MySQL 저장소에 연결하지 못했습니다.'}})})));
  await expect(recordRequest('list')).rejects.toThrow('MySQL 저장소에 연결하지 못했습니다.');
 });
 it('explains a non-JSON server failure',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,text:async()=>'<html>error</html>'})));
  await expect(recordRequest('list')).rejects.toThrow('기록 서버에 연결하지 못했습니다.');
 });
});
