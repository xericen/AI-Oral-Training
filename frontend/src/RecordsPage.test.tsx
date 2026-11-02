import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import RecordsPage from './RecordsPage';

describe('Easy exercise records',()=>{
 it('shows a simple summary and icon refresh without storage retry copy',()=>{
  const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/records']}><RecordsPage/></MemoryRouter>);
  expect(html).toContain('운동 기록 통계');
  expect(html).toContain('aria-label="운동 기록 새로고침"');
  expect(html).toContain('총 운동 횟수');
  expect(html).toContain('끝까지 완료');
  expect(html).toContain('단계 완료율');
  expect(html).toContain('최근 운동 기록');
  expect(html).not.toContain('로그인 계정의 MySQL 기록');
  expect(html).not.toContain('서버가 없어도 영상 분석');
  expect(html).not.toContain('영상·원본 얼굴 점·음성');
  expect(html).not.toContain('로컬 기록 저장 재시도');
  expect(html).not.toContain('기록 새로고침</button>');
 });
});
