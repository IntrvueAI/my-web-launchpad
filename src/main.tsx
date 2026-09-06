import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logAppEvent } from './lib/appLogger';

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

createRoot(document.getElementById("root")!).render(<App />);
