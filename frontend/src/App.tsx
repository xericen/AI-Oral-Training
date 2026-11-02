import GuidePage from './GuidePage';
import {createContext,useContext,useState} from 'react';
import {NavLink,Route,Routes,Link} from 'react-router-dom';
import {House,Activity,NotebookTabs,BookOpen,UserRound,Settings} from 'lucide-react';
import TrainingPage from './TrainingPage';
import RecordsPage from './RecordsPage';
import {CourseChooser,CoursePage,SettingsPage,selectedCourseId} from './CoursePages';
import {courses} from './browser/courses';

const Profile=createContext({participant:'local-user',setParticipant:(_s:string)=>{}});

function Home(){
 const p=useContext(Profile),[selected,setSelected]=useState(selectedCourseId);
 const course=courses.find(c=>c.id===selected)!;
 function choose(id:string){localStorage.setItem('oral-selected-course',id);setSelected(id)}
 return <main className="dashboard-page"><section className="dashboard-hero"><div><span className="real-mode">서버 없이 브라우저에서 실행</span><h1>{p.participant}님의 훈련 대시보드</h1><p>오늘 할 코스를 고른 뒤 훈련을 시작하세요.</p></div><div className="dashboard-current"><span>선택한 코스</span><strong>{course.title}</strong><small>{course.description} · {course.exercises.length}단계</small><Link className="primary-link" to={'/training?course='+course.id}>선택한 코스로 훈련하기</Link></div></section><section className="dashboard-courses"><div className="section-heading"><div><span>훈련 코스</span><h2>어떤 운동을 할까요?</h2></div><p>원하는 네모 상자를 눌러 선택하세요.</p></div><CourseChooser selected={selected} onSelect={choose}/></section><section className="dashboard-info"><article><b>영상 보호</b><span>카메라 영상은 저장하지 않아요.</span></article><article><b>자동 기록</b><span>완료 결과는 이 브라우저에 보관해요.</span></article><article><b>설정 위치</b><span>오른쪽 위 사람 버튼에서 바꿀 수 있어요.</span></article></section></main>
}

export default function App(){
 const [participant,setCode]=useState((typeof localStorage==='undefined'?null:localStorage.getItem('oral-participant'))||'local-user');
 function setParticipant(s:string){setCode(s);localStorage.setItem('oral-participant',s||'local-user')}
 return <Profile.Provider value={{participant,setParticipant}}><header className="app-header"><Link className="studio-brand" to="/"><svg viewBox="0 0 40 44" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 7C6-2 0 9 5 21c3 7 2 19 7 19 4 0 3-14 8-14s4 14 8 14c5 0 4-12 7-19C40 9 34-2 20 7Z"/><path d="M13 11c-4 0-5 4-3 8"/></svg><span>구강 근기능 훈련 시스템</span></Link><nav aria-label="훈련 앱 메뉴">{[['/','홈',House],['/training','훈련하기',Activity],['/records','기록',NotebookTabs],['/guide','가이드',BookOpen]].map(([path,title,Icon])=><NavLink key={String(path)} to={String(path)} end={path==='/'?true:undefined}>{typeof Icon!=='string'&&<Icon size={20}/>}<span>{String(title)}</span></NavLink>)}</nav><details className="profile-menu"><summary title="사람 설정" aria-label="사람 설정 열기"><UserRound size={22}/></summary><div><strong>{participant}</strong><span>사람 설정</span><Link to="/settings" onClick={e=>(e.currentTarget.closest('details') as HTMLDetailsElement)?.removeAttribute('open')}><Settings size={17}/>카메라·마이크 설정</Link></div></details></header><Routes><Route path="/" element={<Home/>}/><Route path="/courses" element={<CoursePage/>}/><Route path="/settings" element={<SettingsPage participant={participant} setParticipant={setParticipant}/>}/><Route path="/calibration" element={<TrainingPage key="calibration" calibrationOnly/>}/><Route path="/training" element={<TrainingPage key="training"/>}/><Route path="/records" element={<RecordsPage/>}/><Route path="/records/:id" element={<RecordsPage/>}/><Route path="/guide" element={<GuidePage/>}/><Route path="*" element={<Home/>}/></Routes></Profile.Provider>
}
