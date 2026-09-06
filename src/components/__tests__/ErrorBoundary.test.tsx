import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/appLogger', () => ({ logAppEvent: vi.fn().mockResolvedValue(undefined) }));

import { logAppEvent } from '@/lib/appLogger';
import { ErrorBoundary } from '../ErrorBoundary';

// No component-rendering test library exists in this repo yet (every other test is plain
// vitest, no @testing-library/react) — exercising the class's own lifecycle methods directly
// covers the behavior that matters here without introducing a new testing dependency for one file.
beforeEach(() => {
  vi.clearAllMocks();
});

describe('ErrorBoundary', () => {
  it('getDerivedStateFromError flips into the error state', () => {
    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });

  it('componentDidCatch logs the error and component stack, and never throws itself', () => {
    const boundary = new ErrorBoundary({ children: null });
    const error = new Error('boom');
    error.stack = 'Error: boom\n  at Thing';

    expect(() => boundary.componentDidCatch(error, { componentStack: '  in Thing' })).not.toThrow();

    expect(logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        eventType: 'react_error_boundary',
        message: 'boom',
        metadata: expect.objectContaining({ stack: error.stack, componentStack: '  in Thing' }),
      }),
    );
  });

  it('renders children when there is no error', () => {
    const boundary = new ErrorBoundary({ children: 'hello' as any });
    expect(boundary.render()).toBe('hello');
  });

  it('renders the fallback once hasError is set', () => {
    const boundary = new ErrorBoundary({ children: 'hello' as any });
    boundary.state = { hasError: true };
    const output = boundary.render();
    expect(output).not.toBe('hello');
    expect(output).toBeTruthy();
  });
});
