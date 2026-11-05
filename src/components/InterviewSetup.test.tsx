import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewSetup, type SetupChoice } from './InterviewSetup';

let root: Root, node: HTMLDivElement;
const onConfirm = vi.fn<(choice: SetupChoice) => void>();
const topics = [{ id: 'ethics-scenarios', label: 'Ethics', blurb: 'Weigh competing interests.' }];
const button = (text: string) => Array.from(node.querySelectorAll('button')).find((b) => b.textContent?.includes(text))!;
const render = (props: Partial<Parameters<typeof InterviewSetup>[0]> = {}) =>
  act(() => root.render(<InterviewSetup topics={topics} onConfirm={onConfirm} allowTopicPractice={false} {...props} />));

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  onConfirm.mockReset();
  localStorage.clear();
  node = document.createElement('div');
  document.body.append(node);
  root = createRoot(node);
});
afterEach(() => {
  act(() => root.unmount());
  node.remove();
});

describe('Interview setup: how each station starts', () => {
  it('offers reading first or hearing it aloud, and remembers the choice', () => {
    render({ briefChoice: { readingSeconds: 60 } });
    expect(node.textContent).toContain('How should each station start?');
    expect(node.textContent).toContain('You get 1 minute to read the brief on screen.');
    expect(button('Read the brief first').getAttribute('aria-pressed')).toBe('true');
    act(() => button('Clara asks it aloud').click());
    expect(button('Clara asks it aloud').getAttribute('aria-pressed')).toBe('true');
    act(() => button('Continue').click());
    expect(onConfirm).toHaveBeenCalledWith({ mode: 'mock', topic: undefined, briefDelivery: 'aloud' });
    expect(localStorage.getItem('mmi:brief-delivery')).toBe('aloud');

    act(() => root.unmount());
    root = createRoot(node);
    render({ briefChoice: { readingSeconds: 120 } });
    expect(button('Clara asks it aloud').getAttribute('aria-pressed')).toBe('true');
    expect(node.textContent).toContain('You get 2 minutes to read');
  });

  it('leaves setups without the choice exactly as before', () => {
    render({ allowTopicPractice: true });
    expect(node.textContent).not.toContain('How should each station start?');
    act(() => button('Continue').click());
    expect(onConfirm).toHaveBeenCalledWith({ mode: 'mock', topic: undefined });
  });
});
