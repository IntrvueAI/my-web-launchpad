import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConnectionHealthCheck } from '../useConnectionHealthCheck';
let health: ReturnType<typeof useConnectionHealthCheck>;
function Harness() { health = useConnectionHealthCheck(); return null; }
describe('Connection status', () => {
  let root: ReturnType<typeof createRoot>;
  const request = vi.fn();
  beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.stubGlobal('fetch', request); request.mockReset(); Object.defineProperty(navigator, 'onLine', { value:true, configurable:true }); root = createRoot(document.createElement('div')); act(() => root.render(<Harness />)); });
  afterEach(() => { act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false }); });
  it('checks the website itself and does not call a third-party tracker', async () => {
    request.mockResolvedValue(new Response(null, {status:200}));
    await act(async () => { await health.checkConnection(); });
    expect(request.mock.calls[0][0]).toBe('/favicon.ico'); expect(health.isOnline).toBe(true);
  });
  it('does not call a slow successful connection offline', async () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(2500);
    request.mockResolvedValue(new Response(null, {status:200}));
    await act(async () => { await health.checkConnection(); });
    expect(health.connectionQuality).toBe('poor'); expect(health.isOnline).toBe(true);
  });
  it('distinguishes a failed check from the browser being offline', async () => {
    request.mockRejectedValue(new Error('blocked request'));
    await act(async () => { await health.checkConnection(); });
    expect(health.connectionQuality).toBe('poor');
    Object.defineProperty(navigator, 'onLine', {value:false,configurable:true});
    act(() => window.dispatchEvent(new Event('offline')));
    expect(health.connectionQuality).toBe('offline'); expect(health.isOnline).toBe(false);
  });
});
