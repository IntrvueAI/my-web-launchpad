import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShutdownBanner } from '@/components/ShutdownBanner';
import { setStoredProductLine } from '@/lib/productLine';
import PracticeImport from '../PracticeImport';
import { emptyProfile } from '@/interview/studio/practice';

let root: Root; let node: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); localStorage.clear();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(() => { act(() => root.unmount()); node.remove(); vi.unstubAllGlobals(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false }); });
describe('Medicine entry continuity', () => {
  it('does not show the legacy 11+ shutdown announcement during Medicine sign-in', () => {
    act(() => root.render(<MemoryRouter initialEntries={['/auth?mode=medicine']}><ShutdownBanner/></MemoryRouter>));
    expect(node.textContent).toBe('');
  });
  it('tracks switching products on the same dashboard without changing unrelated routes', () => {
    act(() => root.render(<MemoryRouter initialEntries={['/']}><ShutdownBanner/></MemoryRouter>));
    expect(node.textContent).toContain('February 9th');
    act(() => setStoredProductLine('medicine')); expect(node.textContent).toBe('');
    act(() => setStoredProductLine('11plus')); expect(node.textContent).toContain('February 9th');
  });
  it('only copies guest notes after an explicit review and merge', () => {
    const guest = emptyProfile(); guest.bookmarks = ['MED-M1'];
    localStorage.setItem('intrvue:medicine-studio:v1:guest', JSON.stringify(guest));
    const update = vi.fn();
    act(() => root.render(<PracticeImport scope="signed-in-account" update={update}/>));
    expect(update).not.toHaveBeenCalled();
    const button = (text: string) => [...node.querySelectorAll('button')].find(b => b.textContent?.includes(text))!;
    act(() => button('Review my guest notes').click()); expect(update).not.toHaveBeenCalled();
    act(() => button('Merge these notes').click()); expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0](emptyProfile()).bookmarks).toEqual(['MED-M1']);
    expect(JSON.parse(localStorage.getItem('intrvue:medicine-studio:v1:guest')!).bookmarks).toEqual(['MED-M1']);
  });
});
