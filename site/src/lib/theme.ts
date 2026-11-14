import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/* Dark is the default; the toggle stores the choice under the same key the existing pages use. */
export function readTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => (typeof document === 'undefined' ? 'dark' : readTheme()));
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }, [theme]);
  return [theme, () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))];
}

/* re-render charts that read colours from CSS when the theme changes */
export function useThemeTick(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const on = () => setN(x => x + 1);
    window.addEventListener('themechange', on);
    return () => window.removeEventListener('themechange', on);
  }, []);
  return n;
}

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
