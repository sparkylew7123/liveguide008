'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

const GraphExplorer = dynamic(() => import('@/components/graph/GraphExplorer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ),
});

const SampleGraphView = dynamic(() => import('@/components/graph/SampleGraphView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ),
});

const SessionTimeline = dynamic(() => import('@/components/graph/SessionTimeline'), {
  ssr: false,
  loading: () => (
    <div className="h-24 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    </div>
  ),
});

export default function ProgressPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSampleGraph, setShowSampleGraph] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {showSampleGraph ? 'Sample Knowledge Graph' : 'My Progress Graph'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSampleGraph(!showSampleGraph)}
              className="flex items-center gap-2"
            >
              <InformationCircleIcon className="w-4 h-4" />
              {showSampleGraph ? 'Show My Graph' : 'Show Sample Graph'}
            </Button>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {showSampleGraph ? 'Example of graph relationships' : 'Explore your goals, skills, and insights'}
            </div>
          </div>
        </div>
      </header>

      {/* Graph Explorer or Sample View */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {!showSampleGraph && (
          <SessionTimeline 
            userId={user.id} 
            onSessionSelect={setSelectedSessionId}
            className="flex-shrink-0 m-4"
          />
        )}
        <div className="flex-1 overflow-hidden">
          {showSampleGraph ? (
            <SampleGraphView className="w-full h-full" />
          ) : (
            <GraphExplorer 
              userId={user.id} 
              selectedSessionId={selectedSessionId}
              className="w-full h-full" 
            />
          )}
        </div>
      </main>
    </div>
  );
}