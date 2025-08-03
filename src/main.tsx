import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { cspViolationHandler } from '@/utils/sessionSecurity'

// Add CSP violation handler for security monitoring
document.addEventListener('securitypolicyviolation', cspViolationHandler);

createRoot(document.getElementById("root")!).render(<App />);
