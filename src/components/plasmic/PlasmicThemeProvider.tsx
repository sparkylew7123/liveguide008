'use client';

import { DataProvider } from '@plasmicapp/loader-nextjs';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface PlasmicThemeProviderProps {
  children: React.ReactNode;
}

export function PlasmicThemeProvider({ children }: PlasmicThemeProviderProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  // Define theme values based on your existing theme system
  const themeData = {
    theme: currentTheme || 'light',
    isDark,
    colors: {
      primary: isDark ? '#60a5fa' : '#3b82f6',
      secondary: isDark ? '#c084fc' : '#a855f7',
      background: isDark ? '#111827' : '#ffffff',
      foreground: isDark ? '#f9fafb' : '#111827',
      muted: isDark ? '#374151' : '#f3f4f6',
      accent: isDark ? '#f472b6' : '#ec4899',
    },
    spacing: {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
      xl: '3rem',
    },
  };

  // Avoid hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <DataProvider name="theme" data={themeData}>
      {children}
    </DataProvider>
  );
}