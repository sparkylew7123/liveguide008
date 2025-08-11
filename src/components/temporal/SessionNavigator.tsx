import React from 'react';
import { Session } from '@/types/temporal';
import { 
  CalendarIcon, 
  ClockIcon, 
  ChatBubbleLeftRightIcon, 
  FaceSmileIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';

interface SessionNavigatorProps {
  sessions: Session[];
  currentSession: Session | null;
  onSessionSelect: (session: Session) => void;
  onClose?: () => void;
}

export function SessionNavigator({
  sessions,
  currentSession,
  onSessionSelect,
  onClose
}: SessionNavigatorProps) {
  const getSessionIcon = (session: Session) => {
    if (session.properties?.emotion) {
      return <FaceSmileIcon className="w-4 h-4" />;
    }
    return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
  };

  const getSessionPreview = (session: Session) => {
    const topics = session.properties?.topics || [];
    const summary = session.properties?.summary;
    const duration = session.properties?.duration;

    return {
      topics: topics.slice(0, 3),
      summary: summary ? summary.slice(0, 100) + '...' : 'No summary available',
      duration: duration ? `${Math.round(duration / 60)} min` : 'Unknown duration'
    };
  };

  return (
    <div className="bg-background/95 backdrop-blur-lg border rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          Sessions Timeline
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="max-h-[50vh] overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No sessions recorded yet
          </div>
        ) : (
          <div className="divide-y">
            {sessions.map((session) => {
              const preview = getSessionPreview(session);
              const isActive = session.id === currentSession?.id;
              const createdAt = new Date(session.created_at);

              return (
                <button
                  key={session.id}
                  onClick={() => onSessionSelect(session)}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                    isActive ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {getSessionIcon(session)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {session.label}
                        </h4>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {preview.duration}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">
                        {preview.summary}
                      </p>

                      {preview.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {preview.topics.map((topic, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-muted rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                          {session.properties?.topics && session.properties.topics.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{session.properties.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{format(createdAt, 'MMM d, yyyy')}</span>
                        <span>{format(createdAt, 'h:mm a')}</span>
                        <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
                      </div>

                      {session.properties?.emotion && (
                        <div className="mt-2 text-xs">
                          Emotion: <span className="text-primary">
                            {session.properties.emotion}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}