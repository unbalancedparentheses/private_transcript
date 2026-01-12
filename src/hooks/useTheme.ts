import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return mediaQuery?.matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);

  // Also update meta theme-color for native feel
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      effectiveTheme === 'dark' ? '#1c1c1e' : '#f5f5f7'
    );
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
  });

  // Apply theme on mount and when changed
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (!mediaQuery) return;

    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  }, []);

  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
    isSystem: theme === 'system',
  };
}

// Initialize theme on load (call this early in your app)
export function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
  applyTheme(savedTheme || 'system');
}
