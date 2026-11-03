import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logAppEvent } from './lib/appLogger';
import { domainHandoverTarget } from './lib/site';

// Registered before the app mounts so failures during module load / before React is up are still
// caught — the ErrorBoundary in App.tsx only sees errors thrown during React's own render/lifecycle.
window.addEventListener('error', (e) => {
  logAppEvent({
    level: 'error',
    eventType: 'window_onerror',
    message: e.message,
    metadata: { stack: e.error?.stack, filename: e.filename, lineno: e.lineno },
  }).catch(() => {});
});
window.addEventListener('unhandledrejection', (e) => {
  logAppEvent({
    level: 'error',
    eventType: 'unhandled_rejection',
    message: e.reason?.message ?? String(e.reason),
    metadata: { stack: e.reason?.stack },
  }).catch(() => {});
});

// Each product lives on its own domain: a page opened on the other one is sent across first.
let inviteStorage: Storage | null = null;
try { inviteStorage = window.sessionStorage; } catch { /* Storage can be blocked; links still redirect. */ }
const handover = domainHandoverTarget(new URL(window.location.href), inviteStorage);
if (handover) window.location.replace(handover);
else createRoot(document.getElementById("root")!).render(<App />);
