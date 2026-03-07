export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'heptacert-theme';
const COLOR_SCHEME_MEDIA = '(prefers-color-scheme: dark)';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  return 'light';
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, 'light');
}

export function getSystemTheme(): 'light' | 'dark' {
  return 'light';
}

export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  return 'light';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark');
}

export function initializeTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  applyTheme('light');
  setStoredTheme('light');
  return 'light';
}

export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  return () => {};
}
