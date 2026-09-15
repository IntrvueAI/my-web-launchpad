import { useEffect, useState, type ReactNode } from 'react';
import { Palette } from 'lucide-react';
import './medicine-theme.css';

export type MedicineColourScheme = 'clinical' | 'coral';
const KEY = 'intrvue:medicine-colour-scheme:v1';
const EVENT = 'medicine-colour-scheme-changed';
function storedTheme(): MedicineColourScheme {
  try { return localStorage.getItem(KEY) === 'coral' ? 'coral' : 'clinical'; } catch { return 'clinical'; }
}
export function useMedicineColourScheme() {
  const [theme, setTheme] = useState<MedicineColourScheme>(storedTheme);
  useEffect(() => {
    const update = (event: Event) => { const value = event instanceof CustomEvent ? event.detail : storedTheme(); if (value === 'clinical' || value === 'coral') setTheme(value); };
    window.addEventListener(EVENT, update); window.addEventListener('storage', update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  const change = (value: MedicineColourScheme) => {
    try { localStorage.setItem(KEY,value); } catch { /* Switching still works when storage is unavailable. */ }
    setTheme(value); window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
  };
  return { theme, change };
}
export function MedicineTheme({ children, bottomNav = false, live = false, enabled = true }: { children: ReactNode; bottomNav?: boolean; live?: boolean; enabled?: boolean }) {
  const { theme, change } = useMedicineColourScheme();
  useEffect(() => {
    if (!enabled || document.getElementById('medicine-identity-fonts')) return;
    const link = document.createElement('link'); link.id = 'medicine-identity-fonts'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Bricolage+Grotesque:wght@600;700&family=Inter+Tight:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, [enabled]);
  if (!enabled) return <>{children}</>;
  return <div className={`medicine-theme ${live ? 'medicine-live-theme' : ''}`} data-medicine-theme={theme} data-bottom-nav={bottomNav || undefined}>
    {children}
    <div className="medicine-theme-switch" role="group" aria-label="Medicine colour scheme">
      <Palette size={16} aria-hidden="true"/>
      <button type="button" aria-pressed={theme === 'clinical'} onClick={() => change('clinical')}><i className="medicine-swatch-clinical"/>Clinical teal</button>
      <button type="button" aria-pressed={theme === 'coral'} onClick={() => change('coral')}><i className="medicine-swatch-coral"/>Warm coral</button>
    </div>
  </div>;
}
