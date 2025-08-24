'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import AgentCard from './AgentCard';
import VideoPreview from './VideoPreview';
import styles from './styles.module.css';

interface Agent {
  uuid: string;
  Name: string;
  Speciality: string;
  Category: string;
  Image?: string;
  onboard_url_vid?: string;
  Personality?: string;
  Backstory?: string;
  '11labs_agentID'?: string;
}

interface AgentCarouselProps {
  agents: Agent[];
  onAgentSelect: (agent: Agent) => void;
  selectedAgent: Agent | null;
  className?: string;
}

export default function AgentCarousel({
  agents,
  onAgentSelect,
  selectedAgent,
  className
}: AgentCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-select the current agent when index changes
  useEffect(() => {
    if (agents[currentIndex] && selectedAgent?.uuid !== agents[currentIndex].uuid) {
      onAgentSelect(agents[currentIndex]);
    }
  }, [currentIndex, agents, selectedAgent?.uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigatePrevious();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, agents]);

  // Reset playing state when agent changes
  useEffect(() => {
    setIsPlaying(false);
  }, [currentIndex]);

  const navigateNext = () => {
    setCurrentIndex((prev) => (prev + 1) % agents.length);
    setIsPlaying(false);
  };

  const navigatePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + agents.length) % agents.length);
    setIsPlaying(false);
  };

  // Removed - selection now happens automatically when carousel changes

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      navigateNext();
    }
    if (isRightSwipe) {
      navigatePrevious();
    }
  };

  const currentAgent = agents[currentIndex];

  return (
    <div className={cn("relative w-full max-w-4xl mx-auto", className)}>
      {/* Video Preview Section */}
      <div className="mb-6">
        {currentAgent && (
          <VideoPreview
            ref={videoRef}
            videoUrl={currentAgent.onboard_url_vid}
            agentName={currentAgent.Name}
            agentImage={currentAgent.Image}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
          />
        )}
      </div>

      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className="relative overflow-hidden rounded-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {agents.map((agent, index) => (
            <div
              key={agent.uuid}
              className="w-full flex-shrink-0 px-2"
            >
              <AgentCard
                agent={agent}
                isActive={index === currentIndex}
                isSelected={selectedAgent?.uuid === agent.uuid}
                onClick={() => {}} // No-op since selection is automatic
              />
            </div>
          ))}
        </div>

        {/* Navigation Buttons - Hidden on mobile, visible on desktop */}
        <button
          onClick={navigatePrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors hidden md:block"
          aria-label="Previous agent"
        >
          <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
        </button>
        <button
          onClick={navigateNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors hidden md:block"
          aria-label="Next agent"
        >
          <ChevronRightIcon className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {agents.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentIndex
                ? "bg-blue-600 w-8"
                : "bg-gray-300 hover:bg-gray-400"
            )}
            aria-label={`Go to agent ${index + 1}`}
          />
        ))}
      </div>

      {/* Agent Info */}
      {currentAgent && (
        <div className="text-center mt-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {currentAgent.Name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {currentAgent.Speciality}
          </p>
          {currentAgent.Personality && (
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              {currentAgent.Personality}
            </p>
          )}
        </div>
      )}
    </div>
  );
}