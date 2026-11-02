import {useEffect,useRef,useState} from 'react';
export const speechRecognitionSupported=()=>typeof window!=='undefined'&&!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);
export function useSpeech(onText:(text:string)=>void,enabled:boolean,step:string){
 const recognizer=useRef<any>(null),callback=useRef(onText);callback.current=onText;
 const [listening,setListening]=useState(false),[error,setError]=useState(''),[transcript,setTranscript]=useState('');
 const supported=speechRecognitionSupported();
 function stop(){const r=recognizer.current;recognizer.current=null;r?.abort();setListening(false)}
 useEffect(()=>{stop();setTranscript('');return stop},[step,enabled]);
 function listen(){
  if(!enabled||listening)return;setError('');
  const C=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  if(!C){setError('이 브라우저는 음성 텍스트 인식을 지원하지 않습니다. 시간 안내로 전환하세요.');return}
  let accepted=false;const r=new C();recognizer.current=r;r.lang='ko-KR';r.continuous=false;r.interimResults=false;
  r.onstart=()=>{if(recognizer.current===r)setListening(true)};
  r.onresult=(event:any)=>{if(recognizer.current!==r)return;const result=event.results[event.resultIndex];if(!result?.isFinal||accepted)return;accepted=true;
   const text=result[0].transcript;setTranscript(text);
   if(result[0].confidence>=.5)callback.current(text);else setError('음성 결과가 불확실합니다. 다시 말하거나 시간 안내로 진행하세요.');
  };
  r.onerror=(event:any)=>{if(recognizer.current!==r)return;setError('음성 인식 실패 ('+event.error+'). 마이크 권한·한국어 서비스 지원을 확인하거나 시간 안내로 전환하세요.');setListening(false)};
  r.onend=()=>{if(recognizer.current===r){recognizer.current=null;setListening(false)}};
  try{r.start()}catch{setListening(false);setError('마이크를 시작하지 못했습니다. 시간 안내로 전환할 수 있습니다.')}
 }
 return {supported,listening,error,transcript,listen,stop};
}
