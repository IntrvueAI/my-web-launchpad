import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewTimer } from '@/components/InterviewTimer';
import { recommendMode } from '@/components/marketing/SchoolMatcher';
import { listSchools } from '@/interview/medicine-content';

describe('Interview countdown reliability',()=>{
  let node:HTMLDivElement;let root:Root;
  beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});node=document.createElement('div');document.body.append(node);root=createRoot(node);});
  afterEach(()=>{act(()=>root.unmount());node.remove();vi.useRealTimers();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:false});});
  it('keeps its deadline through parent rerenders and calls the latest callback once',()=>{
    const first=vi.fn();const latest=vi.fn();
    act(()=>root.render(<InterviewTimer isActive duration={0.05} onTimeUp={first}/>));
    act(()=>vi.advanceTimersByTime(1000));
    act(()=>root.render(<InterviewTimer isActive duration={0.05} onTimeUp={latest}/>));
    act(()=>vi.advanceTimersByTime(2000));
    expect(latest).toHaveBeenCalledTimes(1);expect(first).not.toHaveBeenCalled();expect(node.textContent).toContain('00:00');
    act(()=>vi.advanceTimersByTime(5000));expect(latest).toHaveBeenCalledTimes(1);
  });
  it('accounts for elapsed wall time after a delayed browser tick',()=>{
    const done=vi.fn();act(()=>root.render(<InterviewTimer isActive duration={1} onTimeUp={done}/>));
    vi.setSystemTime(new Date('2026-09-15T12:02:00Z'));act(()=>vi.advanceTimersByTime(250));
    expect(done).toHaveBeenCalledTimes(1);expect(node.textContent).toContain('00:00');
  });
  it('starts a fresh countdown after a stopped session',()=>{
    const done=vi.fn();act(()=>root.render(<InterviewTimer isActive duration={0.05} onTimeUp={done}/>));act(()=>vi.advanceTimersByTime(2000));
    act(()=>root.render(<InterviewTimer isActive={false} duration={0.05} onTimeUp={done}/>));expect(node.textContent).toBe('');
    act(()=>root.render(<InterviewTimer isActive duration={0.05} onTimeUp={done}/>));act(()=>vi.advanceTimersByTime(2000));expect(done).not.toHaveBeenCalled();
    act(()=>vi.advanceTimersByTime(1000));expect(done).toHaveBeenCalledTimes(1);
  });
});
describe('School practice descriptions',()=>{
  it('does not imply that an academic interview is a timed MMI match',()=>{
    const school=listSchools().find(s=>s.id==='oxford-a100')!;
    expect(recommendMode(school).label).toBe('General MMI practice');expect(recommendMode(school).note).toContain('do not reproduce');
  });
  it('does not invent reading time for an unconfirmed school',()=>{
    const school=listSchools().find(s=>s.id==='imperial-a100')!;
    expect(recommendMode(school).label).toBe('Try both');expect(recommendMode(school).note).toContain('unconfirmed');
  });
});
