'use client';

import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import VideoPreview from './VideoPreview';

interface Agent {
  uuid: string;
  Name: string;
  Speciality: string;
  Category: string;
  Image?: string;
  Personality?: string;
  onboard_url_vid?: string;
}

interface AgentCardProps {
  agent: Agent;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export default function AgentCard({
  agent,
  isActive,
  isSelected,
  onClick
}: AgentCardProps) {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Stop video when agent is no longer selected
  React.useEffect(() => {
    if (!isSelected && isPlayingVideo) {
      setIsPlayingVideo(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [isSelected, isPlayingVideo]);

  // Generate initials if no image
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        "relative transition-all duration-300 transform",
        "bg-white rounded-xl shadow-lg overflow-hidden",
        // Active means it's the current agent in view - make it prominent
        isActive && "ring-4 ring-blue-600 ring-offset-4 shadow-2xl scale-105",
        // Selected is same as active now since selection is automatic
        isSelected && "ring-4 ring-blue-600 ring-offset-4"
      )}
    >
      {/* Active/Selected Indicator - Show for current agent in view */}
      {(isActive || isSelected) && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircleIcon className="w-8 h-8 text-blue-600 bg-white rounded-full" />
        </div>
      )}

      {/* Video Preview or Agent Image */}
      <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100">
        {agent.onboard_url_vid ? (
          <VideoPreview
            ref={videoRef}
            videoUrl={agent.onboard_url_vid}
            agentName={agent.Name}
            agentImage={agent.Image}
            isPlaying={isPlayingVideo}
            onPlayStateChange={setIsPlayingVideo}
            className="w-full"
          />
        ) : agent.Image ? (
          <img
            src={agent.Image}
            alt={agent.Name}
            className="w-full aspect-[2/3] object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[2/3] flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {getInitials(agent.Name)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Agent Info */}
      <div className="p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-1">
          {agent.Name}
        </h4>
        <p className="text-sm text-gray-600 mb-2">
          {agent.Category}
        </p>
        <p className="text-xs text-gray-500 line-clamp-2">
          {agent.Speciality}
        </p>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
      )}
    </div>
  );
}