/** Experimental breath-like sound detector, not a respiratory phase classifier. */
export interface SoundFrame {rms:number;flatness:number;bandRatio:number;voicing:number}
export function soundFeatures(wave:Float32Array,spectrum:Float32Array,sampleRate:number):SoundFrame{
 let square=0;for(const v of wave)square+=v*v;const rms=Math.sqrt(square/wave.length);
 let sum=0,log=0,count=0,total=0;
 for(let i=1;i<spectrum.length;i++){const hz=i*sampleRate/(spectrum.length*2),power=10**(spectrum[i]/10);if(hz>=80&&hz<=8000)total+=power;if(hz>=250&&hz<=6000){const p=Math.max(1e-12,power);sum+=p;log+=Math.log(p);count++}}
 let voicing=0;const maxLag=Math.min(Math.floor(sampleRate/80),wave.length/2);
 if(square>1e-10)for(let lag=Math.floor(sampleRate/400);lag<=maxLag;lag+=2){let xy=0,xx=0,yy=0;for(let i=0;i<wave.length-lag;i+=2){xy+=wave[i]*wave[i+lag];xx+=wave[i]**2;yy+=wave[i+lag]**2}voicing=Math.max(voicing,xy/Math.sqrt(Math.max(1e-20,xx*yy)))}
 return {rms,flatness:count&&sum?Math.exp(log/count)/(sum/count):0,bandRatio:total?sum/total:0,voicing};
}
export class BreathDetector{
 private noise:number[]=[];private started:number|null=null;private last:number|null=null;private quiet=0;private armed=false;private length=0;private endQuiet=0;private blocked=false;private done=false;
 constructor(private minimum:number){}
 push(f:SoundFrame,now:number):{message:string;level:number;duration?:number}{
 const out=(message:string,duration?:number)=>({message,level:Number.isFinite(f.rms)?Math.min(1,f.rms/.1):0,duration});
 if(![f.rms,f.flatness,f.bandRatio,f.voicing,now].every(Number.isFinite)){this.armed=false;this.length=0;this.quiet=0;this.last=null;return out('마이크 신호를 다시 확인해 주세요.')}
 if(this.done)return out('숨소리를 감지했습니다.');
 if(this.started===null)this.started=now;
 const gap=this.last===null?0:now-this.last;this.last=now;
 if(gap<0||gap>.2){this.armed=false;this.length=0;this.quiet=0;this.endQuiet=0;return out('분석이 지연되어 다시 듣습니다.')}
 if(now-this.started<1.2){this.noise.push(f.rms);return out('주변 소음 측정 중 · 잠시 조용히 해 주세요.')}
 const sorted=[...this.noise].sort((a,b)=>a-b),floor=sorted[Math.floor(sorted.length*.5)]??.002,threshold=Math.max(.008,floor*3);
 const quiet=f.rms<threshold*.65;
 if(!this.armed){this.quiet=quiet?this.quiet+gap:0;if(this.quiet>=.3){this.armed=true;this.blocked=false}return out('안내에 맞춰 홉 / 후— 하고 호흡하세요.')}
 const candidate=f.rms>=threshold&&f.rms<.6&&f.flatness>=.18&&f.bandRatio>=.5&&f.voicing<.65;
 if(candidate&&!this.blocked){this.length+=gap;this.endQuiet=0;if(this.length>6){this.blocked=true;this.length=0}return out('숨소리 후보 감지 중…')}
 if(quiet){if(this.length===0&&!this.blocked)return out('안내에 맞춰 홉 / 후— 하고 호흡하세요.');this.endQuiet+=gap;if(this.endQuiet>=.2){const duration=this.length,valid=!this.blocked;this.length=0;this.armed=true;this.blocked=false;this.quiet=0;this.endQuiet=0;if(valid&&duration>=this.minimum){this.done=true;return out('숨소리 감지 완료',duration)}}}
 else {this.blocked=true;this.length=0;this.endQuiet=0}
 return out('숨소리를 기다립니다. 말소리·짧은 소음은 제외합니다.');
 }
}
