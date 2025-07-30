'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong!</h2>
        <p className="text-gray-300 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <pre className="text-xs text-gray-400 bg-gray-900 p-4 rounded mb-6 overflow-auto max-h-40">
          {error.stack}
        </pre>
        <Button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}