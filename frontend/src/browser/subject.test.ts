import {describe,it,expect} from 'vitest';
import {selectCentralSubject,matchSubjectFace} from './subject';
import {extract,type Face} from './features';
import {decode} from './pose';

function pose(x:number,width=.24){const points=Array.from({length:17},()=>[x,.6,.99]);points[0]=[x,.28,.99];points[5]=[x-width/2,.52,.99];points[6]=[x+width/2,.52,.99];return points}
function face(x:number,y=.28):Face{const landmarks=Array.from({length:478},()=>[x,y,0]);landmarks[234]=[x-.05,y,0];landmarks[454]=[x+.05,y,0];return {landmarks,blendshapes:{jawOpen:.1},matrix:null}}
describe('Central person selection',()=>{
 it('selects only the central torso regardless of detection order',()=>{const center=pose(.5),left=pose(.18),right=pose(.82);for(const poses of [[left,right,center],[center,right,left]])expect(selectCentralSubject(poses,640,480)?.points).toBe(center)});
 it('chooses the nearer torso among multiple candidates in the center strip',()=>{const center=pose(.49),other=pose(.61);expect(selectCentralSubject([other,center],640,480)?.points).toBe(center)});
 it('does not adopt a bystander when the center is empty',()=>{expect(selectCentralSubject([pose(.2),pose(.8)],640,480)).toBeNull();expect(selectCentralSubject([],640,480)).toBeNull()});
 it('rejects missing, low-confidence and invalid anchors',()=>{for(const id of [0,5,6]){const p=pose(.5);p[id][2]=.1;expect(selectCentralSubject([p],640,480)).toBeNull()}const bad=pose(.5);bad[0][0]=NaN;expect(selectCentralSubject([bad],640,480)).toBeNull();expect(selectCentralSubject([[]],640,480)).toBeNull();expect(selectCentralSubject([pose(.5)],0,480)).toBeNull()});
 it('keeps the head crop square in pixels and inside portrait or landscape frames',()=>{for(const [w,h] of [[640,480],[480,640]]){const s=selectCentralSubject([pose(.5)],w,h)!;expect(s.crop.x).toBeGreaterThanOrEqual(0);expect(s.crop.y).toBeGreaterThanOrEqual(0);expect(s.crop.x+s.crop.side).toBeLessThanOrEqual(w);expect(s.crop.y+s.crop.side).toBeLessThanOrEqual(h)}});
 it('uses the same torso during head movement when shoulders stay in the center',()=>{const p=pose(.5);p[0][0]=.58;const s=selectCentralSubject([pose(.2),p],640,480)!;expect(s.points).toBe(p);expect(matchSubjectFace(s,[face(.58)],640,480)).not.toBeNull()});
 it('matches only the chosen person face and excludes unrelated faces',()=>{const s=selectCentralSubject([pose(.5)],640,480)!,center=face(.5);expect(matchSubjectFace(s,[face(.2),center,face(.8)],640,480)).toBe(center);expect(matchSubjectFace(s,[face(.2),face(.8)],640,480)).toBeNull()});
 it('fails closed for ambiguous, missing or malformed faces',()=>{const s=selectCentralSubject([pose(.5)],640,480)!;expect(matchSubjectFace(s,[face(.49),face(.51)],640,480)).toBeNull();expect(matchSubjectFace(s,[],640,480)).toBeNull();expect(matchSubjectFace(s,[{landmarks:[],blendshapes:{},matrix:null}],640,480)).toBeNull()});
 it('publishes one body/face to the existing metrics rather than all bystanders',()=>{const s=selectCentralSubject([pose(.2),pose(.5),pose(.8)],640,480)!,f=matchSubjectFace(s,[face(.2),face(.5),face(.8)],640,480)!;const m=extract({pose:[s.points],faces:[f],width:640,height:480,inference_ms:0});expect(m.person_count).toBe(1);expect(m.face_count).toBe(1);expect(m.center_x).toBeCloseTo(.5)});
 it('keeps a fourth, lower-score central candidate available to selection',()=>{const xs=[.1,.25,.8,.5],n=xs.length,data=new Float32Array(56*n);for(let i=0;i<n;i++){data[i]=xs[i]*320;data[n+i]=160;data[2*n+i]=25;data[3*n+i]=200;data[4*n+i]=.95-i*.1;const pts=pose(xs[i],.07);for(let j=0;j<17;j++){data[(5+3*j)*n+i]=pts[j][0]*320;data[(6+3*j)*n+i]=pts[j][1]*320;data[(7+3*j)*n+i]=.99}}const poses=decode(data,[1,56,n],640,640,.5,0,0);expect(poses).toHaveLength(4);expect(selectCentralSubject(poses,640,640)?.nose[0]).toBeCloseTo(.5)});
});
