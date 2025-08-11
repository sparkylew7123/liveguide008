'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearCookiesPage() {
  const [cleared, setCleared] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    setCleared(true);
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white mb-4">
          {cleared ? 'Cookies and storage cleared!' : 'Clearing cookies and storage...'}
        </h2>
        <p className="text-gray-400">Redirecting to login...</p>
      </div>
    </div>
  );
}