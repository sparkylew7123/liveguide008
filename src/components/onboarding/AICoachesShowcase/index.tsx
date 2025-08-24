'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';

interface Agent {
  uuid: string;
  Name: string;
  Speciality: string;
  Category: string;
  Image?: string;
  onboard_url_vid?: string;
  video_intro?: string;
  Personality?: string;
  Backstory?: string;
  '11labs_agentID'?: string;
  Strengths?: string[] | string;
  'Key Features'?: string;
}

interface AICoachesShowcaseProps {
  agents: Agent[];
  onAgentSelect: (agent: Agent) => void;
  selectedAgent: Agent | null;
  className?: string;
}

export default function AICoachesShowcase({
  agents,
  onAgentSelect,
  selectedAgent,
  className
}: AICoachesShowcaseProps) {
  const [modalAgent, setModalAgent] = useState<Agent | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Check for dark theme
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkTheme(document.documentElement.classList.contains('dark-theme'));
    };
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);

  const handleCoachClick = (agent: Agent) => {
    setModalAgent(agent);
  };

  const handleStartConversation = () => {
    if (modalAgent) {
      onAgentSelect(modalAgent);
      setModalAgent(null);
      // Trigger the next phase of onboarding
      // The parent component will handle the actual conversation initiation
    }
  };

  const closeModal = () => {
    setModalAgent(null);
    setIsVideoPlaying(false);
    setVideoRef(null);
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getCategoryColor = (category: string) => {
    const lower = category?.toLowerCase() || '';
    if (lower.includes('career') || lower.includes('professional')) 
      return 'from-purple-500 to-indigo-600';
    if (lower.includes('health') || lower.includes('wellness') || lower.includes('fitness')) 
      return 'from-teal-500 to-green-600';
    if (lower.includes('mindful') || lower.includes('balance') || lower.includes('stress')) 
      return 'from-pink-500 to-rose-600';
    if (lower.includes('spiritual') || lower.includes('purpose')) 
      return 'from-amber-500 to-yellow-600';
    return 'from-blue-500 to-cyan-600';
  };

  const getFeatures = (agent: Agent): string[] => {
    let features: string[] = [];
    
    if (agent.Strengths) {
      if (Array.isArray(agent.Strengths)) {
        features = agent.Strengths;
      } else if (typeof agent.Strengths === 'string') {
        // Parse PostgreSQL array string format
        const cleaned = agent.Strengths.replace(/^{|}$/g, '');
        if (cleaned) {
          features = cleaned.split('","').map(f => f.replace(/^"|"$/g, ''));
        }
      }
    } else if (agent['Key Features']) {
      features = agent['Key Features']
        .split(/[-•]/)
        .map(f => f.trim())
        .filter(f => f.length > 0);
    }
    
    return features;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Coaches Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-5">
        {agents.map((agent) => {
          const hasVideo = agent.video_intro || agent.onboard_url_vid;
          return (
            <div
              key={agent.uuid}
              onClick={() => handleCoachClick(agent)}
              className={cn(
                "relative rounded-xl overflow-hidden aspect-[3/4] cursor-pointer",
                "transition-all duration-300 hover:shadow-xl",
                "bg-gradient-to-br",
                getCategoryColor(agent.Category),
                selectedAgent?.uuid === agent.uuid && "ring-4 ring-blue-500 ring-offset-2"
              )}
            >
              {agent.Image ? (
                <img
                  src={agent.Image}
                  alt={agent.Name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.15]"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white transition-transform duration-300 hover:scale-[1.15]">
                  <span className="text-4xl font-bold">
                    {agent.Name.charAt(0)}
                  </span>
                </div>
              )}
              
              {/* Video Available Badge */}
              {hasVideo && (
                <div className="absolute top-2 right-2 bg-purple-600/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                  </svg>
                  <span className="font-medium">Intro video</span>
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
                <h3 className="text-white font-semibold text-sm drop-shadow-md">{agent.Name}</h3>
                <p className="text-white/95 text-xs line-clamp-2 drop-shadow-md">{agent.Speciality}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal - Rendered via Portal */}
      {modalAgent && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={closeModal}
          />
          
          {/* Modal Content */}
          <div className={cn(
            "relative rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl z-[10000]",
            "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
            "border border-white/20"
          )}>
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Close modal"
            >
              <span className="text-white text-lg">✕</span>
            </button>

            {/* Video Section */}
            <div className="relative aspect-video bg-black">
              {(modalAgent.video_intro || modalAgent.onboard_url_vid) ? (
                <>
                  <video
                    ref={(el) => setVideoRef(el)}
                    src={modalAgent.video_intro || modalAgent.onboard_url_vid}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onEnded={() => setIsVideoPlaying(false)}
                  />
                  {/* Play Button Overlay */}
                  {!isVideoPlaying && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (videoRef) {
                          videoRef.play();
                        }
                      }}
                    >
                      <div className="w-20 h-20 rounded-full bg-purple-600/90 backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-110 shadow-2xl">
                        <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  {modalAgent.Image && (
                    <img
                      src={modalAgent.Image}
                      alt={modalAgent.Name}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className={cn(
              "p-6",
              isDarkTheme ? "bg-gray-900 text-white" : "bg-white text-gray-900"
            )}>
              {/* Header with Avatar */}
              <div className="flex items-center gap-4 mb-4">
                {modalAgent.Image && (
                  <img
                    src={modalAgent.Image}
                    alt={modalAgent.Name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                  />
                )}
                <div>
                  <h3 className={cn(
                    "text-xl font-semibold",
                    isDarkTheme ? "text-white" : "text-gray-900"
                  )}>
                    {modalAgent.Name}
                  </h3>
                  <p className={cn(
                    "text-sm",
                    isDarkTheme ? "text-gray-400" : "text-gray-600"
                  )}>
                    {modalAgent.Category}
                  </p>
                </div>
              </div>

              {/* Description */}
              {modalAgent.Backstory && (
                <p className={cn(
                  "mb-4 leading-relaxed",
                  isDarkTheme ? "text-gray-300" : "text-gray-700"
                )}>
                  {modalAgent.Backstory}
                </p>
              )}

              {/* Benefits/Features */}
              {getFeatures(modalAgent).length > 0 && (
                <ul className="mb-6 space-y-2">
                  {getFeatures(modalAgent).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-500 mt-1">✦</span>
                      <span className={cn(
                        "text-sm leading-relaxed",
                        isDarkTheme ? "text-gray-300" : "text-gray-600"
                      )}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* CTA Button */}
              <button
                onClick={handleStartConversation}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all hover:scale-[1.02]"
              >
                Start Conversation with {modalAgent.Name}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}