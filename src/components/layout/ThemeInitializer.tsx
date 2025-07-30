'use client';

import { useEffect } from 'react';

export function ThemeInitializer() {
  useEffect(() => {
    // Get saved theme or default to system
    const savedTheme = localStorage.getItem('theme') || 'system';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Remove any existing theme classes
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    
    // Apply the appropriate theme
    if (savedTheme === 'system') {
      document.documentElement.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
      document.documentElement.classList.add(`${savedTheme}-theme`);
    }
    
    // Add default dark background to prevent flash
    if (savedTheme === 'dark' || (savedTheme === 'system' && prefersDark)) {
      document.documentElement.style.backgroundColor = '#111827';
    } else {
      document.documentElement.style.backgroundColor = '#ffffff';
    }
  }, []);

  return null;
}