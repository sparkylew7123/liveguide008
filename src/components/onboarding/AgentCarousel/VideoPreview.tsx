'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

interface VideoPreviewProps {
  videoUrl?: string;
  agentName: string;
  agentImage?: string;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  className?: string;
  hidePlayPrompt?: boolean;
}

const VideoPreview = forwardRef<HTMLVideoElement, VideoPreviewProps>(
  ({ videoUrl, agentName, agentImage, isPlaying, onPlayStateChange, className, hidePlayPrompt = false }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [showPoster, setShowPoster] = useState(true);
    const [isMuted, setIsMuted] = useState(true);

    useEffect(() => {
      // Reset states when video URL changes
      setHasError(false);
      setShowPoster(true);
      setIsLoading(false);
    }, [videoUrl]);

    const handlePlayPause = () => {
      if (ref && 'current' in ref && ref.current) {
        if (isPlaying) {
          ref.current.pause();
          onPlayStateChange(false);
        } else {
          setShowPoster(false);
          setIsLoading(true);
          
          // Unmute when user manually plays
          if (isMuted) {
            ref.current.muted = false;
            setIsMuted(false);
          }
          
          // On mobile, we need to handle the play promise more carefully
          const playPromise = ref.current.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsLoading(false);
                onPlayStateChange(true);
                console.log('Video playing successfully');
              })
              .catch((error) => {
                console.error('Video play error:', error);
                setIsLoading(false);
                
                // On mobile, if autoplay fails, we need user interaction
                if (error.name === 'NotAllowedError') {
                  // Try playing muted if unmuted failed
                  if (!ref.current.muted) {
                    ref.current.muted = true;
                    setIsMuted(true);
                    ref.current.play().catch(() => {
                      setShowPoster(true);
                      onPlayStateChange(false);
                    });
                  } else {
                    setShowPoster(true);
                    onPlayStateChange(false);
                  }
                } else {
                  setHasError(true);
                  onPlayStateChange(false);
                }
              });
          }
        }
      }
    };

    const handleVideoEnd = () => {
      onPlayStateChange(false);
      setShowPoster(true);
      // Reset to muted for next play
      if (ref && 'current' in ref && ref.current) {
        ref.current.muted = true;
        setIsMuted(true);
      }
    };

    const toggleMute = () => {
      if (ref && 'current' in ref && ref.current) {
        const newMutedState = !isMuted;
        ref.current.muted = newMutedState;
        setIsMuted(newMutedState);
      }
    };

    const handleVideoError = () => {
      setHasError(true);
      setIsLoading(false);
      onPlayStateChange(false);
    };

    // Generate placeholder image if no agent image
    const getPlaceholderImage = () => {
      return (
        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-white">
                {agentName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <p className="text-lg font-medium text-gray-700">{agentName}</p>
            <p className="text-sm text-gray-500 mt-1">Onboarding Agent</p>
          </div>
        </div>
      );
    };

    return (
      <div className={cn(
        "relative rounded-lg overflow-hidden bg-gray-100",
        "aspect-[2/3]", // Portrait aspect ratio (2:3 - taller)
        className
      )}>
        {/* Video Element */}
        {videoUrl && !hasError ? (
          <>
            <video
              ref={ref}
              src={videoUrl}
              className={cn(
                "absolute inset-0 w-full h-full object-cover",
                showPoster && "opacity-0 pointer-events-none"
              )}
              playsInline
              webkit-playsinline="true"
              muted={isMuted}
              controls={false}
              preload="metadata"
              onEnded={handleVideoEnd}
              onError={handleVideoError}
              onLoadedData={() => setIsLoading(false)}
              aria-label={`Introduction video for ${agentName}`}
            />
            
            {/* Poster/Thumbnail */}
            {showPoster && (
              <div className="absolute inset-0">
                {agentImage ? (
                  <img
                    src={agentImage}
                    alt={agentName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getPlaceholderImage()
                )}
              </div>
            )}

            {/* Play/Pause Button Overlay */}
            <div 
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center",
                "transition-opacity duration-300",
                isPlaying && !showPoster && "opacity-0 hover:opacity-100"
              )}
            >
              <button
                onClick={handlePlayPause}
                className={cn(
                  "w-16 h-16 rounded-full bg-white/90 flex items-center justify-center",
                  "transform transition-transform hover:scale-110 shadow-lg"
                )}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                ) : isPlaying ? (
                  <PauseIcon className="w-8 h-8 text-gray-800" />
                ) : (
                  <PlayIcon className="w-8 h-8 text-gray-800 ml-1" />
                )}
              </button>
              {/* Show "Tap to play" on mobile when video is not playing */}
              {!isPlaying && !isLoading && showPoster && !hidePlayPrompt && (
                <p className="mt-2 text-sm font-medium text-white bg-black/60 px-3 py-1 rounded-full">
                  Tap to play intro
                </p>
              )}
            </div>

            {/* Volume Control - Only show when video is playing */}
            {isPlaying && !showPoster && (
              <button
                onClick={toggleMute}
                className={cn(
                  "absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center",
                  "hover:bg-black/80 transition-colors"
                )}
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                {isMuted ? (
                  <SpeakerXMarkIcon className="w-5 h-5 text-white" />
                ) : (
                  <SpeakerWaveIcon className="w-5 h-5 text-white" />
                )}
              </button>
            )}
          </>
        ) : (
          /* Fallback when no video or error */
          <div className="w-full h-full">
            {agentImage ? (
              <img
                src={agentImage}
                alt={agentName}
                className="w-full h-full object-cover"
              />
            ) : (
              getPlaceholderImage()
            )}
            {hasError && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-50 text-red-600 text-sm p-2 rounded">
                Video unavailable. Please select the agent to continue.
              </div>
            )}
          </div>
        )}

        {/* Video Progress Bar */}
        {!showPoster && videoUrl && !hasError && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
            <div
              className="h-full bg-blue-600 transition-all duration-100"
              style={{ width: '0%' }}
            />
          </div>
        )}
      </div>
    );
  }
);

VideoPreview.displayName = 'VideoPreview';

export default VideoPreview;