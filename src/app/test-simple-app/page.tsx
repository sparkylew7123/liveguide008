'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function TestSimpleApp() {
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setError(error.message);
          setStatus('Error');
        } else if (session) {
          setStatus(`Authenticated as: ${session.user.email}`);
        } else {
          setStatus('Not authenticated');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('Error');
      }
    };

    checkAuth();
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#111', color: 'white', minHeight: '100vh' }}>
      <h1>Simple Auth Test</h1>
      <p>Status: {status}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <div style={{ marginTop: '20px' }}>
        <a href="/login" style={{ color: '#60a5fa', marginRight: '20px' }}>Go to Login</a>
        <a href="/test-minimal" style={{ color: '#60a5fa' }}>Go to Minimal Test</a>
      </div>
    </div>
  );
}