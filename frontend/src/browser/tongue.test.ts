import {describe,expect,it} from 'vitest';
import {mouthBounds,tongueClasses} from './tongue';

describe('Tongue direction inference boundary',()=>{
 it('keeps the seven training labels in export order',()=>expect(tongueClasses).toEqual(['mouth_closed','mouth_open','tongue_down','tongue_left','tongue_middle','tongue_right','tongue_up']));
 it('extracts a padded square mouth ROI inside the source frame',()=>{
  const landmarks=Array.from({length:478},()=>[.5,.5,0]);
  landmarks[61]=[.4,.5,0];landmarks[291]=[.6,.5,0];landmarks[13]=[.5,.46,0];landmarks[14]=[.5,.56,0];
  landmarks[0]=[.5,.43,0];landmarks[17]=[.5,.58,0];landmarks[78]=[.42,.5,0];landmarks[82]=[.47,.47,0];landmarks[87]=[.47,.55,0];landmarks[308]=[.58,.5,0];landmarks[312]=[.53,.47,0];landmarks[317]=[.53,.55,0];
  const bounds=mouthBounds(landmarks,640,480)!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(640);expect(bounds.y+bounds.height).toBeLessThanOrEqual(480);
  expect(bounds.width).toBeGreaterThan(128);
 });
 it('rejects incomplete landmarks',()=>expect(mouthBounds([],640,480)).toBeNull());
});
