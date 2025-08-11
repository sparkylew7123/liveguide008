'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DebugSessionPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [cookies, setCookies] = useState<string>('');
  const [localStorage, setLocalStorage] = useState<any>({});

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      
      // Check session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // Get all cookies
      const allCookies = document.cookie;
      
      // Get localStorage items
      const storageItems: any = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.includes('supabase')) {
          storageItems[key] = window.localStorage.getItem(key);
        }
      }
      
      setSessionInfo({
        session,
        error,
        user: session?.user,
        expiresAt: session?.expires_at,
        expiresIn: session?.expires_in,
        tokenType: session?.token_type
      });
      setCookies(allCookies);
      setLocalStorage(storageItems);
    };

    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-8">Session Debug Information</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Session Info</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Cookies</h2>
          <pre className="text-sm overflow-auto">
            {cookies || 'No cookies found'}
          </pre>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">LocalStorage (Supabase items)</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(localStorage, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Browser Info</h2>
          <p>User Agent: {sessionInfo ? navigator.userAgent : 'Loading...'}</p>
          <p>Cookie Enabled: {sessionInfo ? String(navigator.cookieEnabled) : 'Loading...'}</p>
        </div>
      </div>
    </div>
  );
}