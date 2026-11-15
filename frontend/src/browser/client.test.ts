import {afterEach,describe,expect,it,vi} from 'vitest';
import {getSharedBrowserVision,preloadBrowserVision,resetSharedBrowserVision} from './client';

describe('shared browser vision lifecycle',()=>{
 afterEach(()=>resetSharedBrowserVision());

 it('reuses one prepared client during the same app session',()=>{
  expect(getSharedBrowserVision()).toBe(getSharedBrowserVision());
 });

 it('creates a fresh client only when the user explicitly reloads models',()=>{
  const first=getSharedBrowserVision();resetSharedBrowserVision();
  expect(getSharedBrowserVision()).not.toBe(first);
 });

 it('prepares the shared client in the background before training opens',async()=>{
  const client=getSharedBrowserVision(),initialize=vi.spyOn(client,'initialize').mockResolvedValue();
  await preloadBrowserVision();
  expect(initialize).toHaveBeenCalledOnce();
  expect(getSharedBrowserVision()).toBe(client);
 });
});
