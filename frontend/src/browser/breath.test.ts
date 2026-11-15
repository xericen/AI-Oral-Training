import {describe,it,expect} from 'vitest';
import {BreathDetector,soundFeatures,type SoundFrame} from './breath';
const quiet:SoundFrame={rms:.001,flatness:.5,bandRatio:.8,voicing:.1};
const breath:SoundFrame={rms:.04,flatness:.5,bandRatio:.8,voicing:.2};
function harness(min=.4){let now=0;const detector=new BreathDetector(min);const outputs:ReturnType<BreathDetector['push']>[]=[];
 const feed=(f:SoundFrame,seconds:number)=>{for(let i=0;i<Math.round(seconds/.05);i++){outputs.push(detector.push(f,now));now+=.05}};
 feed(quiet,1.8);return {feed,outputs,detector,jump:()=>{now+=1},count:()=>outputs.filter(x=>x.duration!==undefined)};
}
describe('Experimental breath-like audio gate',()=>{
 it('completes after a sustained burst and quiet ending, only once',()=>{const h=harness();h.feed(breath,.6);expect(h.count()).toHaveLength(0);h.feed(quiet,.4);expect(h.count()).toHaveLength(1);h.feed(breath,1);h.feed(quiet,.4);expect(h.count()).toHaveLength(1)});
 it('requires a longer exhale candidate',()=>{const h=harness(.7);h.feed(breath,.5);h.feed(quiet,.5);expect(h.count()).toHaveLength(0);h.feed(breath,1);h.feed(quiet,.4);expect(h.count()).toHaveLength(1)});
 it.each([quiet,{...breath,rms:.003},{...breath,flatness:.02},{...breath,voicing:.9},{...breath,bandRatio:.1},{...breath,rms:.8}])('rejects silence, low level, tonal/voiced/low-band/clipping signals %o',f=>{const h=harness();h.feed(f,2);h.feed(quiet,.5);expect(h.count()).toHaveLength(0)});
 it('rejects clicks, continuous noise and speech-contaminated bursts',()=>{const h=harness();h.feed(breath,.1);h.feed(quiet,.5);h.feed(breath,.5);h.feed({...breath,voicing:.9},.1);h.feed(breath,.5);h.feed(quiet,.5);expect(h.count()).toHaveLength(0);h.feed(breath,7);h.feed(quiet,.5);expect(h.count()).toHaveLength(0)});
 it('requires initial quiet and calibrates background level',()=>{let t=0;const d=new BreathDetector(.4);for(let i=0;i<80;i++){expect(d.push(breath,t).duration).toBeUndefined();t+=.05}});
 it('does not join bursts across processing gaps or invalid samples',()=>{const h=harness();h.feed(breath,.3);h.jump();h.feed(breath,.3);h.feed(quiet,.5);expect(h.count()).toHaveLength(0);h.feed(breath,.3);h.feed({...breath,rms:NaN},.05);h.feed(breath,.3);h.feed(quiet,.5);expect(h.count()).toHaveLength(0)});
 it('extracts periodic voice separately from broadband noise',()=>{const wave=Float32Array.from({length:2048},(_,i)=>.05*Math.sin(2*Math.PI*200*i/48000));const spectrum=new Float32Array(1024).fill(-90);spectrum[20]=-20;const f=soundFeatures(wave,spectrum,48000);expect(f.rms).toBeGreaterThan(.03);expect(f.voicing).toBeGreaterThan(.9);expect(f.flatness).toBeLessThan(.18)});
});
