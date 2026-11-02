import {describe,expect,it} from 'vitest';
import {upperBodyPointIds,upperBodySegments,visiblePosePoint} from './overlay';

function pose(){return Array.from({length:17},()=>[.5,.5,0]);}

describe('upper-body overlay',()=>{
 it('shows lower-confidence arms without treating face keypoints as body',()=>{
  const points=pose();points[0]=[.5,.2,.99];points[5]=[.4,.4,.9];points[6]=[.6,.4,.9];points[7]=[.35,.55,.3];points[9]=[.3,.7,.3];
  expect(upperBodyPointIds(points)).toEqual([5,6,7,9]);
  expect(upperBodySegments(points)).toEqual(expect.arrayContaining([{from:5,to:7,strong:false},{from:7,to:9,strong:false}]));
  expect(upperBodyPointIds(points)).not.toContain(0);
 });

 it('draws only actually detected torso joints and never invents missing points',()=>{
  const points=pose();points[5]=[.4,.4,.9];points[6]=[.6,.4,.9];points[11]=[.43,.8,.7];points[12]=[.57,.8,.7];
  expect(upperBodySegments(points)).toEqual(expect.arrayContaining([{from:5,to:11,strong:true},{from:6,to:12,strong:true},{from:11,to:12,strong:true}]));
  points[11][2]=.1;points[12][2]=.1;
  expect(upperBodySegments(points).some(segment=>segment.from===11||segment.to===11||segment.from===12||segment.to===12)).toBe(false);
 });

 it('rejects off-screen and invalid detections',()=>{
  expect(visiblePosePoint([1.2,.5,.9])).toBe(false);
  expect(visiblePosePoint([.5,.5,Number.NaN])).toBe(false);
 });
});
