'use client';

import { useState, useEffect } from 'react';

export default function ThemeTestPage() {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check current theme
    const root = document.documentElement;
    if (root.classList.contains('light-theme')) {
      setTheme('light');
    } else if (root.classList.contains('dark-theme')) {
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    // Remove existing theme classes
    root.classList.remove('light-theme', 'dark-theme');
    
    // Add new theme class
    root.classList.add(`${newTheme}-theme`);
    
    // Update state
    setTheme(newTheme);
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    
    console.log('Theme changed to:', newTheme);
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">Theme Test Page</h1>
        
        <div className="space-y-4">
          <p className="text-gray-300">
            Current theme: <strong>{theme}</strong>
          </p>
          
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-gray-800 text-white hover:bg-gray-700 rounded"
          >
            Toggle Theme (Current: {theme})
          </button>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Color Tests</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-900 border border-gray-800 rounded">
              <p className="text-white">bg-gray-900</p>
            </div>
            <div className="p-4 bg-gray-800 border border-gray-700 rounded">
              <p className="text-gray-300">bg-gray-800</p>
            </div>
            <div className="p-4 bg-gray-700 border border-gray-600 rounded">
              <p className="text-gray-300">bg-gray-700</p>
            </div>
            <div className="p-4 bg-gray-600 border border-gray-500 rounded">
              <p className="text-gray-300">bg-gray-600</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Debug Info</h2>
          <pre className="p-4 bg-gray-800 text-gray-300 rounded overflow-x-auto text-sm">
{`HTML Classes: ${mounted ? document.documentElement.className : 'Not mounted'}
Body Classes: ${mounted ? document.body.className : 'Not mounted'}
LocalStorage theme: ${mounted ? localStorage.getItem('theme') || 'Not set' : 'Not mounted'}`}
          </pre>
        </div>
      </div>
    </div>
  );
}