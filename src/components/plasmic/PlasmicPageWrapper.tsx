'use client';

import { ReactNode, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { PlasmicThemeProvider } from './PlasmicThemeProvider';
import { PlasmicRootProvider } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from '@/lib/plasmic-init';

interface PlasmicPageWrapperProps {
  children: ReactNode;
  pageName?: string;
  fallback?: ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Plasmic page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 rounded-lg bg-white dark:bg-gray-800 shadow-lg max-w-md">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
          Oops! Something went wrong
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          We're having trouble loading this page. Please try again later.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export function PlasmicPageWrapper({ 
  children, 
  pageName,
  fallback = <LoadingFallback />
}: PlasmicPageWrapperProps) {
  useEffect(() => {
    // Track page view for analytics
    if (pageName && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'plasmic_page_view', {
        page_name: pageName,
        page_path: window.location.pathname,
        content_source: 'plasmic',
      });
    }
  }, [pageName]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => {
        // Additional error tracking
        console.error('Plasmic error boundary caught:', error);
      }}
    >
      <PlasmicRootProvider loader={PLASMIC}>
        <PlasmicThemeProvider>
          {children}
        </PlasmicThemeProvider>
      </PlasmicRootProvider>
    </ErrorBoundary>
  );
}

export function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    </div>
  );
}