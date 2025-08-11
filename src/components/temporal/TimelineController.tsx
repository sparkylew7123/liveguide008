import React, { useCallback, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  BackwardIcon, 
  ForwardIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Session } from '@/types/temporal';

interface TimelineControllerProps {
  sessions: Session[];
  currentTime: Date;
  isPlaying: boolean;
  playbackSpeed: number;
  onTimeChange: (time: Date) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSessionSelect: (session: Session) => void;
}

export function TimelineController({
  sessions,
  currentTime,
  isPlaying,
  playbackSpeed,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  onSessionSelect
}: TimelineControllerProps) {
  const sliderRef = useRef<HTMLInputElement>(null);
  
  // Calculate timeline bounds - find the earliest session
  const minTime = sessions.length > 0 
    ? Math.min(...sessions.map(s => new Date(s.created_at).getTime()))
    : Date.now() - 30 * 24 * 60 * 60 * 1000; // Default to 30 days ago
  const maxTime = Date.now();
  const currentTimeValue = currentTime.getTime();

  // Convert slider value to date
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onTimeChange(new Date(value));
  }, [onTimeChange]);

  // Jump to previous/next session
  const jumpToPreviousSession = useCallback(() => {
    const currentIdx = sessions.findIndex(
      s => new Date(s.created_at).getTime() >= currentTimeValue
    );
    if (currentIdx > 0) {
      const prevSession = sessions[currentIdx - 1];
      onTimeChange(new Date(prevSession.created_at));
      onSessionSelect(prevSession);
    }
  }, [sessions, currentTimeValue, onTimeChange, onSessionSelect]);

  const jumpToNextSession = useCallback(() => {
    const nextSession = sessions.find(
      s => new Date(s.created_at).getTime() > currentTimeValue
    );
    if (nextSession) {
      onTimeChange(new Date(nextSession.created_at));
      onSessionSelect(nextSession);
    }
  }, [sessions, currentTimeValue, onTimeChange, onSessionSelect]);

  // Format time display
  const formatTimeDisplay = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return `Today ${format(date, 'HH:mm')}`;
    if (diffDays === 1) return `Yesterday ${format(date, 'HH:mm')}`;
    if (diffDays < 7) return format(date, 'EEEE HH:mm');
    return format(date, 'MMM d, yyyy HH:mm');
  };

  // Calculate progress percentage
  const progress = ((currentTimeValue - minTime) / (maxTime - minTime)) * 100;

  return (
    <div className="timeline-controller bg-background/95 backdrop-blur-lg border rounded-lg p-4 shadow-lg">
      {/* Playback Controls */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={jumpToPreviousSession}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Previous session"
        >
          <BackwardIcon className="w-4 h-4" />
        </button>

        <button
          onClick={onPlayPause}
          className="p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
        </button>

        <button
          onClick={jumpToNextSession}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Next session"
        >
          <ForwardIcon className="w-4 h-4" />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center gap-2 ml-4">
          <ClockIcon className="w-4 h-4 text-muted-foreground" />
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="text-sm bg-background border rounded px-2 py-1"
          >
            <option value="3600">1 hour/sec</option>
            <option value="7200">2 hours/sec</option>
            <option value="21600">6 hours/sec</option>
            <option value="43200">12 hours/sec</option>
            <option value="86400">1 day/sec</option>
            <option value="172800">2 days/sec</option>
            <option value="604800">1 week/sec</option>
          </select>
        </div>

        {/* Time Display */}
        <div className="ml-auto text-sm text-muted-foreground">
          {formatTimeDisplay(currentTime)}
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="relative">
        {/* Progress Bar Background */}
        <div className="absolute inset-0 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary/20 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Session Markers */}
        <div className="absolute inset-0 h-2 pointer-events-none">
          {sessions.map((session) => {
            const sessionTime = new Date(session.created_at).getTime();
            const position = ((sessionTime - minTime) / (maxTime - minTime)) * 100;
            
            return (
              <div
                key={session.id}
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full"
                style={{ left: `${position}%` }}
                title={session.label}
              >
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-1 h-4 bg-primary/50" />
              </div>
            );
          })}
        </div>

        {/* Slider Input */}
        <input
          ref={sliderRef}
          type="range"
          min={minTime}
          max={maxTime}
          value={currentTimeValue}
          onChange={handleSliderChange}
          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
          style={{
            background: 'transparent',
          }}
        />
      </div>

      {/* Session Info */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {sessions.length > 0 && format(new Date(sessions[0].created_at), 'MMM d, yyyy')}
        </div>
        <div>
          {sessions.length} sessions
        </div>
        <div>
          {format(new Date(), 'MMM d, yyyy')}
        </div>
      </div>
    </div>
  );
}