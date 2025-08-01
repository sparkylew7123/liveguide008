'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface SessionTimelineProps {
  userId: string;
  onSessionSelect: (sessionId: string | null) => void;
  className?: string;
}

interface Session {
  id: string;
  created_at: string;
  properties: any;
  label: string;
}

const emotionEmojis: Record<string, string> = {
  'happy': '😊',
  'excited': '🤗',
  'confident': '💪',
  'motivated': '🚀',
  'focused': '🎯',
  'calm': '😌',
  'anxious': '😰',
  'frustrated': '😤',
  'confused': '😕',
  'tired': '😴',
  'proud': '🏆',
  'grateful': '🙏',
  'challenged': '🎮',
  'curious': '🤔',
  'inspired': '✨'
};

export default function SessionTimeline({ userId, onSessionSelect, className }: SessionTimelineProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('graph_nodes')
        .select('*')
        .eq('user_id', userId)
        .eq('node_type', 'session')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // If no sessions exist, create a mock onboarding session
      if (!data || data.length === 0) {
        const onboardingSession: Session = {
          id: 'onboarding-session',
          created_at: new Date().toISOString(),
          label: 'Onboarding Session',
          properties: {
            emotions: ['excited', 'motivated'],
            progress: 100,
            type: 'onboarding'
          }
        };
        setSessions([onboardingSession]);
      } else {
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    if (selectedSessionId === sessionId) {
      // Deselect if clicking the same session
      setSelectedSessionId(null);
      onSessionSelect(null);
    } else {
      setSelectedSessionId(sessionId);
      onSessionSelect(sessionId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionEmotions = (session: Session) => {
    // Extract emotions from session properties
    const emotions = session.properties?.emotions || [];
    return emotions.map((emotion: string) => emotionEmojis[emotion.toLowerCase()] || '💭').join(' ');
  };

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(sessions.length, currentIndex + 1)); // Include schedule button
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleScheduleClick = () => {
    router.push('/schedule');
  };

  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-sm", className)}>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Session Timeline
        </h3>
        
        {/* Mobile Carousel View */}
        <div className="md:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={cn(
                "p-1 rounded-full",
                currentIndex === 0 
                  ? "text-gray-300 dark:text-gray-600" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            
            <div className="flex-1">
              {currentIndex < sessions.length ? (
                <SessionCard
                  session={sessions[currentIndex]}
                  isSelected={selectedSessionId === sessions[currentIndex].id}
                  onClick={() => handleSessionClick(sessions[currentIndex].id)}
                  formatDate={formatDate}
                  getEmotions={getSessionEmotions}
                />
              ) : (
                <button
                  onClick={handleScheduleClick}
                  className={cn(
                    "w-full flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                    "border-dashed border-gray-300 dark:border-gray-600",
                    "hover:border-blue-400 dark:hover:border-blue-500",
                    "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <PlusIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  <span className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Schedule Session
                  </span>
                </button>
              )}
            </div>
            
            <button
              onClick={handleNext}
              disabled={currentIndex === sessions.length}
              className={cn(
                "p-1 rounded-full",
                currentIndex === sessions.length
                  ? "text-gray-300 dark:text-gray-600" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Desktop Tab View */}
        <div className="hidden md:flex gap-2 overflow-x-auto pb-2">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isSelected={selectedSessionId === session.id}
              onClick={() => handleSessionClick(session.id)}
              formatDate={formatDate}
              getEmotions={getSessionEmotions}
            />
          ))}
          {/* Add Schedule Button */}
          <button
            onClick={handleScheduleClick}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-w-[140px]",
              "border-dashed border-gray-300 dark:border-gray-600",
              "hover:border-blue-400 dark:hover:border-blue-500",
              "hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <PlusIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            <span className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              Schedule Session
            </span>
          </button>
        </div>
        
        {selectedSessionId && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Viewing session data. The graph now shows progress and connections from this session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
  formatDate: (date: string) => string;
  getEmotions: (session: Session) => string;
}

function SessionCard({ session, isSelected, onClick, formatDate, getEmotions }: SessionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col p-3 rounded-lg border-2 transition-all min-w-[140px]",
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      )}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {formatDate(session.created_at)}
      </div>
      <div className="mt-1 font-medium text-sm text-gray-900 dark:text-white truncate">
        {session.label || 'Session'}
      </div>
      <div className="mt-2 text-lg">
        {getEmotions(session) || '💭'}
      </div>
      {session.properties?.progress && (
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div 
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${session.properties.progress}%` }}
          />
        </div>
      )}
    </button>
  );
}