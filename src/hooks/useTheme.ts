import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'intrvue-theme';

/** Reads/writes the `dark` class on <html>. Defaults to dark (see the inline script in
 *  index.html that applies this before first paint) — light is the new, opt-in theme. */
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
