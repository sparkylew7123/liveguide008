'use client';

import { useState, useEffect } from 'react';
import { TemporalGraphCanvas } from '@/components/temporal/TemporalGraphCanvas';
import { TimelineController } from '@/components/temporal/TimelineController';
import { SessionList } from '@/components/temporal/SessionList';
import { useTemporalGraph } from '@/hooks/useTemporalGraph';
import { format } from 'date-fns';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function TemporalGraphPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUserId(user.id);
    };
    
    checkAuth();
  }, [router]);
  
  const {
    graphAtTime,
    currentTime,
    timeRange,
    sessions,
    events,
    isPlaying: hookIsPlaying,
    playbackSpeed,
    setCurrentTime,
    setTimeRange,
    togglePlayPause,
    setPlaybackSpeed,
    loading,
    error
  } = useTemporalGraph({
    userId: userId || '',
    autoPlay: false,
    initialSpeed: 86400 // 1 day per second
  });

  const handlePlayPause = () => {
    togglePlayPause();
    setIsPlaying(!isPlaying);
  };

  // Show loading while checking auth
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Checking authentication...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  const handleSkipBackward = () => {
    if (currentTime) {
      const newTime = new Date(currentTime.getTime() - 3600000); // 1 hour back
      if (timeRange && newTime >= timeRange.start) {
        setCurrentTime(newTime);
      }
    }
  };

  const handleSkipForward = () => {
    if (currentTime) {
      const newTime = new Date(currentTime.getTime() + 3600000); // 1 hour forward
      if (timeRange && newTime <= timeRange.end) {
        setCurrentTime(newTime);
      }
    }
  };

  const handleTimeChange = (date: Date) => {
    setCurrentTime(date);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Loading temporal graph...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-500 mb-4">Error loading graph</h2>
          <p className="text-gray-400">{typeof error === 'string' ? error : error.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Temporal Graph Explorer</h1>
        {currentTime && (
          <p className="text-sm text-gray-400 mt-1">
            Viewing: {format(currentTime, 'PPP p')}
          </p>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Session List */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <SessionList
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
            currentTime={currentTime || new Date()}
          />
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 relative">
          <TemporalGraphCanvas
            nodes={graphAtTime.nodes}
            edges={graphAtTime.edges}
            currentTime={currentTime || new Date()}
            selectedNodeId={selectedSessionId}
            events={events}
          />
        </div>
      </div>

      {/* Timeline Controller */}
      <div className="bg-gray-800 border-t border-gray-700">
        <TimelineController
          currentTime={currentTime || new Date()}
          sessions={sessions}
          isPlaying={hookIsPlaying}
          playbackSpeed={playbackSpeed}
          onPlayPause={handlePlayPause}
          onTimeChange={handleTimeChange}
          onSpeedChange={handleSpeedChange}
          onSessionSelect={(session) => setSelectedSessionId(session.id)}
        />
      </div>
    </div>
  );
}