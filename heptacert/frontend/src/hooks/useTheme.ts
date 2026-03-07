'use client';

import { useEffect, useState, useCallback } from 'react';
import { Theme, getStoredTheme, setStoredTheme, applyTheme, getEffectiveTheme, watchSystemTheme } from '@/lib/theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from storage on mount
  useEffect(() => {
    setMounted(true);
    setTheme('light');
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    setStoredTheme(theme);
  }, [theme, mounted]);

  // Watch for system theme changes
  useEffect(() => {
    return;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme('light');
  }, []);

  const setThemeValue = useCallback((newTheme: Theme) => {
    setTheme('light');
  }, []);

  const effectiveTheme = mounted ? getEffectiveTheme(theme) : 'light';

  return {
    theme,
    effectiveTheme,
    setTheme: setThemeValue,
    toggleTheme,
    isDark: effectiveTheme === 'dark',
    isMounted: mounted,
  };
}
