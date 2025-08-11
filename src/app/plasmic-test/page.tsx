'use client';

import { useEffect, useState } from 'react';
import { PLASMIC } from '@/lib/plasmic-init';

export default function PlasmicTestPage() {
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testPlasmic = async () => {
      try {
        console.log('Testing Plasmic configuration...');
        console.log('Project ID:', process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID);
        console.log('Has Token:', !!process.env.NEXT_PUBLIC_PLASMIC_PROJECT_TOKEN);
        
        // Try to fetch project bundles
        const response = await fetch(
          `https://codegen.plasmic.app/api/v1/loader/code/versioned?platform=nextjs&projectId=${process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID}`,
          {
            headers: {
              'x-plasmic-api-project-tokens': `${process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID}:${process.env.NEXT_PUBLIC_PLASMIC_PROJECT_TOKEN}`
            }
          }
        );
        
        const data = await response.json();
        console.log('Plasmic API Response:', data);
        
        if (!response.ok) {
          setError(`API Error: ${data.error?.message || response.statusText}`);
        } else {
          setProjectInfo(data);
        }
      } catch (err) {
        console.error('Plasmic test error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testPlasmic();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Plasmic Configuration Test</h1>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">Environment Variables:</h2>
        <pre className="text-sm">
          Project ID: {process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID || 'NOT SET'}
          {'\n'}
          Token: {process.env.NEXT_PUBLIC_PLASMIC_PROJECT_TOKEN ? 'SET (hidden)' : 'NOT SET'}
        </pre>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
          
          {error.includes('does not have a specified version') && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">Solution:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
                <li>Go to Plasmic Studio</li>
                <li>Open your project</li>
                <li>Click the "Publish" button in the top right corner</li>
                <li>Publish your project to make it available to the loader</li>
                <li>Refresh this page after publishing</li>
              </ol>
              <p className="mt-3 text-xs">
                Note: In development, you can also enable preview mode to see unpublished changes,
                but publishing is recommended for initial setup.
              </p>
            </div>
          )}
        </div>
      )}

      {projectInfo && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <strong>Success!</strong> Plasmic project loaded successfully.
          <pre className="mt-2 text-sm">{JSON.stringify(projectInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}