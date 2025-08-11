import React from 'react';
import { format } from 'date-fns';
import { 
  UserIcon, 
  ClockIcon, 
  ChatBubbleLeftIcon 
} from '@heroicons/react/24/outline';
import type { Session } from '@/types/temporal';

interface SessionListProps {
  sessions: Session[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string | null) => void;
  currentTime: Date;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  currentTime
}) => {
  const isSessionActive = (session: Session) => {
    const startTime = new Date(session.created_at);
    const endTime = session.properties?.duration 
      ? new Date(startTime.getTime() + session.properties.duration * 60000)
      : null;
    
    if (currentTime < startTime) return false;
    if (endTime && currentTime > endTime) return false;
    return true;
  };

  const getSessionDuration = (session: Session) => {
    if (session.properties?.duration) {
      const minutes = session.properties.duration;
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    }
    
    // If no duration, calculate from created_at to updated_at
    const start = new Date(session.created_at);
    const end = new Date(session.updated_at);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Sessions</h2>
        <p className="text-sm text-gray-400">{sessions.length} total sessions</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 text-gray-600" />
            <p>No sessions found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {sessions.map((session) => {
              const isActive = isSessionActive(session);
              const isSelected = session.id === selectedSessionId;
              
              return (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id === selectedSessionId ? null : session.id)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors
                    ${isSelected 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-700 text-gray-300'
                    }
                    ${isActive && !isSelected ? 'border-l-2 border-green-500' : ''}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon className="w-4 h-4" />
                        <span className="text-sm font-medium truncate">
                          {session.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <ClockIcon className="w-3 h-3" />
                        <span className={isSelected ? 'text-blue-100' : 'text-gray-400'}>
                          {format(new Date(session.created_at), 'MMM d, h:mm a')}
                        </span>
                        <span className={isSelected ? 'text-blue-200' : 'text-gray-500'}>
                          • {getSessionDuration(session)}
                        </span>
                      </div>

                      {session.properties?.agent_id && (
                        <div className="mt-1 text-xs">
                          <span className={isSelected ? 'text-blue-200' : 'text-gray-500'}>
                            Agent: {session.properties.agent_id}
                          </span>
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div className="ml-2">
                        <span className="inline-flex w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-700">
        <button
          onClick={() => onSelectSession(null)}
          className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
};