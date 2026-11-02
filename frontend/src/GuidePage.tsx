import {useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ChevronLeft,ChevronRight,Camera,BookOpen,Check,NotebookTabs,RefreshCw} from 'lucide-react';
const slides=[
 {title:'그림으로 배우는 훈련 방법',short:'시작 · 목차',lead:'카메라를 켜고, 그림을 따라 해 보세요.',hint:'아래 목차를 누르면 원하는 설명으로 바로 이동합니다.'},
 {title:'카메라를 켜 주세요',short:'카메라 켜기',lead:'훈련하기 → Webcam → 카메라 허용',hint:'밝은 곳에서 혼자 앉아 주세요. 처음에는 AI 준비가 끝날 때까지 기다려 주세요.'},
 {title:'정면을 보고 편안하게 앉으세요',short:'준비자세',lead:'얼굴과 양쪽 어깨가 보이면 충분해요.',hint:'상반신이 화면 가운데 오도록 앉고 입을 편안히 다문 채 2초간 기다리세요.'},
 {title:'입을 벌리고 2초간 유지하세요',short:'입 벌리기',lead:'벌리기 → 2초 유지 → 다물고 쉬기',hint:'횟수가 올라가면 입을 다물어 주세요. 같은 방법으로 총 3회 반복합니다.'},
 {title:'입술을 모으고 2초간 유지하세요',short:'입술 오므리기',lead:'오므리기 → 2초 유지 → 힘 풀기',hint:'입술을 앞으로 모아 주세요. 횟수가 올라가면 힘을 풀고, 총 3회 반복합니다.'},
 {title:'끝나면 결과가 자동으로 저장돼요',short:'완료 · 기록',lead:'마지막 동작 완료 → 기록 화면 확인',hint:'중간에 멈추려면 Webcam을 다시 누르세요. 카메라가 꺼지고, 진행 중 기록은 미완료로 남습니다.'},
 {title:'잘 안 되면 이렇게 해 보세요',short:'문제 해결',lead:'카메라 위치와 화면 안내를 확인해 주세요.',hint:'다음 버튼을 따로 누를 필요는 없습니다. 조건을 만족하면 자동으로 진행합니다.'},
];
function Person({mouth='neutral',body=false}:{mouth?:string;body?:boolean}){
 return <g><path d="M105 159 Q180 126 255 159 L277 286H83Z" fill="#fff" stroke="#639c98" strokeWidth="3"/><path d="M112 169 91 264M248 169l21 95" stroke="#e7bda4" strokeWidth="23" strokeLinecap="round"/><ellipse cx="180" cy="88" rx="51" ry="61" fill="#f0cfb5"/><path d="M130 80q-8-82 55-69 47 8 48 64l-25-28-16-10-18 25Z" fill="#58636e"/><path d="M143 36q27-33 60-5" stroke="#b0b7b8" strokeWidth="9" strokeLinecap="round"/><circle cx="162" cy="84" r="4" fill="#203d47"/><circle cx="199" cy="84" r="4" fill="#203d47"/><path d="m180 91-4 13h9" fill="none" stroke="#ba927b" strokeWidth="3" strokeLinecap="round"/>{mouth==='open'?<><ellipse cx="180" cy="122" rx="18" ry="23" fill="#713e43"/><path d="M166 106h28v9h-28Z" fill="#fff"/></>:mouth==='pucker'?<ellipse cx="180" cy="120" rx="10" ry="8" fill="#b96769" stroke="#85484e" strokeWidth="3"/>:<path d="M166 120q14 7 28 0" fill="none" stroke="#9b5a5f" strokeWidth="4" strokeLinecap="round"/>}{body&&<g stroke="#259d8c" fill="none" strokeWidth="3" strokeDasharray="7 7"><path d="M180 12v279M95 169h170M98 272h164"/></g>}</g>
}
function Illustration({index}:{index:number}){
 if(index===0)return <div className="guide-cover-art" aria-hidden="true"><BookOpen size={80}/><span>보고 · 따라 하고 · 확인해요</span><div><Camera/><ChevronRight/><Check/><ChevronRight/><NotebookTabs/></div></div>;
 if(index===5)return <div className="guide-cover-art" aria-hidden="true"><span className="guide-check"><Check size={70}/></span><strong>훈련 완료</strong><div className="guide-record-example"><NotebookTabs size={30}/><span>나의 훈련 기록</span></div><small>화면 예시 · 실제 결과는 완료 후 표시됩니다</small></div>;
 if(index===6)return <div className="guide-help-art" aria-hidden="true"><Camera size={64}/><span>권한 허용</span><RefreshCw size={54}/><span>위치 조절 · 다시 준비</span></div>;
 return <svg className="guide-person-art" viewBox="0 0 360 330" aria-hidden="true"><rect x="22" y="5" width="316" height="294" rx="28" fill="#dff1ee"/><Person mouth={index===3?'open':index===4?'pucker':'neutral'} body={index<=2}/>{index===1&&<g><rect x="204" y="249" width="128" height="45" rx="22" fill="#137b73"/><text x="268" y="277" fill="white" textAnchor="middle" fontSize="18" fontWeight="700">Webcam</text></g>}{(index===3||index===4)&&<g><circle cx="286" cy="62" r="36" fill="white" stroke="#137b73" strokeWidth="3"/><text x="286" y="69" textAnchor="middle" fontSize="22" fill="#137b73" fontWeight="700">2초</text><rect x="109" y="280" width="142" height="38" rx="19" fill="#137b73"/><text x="180" y="305" textAnchor="middle" fontSize="18" fill="white">총 3회 반복</text></g>}</svg>
}
export default function GuidePage(){
 const [index,setIndex]=useState(0),touch=useRef<{x:number;y:number}|null>(null);
 const go=(next:number)=>setIndex(Math.max(0,Math.min(slides.length-1,next)));
 const slide=slides[index];
 return <main className="slide-guide">
 <header className="slide-guide-heading"><div><span>처음 사용하는 분을 위한 안내</span><h1>그림으로 보는 훈련 가이드</h1></div><Link className="primary-link" to="/training">훈련하러 가기 →</Link></header>
 <nav className="guide-contents" aria-label="가이드 목차">{slides.map((s,i)=><button key={s.short} type="button" aria-current={i===index?'step':undefined} onClick={()=>go(i)}><span>{i+1}</span>{s.short}</button>)}</nav>
 <section className="guide-slide" role="region" aria-roledescription="슬라이드" aria-label="훈련 사용법" tabIndex={0}
 onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();go(index+1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(index-1)}}}
 onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}}
 onTouchEnd={e=>{const start=touch.current;touch.current=null;if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)go(index+(dx<0?1:-1))}}>
 <div className="guide-slide-art"><Illustration index={index}/></div>
 <div className="guide-slide-copy" aria-live="polite" aria-atomic="true"><span className="guide-slide-number">{index+1} / {slides.length} · {slide.short}</span><h2>{slide.title}</h2><p className="guide-slide-lead">{slide.lead}</p><p className="guide-slide-hint">{slide.hint}</p>
 {index===0&&<div className="guide-cover-topics">{slides.slice(1).map((s,i)=><button key={s.short} type="button" onClick={()=>go(i+1)}>{i+2}. {s.short}<ChevronRight size={18}/></button>)}</div>}
 {index===1&&<p className="guide-slide-tip">별도 프로그램이나 분석 서버는 필요하지 않습니다.</p>}
 {index===2&&<p className="guide-slide-tip">허리 아래나 골반까지 화면에 나오지 않아도 됩니다.</p>}
 {index===5&&<p className="guide-slide-tip">기록은 현재 기기의 이 브라우저에만 보관됩니다. 사이트 데이터를 지우면 사라질 수 있습니다.</p>}
 {index===6&&<ul className="guide-troubleshooting"><li><strong>카메라가 안 켜져요</strong><span>사이트 설정에서 카메라를 허용하고, 카메라를 쓰는 다른 앱을 종료하세요.</span></li><li><strong>횟수가 안 올라가요</strong><span>2초 유지한 뒤 입 모양을 편안한 상태로 되돌려 주세요.</span></li><li><strong>분석 오류가 떠요</strong><span>인터넷 연결을 확인하고 카메라를 끈 뒤, 하단의 모델 다시 준비를 누르세요.</span></li></ul>}
 </div></section>
 <div className="guide-slide-controls"><button type="button" onClick={()=>go(index-1)} disabled={index===0}><ChevronLeft/>이전</button><p>목차 또는 이전·다음으로 넘겨 보세요.<span>휴대폰에서는 그림을 옆으로 밀어도 됩니다.</span></p><button type="button" className="guide-next" onClick={()=>go(index+1)} disabled={index===slides.length-1}>다음<ChevronRight/></button></div>
 <details className="guide-extra"><summary>영상·기록과 AI 분석에 대해 알아두세요</summary><p>카메라 영상은 브라우저 안에서만 분석하며 전송·저장하지 않습니다. YOLO(욜로)는 상체 위치를, MediaPipe(미디어파이프)는 얼굴과 입 움직임을 봅니다.</p><p>모델 상태의 %는 검출 점수나 입 움직임 계수이며 정확도나 훈련 점수가 아닙니다. 평가 정확도는 아직 미측정입니다.</p><p>볼 부풀리기는 기본 시간 안내이며 설정에서 실험적 얼굴 판정을 선택할 수 있습니다. 혀의 입안 움직임·삼킴·발음 정확도는 자동 판정하지 않으며, 이 시스템은 치료 효과를 판단하지 않습니다.</p></details>
 </main>
}
