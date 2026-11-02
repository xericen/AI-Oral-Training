import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import App from './App';

describe('Training dashboard shell',()=>{
 it('shows course selection on home and settings below the person button',()=>{
  const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/']}><App/></MemoryRouter>);
  expect(html).toContain('훈련 대시보드');
  expect(html).toContain('훈련 코스');
  expect(html).toContain('선택한 코스');
  expect(html).toContain('aria-label="사람 설정 열기"');
  expect(html).toContain('카메라·마이크 설정');
 });
});
