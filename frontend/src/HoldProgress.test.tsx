import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import HoldProgress from './HoldProgress';

describe('HoldProgress',()=>{
 it('renders hold time as an accessible horizontal progress bar',()=>{
  const html=renderToStaticMarkup(<HoldProgress label="유지 시간" elapsed={1} target={2}/>);
  expect(html).toContain('role="progressbar"');
  expect(html).toContain('aria-label="유지 시간"');
  expect(html).toContain('aria-valuenow="1"');
  expect(html).toContain('width:50%');
  expect(html).toContain('1.0');
  expect(html).toContain('/ 2초');
 });
});
