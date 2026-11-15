import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {CoursePage} from './CoursePages';

describe('Easy course selection',()=>{
 it('uses simple words and makes every rectangle selectable',()=>{
  const html=renderToStaticMarkup(<MemoryRouter><CoursePage/></MemoryRouter>);
  expect(html).toContain('어떤 운동을 할까요?');
  expect(html).toContain('원하는 네모 상자를 눌러주세요.');
  expect(html).not.toContain('이 코스로 시작');
  expect(html).not.toContain('카메라 설정');
  expect(html).not.toContain('단계</p>');
  expect(html.match(/class="course-choice-card/g)).toHaveLength(4);
  expect(html.match(/<button/g)).toHaveLength(4);
  expect(html).toContain('현재 선택');
  expect(html).toContain('선택됨');
  for(const title of ['준비·정리 체조','침샘·혀 운동','씹기·입술 운동','삼키기·말하기 운동'])expect(html).toContain(title);
  for(const count of ['21개 동작','14개 동작','12개 동작'])expect(html).toContain(count);
 });
});
