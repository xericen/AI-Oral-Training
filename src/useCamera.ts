import {useCallback,useEffect,useRef,useState} from 'react';
export function useCamera(){
 const video=useRef<HTMLVideoElement>(null);const stream=useRef<MediaStream|null>(null);const generation=useRef(0);
 const [active,setActive]=useState(false);const [starting,setStarting]=useState(false);const [error,setError]=useState('');
 const onStop=useRef<()=>void>(()=>{});
 const stop=useCallback(()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;setActive(false);setStarting(false);onStop.current()},[]);
 const start=useCallback(async()=>{if(stream.current)return;const g=++generation.current;setStarting(true);setError('');
 try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('카메라는 HTTPS 또는 localhost에서 사용할 수 있습니다.');
 const media=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
 if(g!==generation.current){media.getTracks().forEach(t=>t.stop());return}stream.current=media;
 if(!video.current)throw new Error('카메라 화면을 찾을 수 없습니다.');video.current.srcObject=media;await video.current.play();
 if(g!==generation.current)return;media.getVideoTracks().forEach(t=>t.addEventListener('ended',stop));setActive(true);
 }catch(e){if(g!==generation.current)return;const name=(e as DOMException|undefined)?.name;stop();setError(name==='NotAllowedError'?'카메라 권한이 필요합니다. 브라우저 설정에서 카메라를 허용해 주세요.':name==='NotFoundError'?'사용 가능한 카메라를 찾을 수 없습니다.':String((e as Error).message));}
 finally{if(g===generation.current)setStarting(false)}},[stop]);
 useEffect(()=>()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());if(video.current)video.current.srcObject=null},[]);
 return {video,active,starting,error,start,stop,onStop};
}