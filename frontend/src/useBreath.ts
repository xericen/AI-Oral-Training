import {useCallback,useEffect,useRef,useState} from 'react';
import {BreathDetector,soundFeatures} from './browser/breath';

export function useBreath(onDetected:(id:string,duration:number)=>void,enabled:boolean,stepId:string,rule:string){
 const [status,setStatus]=useState('마이크 대기'),[error,setError]=useState(''),[level,setLevel]=useState(0),[listening,setListening]=useState(false);
 const callback=useRef(onDetected);callback.current=onDetected;
 const resources=useRef<{context:AudioContext;stream:MediaStream|null;source:MediaStreamAudioSourceNode|null;timer:ReturnType<typeof setInterval>|null}|null>(null),epoch=useRef(0),active=useRef(enabled);active.current=enabled;
 const stop=useCallback(()=>{epoch.current++;const r=resources.current;resources.current=null;if(r){if(r.timer)clearInterval(r.timer);r.source?.disconnect();r.stream?.getTracks().forEach(t=>t.stop());void r.context.close().catch(()=>{})}setListening(false);setLevel(0)},[]);
 const start=useCallback(async()=>{
 stop();const generation=epoch.current;if(!active.current)return;
 setError('');setStatus('마이크 연결 중…');
 if(!navigator.mediaDevices?.getUserMedia||typeof AudioContext==='undefined'){setError('이 브라우저에서는 숨소리 감지를 사용할 수 없습니다.');return}
 const context=new AudioContext(),r={context,stream:null as MediaStream|null,source:null as MediaStreamAudioSourceNode|null,timer:null as ReturnType<typeof setInterval>|null};resources.current=r;
 try{
 await context.resume();if(generation!==epoch.current||!active.current)return;if(context.state!=='running')throw Error('마이크 켜기를 눌러 소리 분석을 시작해 주세요.');
 const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
 if(generation!==epoch.current||!active.current){stream.getTracks().forEach(t=>t.stop());return}
 r.stream=stream;const analyser=context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0;r.source=context.createMediaStreamSource(stream);r.source.connect(analyser);
 const wave=new Float32Array(analyser.fftSize),spectrum=new Float32Array(analyser.frequencyBinCount),detector=new BreathDetector(rule==='BREATH_IN'?.4:.7);setListening(true);
 const fail=()=>{if(generation!==epoch.current)return;stop();setError('마이크 연결이 중단되었습니다. 다시 켜 주세요.')};
 stream.getAudioTracks().forEach(track=>track.addEventListener('ended',fail,{once:true}));
 r.timer=setInterval(()=>{if(generation!==epoch.current||!active.current)return;if(context.state!=='running'||stream.getAudioTracks().some(t=>t.readyState!=='live'||t.muted)){fail();return}
 analyser.getFloatTimeDomainData(wave);analyser.getFloatFrequencyData(spectrum);const result=detector.push(soundFeatures(wave,spectrum,context.sampleRate),performance.now()/1000);setStatus(result.message);setLevel(result.level);
 if(result.duration!==undefined){callback.current(stepId,result.duration);stop()}
 },50);
 }catch(err){if(generation!==epoch.current)return;stop();setError((err as Error).name==='NotAllowedError'?'마이크 권한을 허용한 뒤 다시 켜 주세요.':(err as Error).message||'마이크를 연결하지 못했습니다.')}
 },[stop,stepId,rule]);
 useEffect(()=>{if(enabled)void start();else stop();return stop},[enabled,start,stop]);
 return {status,error,level,listening,start,stop};
}
