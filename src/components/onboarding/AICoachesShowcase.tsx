'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlayIcon, SparklesIcon, PhoneIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';
import { VoiceInterface } from '../voice/VoiceInterface';
import { useUser } from '@/contexts/UserContext';

interface Coach {
  uuid?: string;
  Name: string;
  category?: string;
  Category?: string;
  Image: string;
  video_intro?: string;
  onboard_url_vid?: string;
  Speciality: string;
  'Key Features'?: string;
  Personality?: string;
  '11labs_agentID'?: string;
  benefits?: string[];
}

interface AICoachesShowcaseProps {
  onSelectCoach: (coach: Coach) => void;
  selectedCoachId?: string;
}

export function AICoachesShowcase({ onSelectCoach, selectedCoachId }: AICoachesShowcaseProps) {
  const { user, anonymousUser, effectiveUserId } = useUser();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isShowingIntroVideo, setIsShowingIntroVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const supabase = createClient();

  // Category color mapping
  const getCategoryColor = (category?: string) => {
    const categoryColors: Record<string, string> = {
      'Career Development': 'career',
      'Goal Setting & Achievement': 'career',
      'Creative Innovation': 'career',
      'Fitness & Wellness': 'wellness',
      'Health & Wellness': 'wellness',
      'Life Organization': 'wellness',
      'Purpose Discovery': 'wellness',
      'Emotional Support': 'mindfulness',
      'Stress Management': 'mindfulness',
      'Emotional Resilience': 'mindfulness',
      'Mindfulness Practice': 'mindfulness',
      'Mindfulness & Balance': 'mindfulness',
      'Spiritual Growth': 'spiritual',
      'Spiritual Awakening': 'spiritual',
    };
    return categoryColors[category || ''] || 'career';
  };

  // Get category accent color for icons
  const getCategoryAccentColor = (category?: string) => {
    const color = getCategoryColor(category);
    const colorMap: Record<string, string> = {
      'career': 'bg-purple-500 hover:bg-purple-600',
      'wellness': 'bg-teal-500 hover:bg-teal-600',
      'mindfulness': 'bg-pink-500 hover:bg-pink-600',
      'spiritual': 'bg-yellow-500 hover:bg-yellow-600',
    };
    return colorMap[color] || 'bg-blue-500 hover:bg-blue-600';
  };

  // Load coaches from database
  useEffect(() => {
    const loadCoaches = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('agent_personae')
          .select('*')
          .order('Name');
        
        if (!error && data) {
          setCoaches(data);
        }
      } catch (err) {
        console.error('Error loading coaches:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCoaches();
  }, []);

  // Check for dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const handleCoachClick = (coach: Coach) => {
    setSelectedCoach(coach);
    setIsModalOpen(true);
    // Start with onboard_url_vid when modal opens
    setCurrentVideoUrl(coach.onboard_url_vid || coach.video_intro || null);
    setIsShowingIntroVideo(false);
    setIsVideoMuted(true);
  };

  const handleSelectCoach = () => {
    if (selectedCoach) {
      // Close modal and show full-screen voice interface
      setShowVoiceCall(true);
      setIsModalOpen(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCoach(null);
    setShowVoiceCall(false);
    setIsVideoMuted(true);
    setCurrentVideoUrl(null);
    setIsShowingIntroVideo(false);
  };

  const handleVideoClick = () => {
    if (!selectedCoach) return;
    
    // If there's a video_intro and we're not already showing it, switch to it
    if (selectedCoach.video_intro && !isShowingIntroVideo) {
      setCurrentVideoUrl(selectedCoach.video_intro);
      setIsShowingIntroVideo(true);
      setIsVideoMuted(false);
      
      // Play the new video with audio
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.muted = false;
          videoRef.current.play();
        }
      }, 100);
    } else {
      // Just toggle audio for current video
      toggleVideoAudio();
    }
  };

  const handleVideoEnded = () => {
    if (!selectedCoach) return;
    
    // If we just finished playing the intro video, revert to onboarding video
    if (isShowingIntroVideo && selectedCoach.onboard_url_vid) {
      setCurrentVideoUrl(selectedCoach.onboard_url_vid);
      setIsShowingIntroVideo(false);
      setIsVideoMuted(true);
      
      // Reset video to onboarding state
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.muted = true;
          videoRef.current.play();
        }
      }, 100);
    }
  };

  const toggleVideoAudio = () => {
    if (videoRef.current) {
      const newMutedState = !isVideoMuted;
      videoRef.current.muted = newMutedState;
      setIsVideoMuted(newMutedState);
      
      // If unmuting, restart the video from beginning
      if (!newMutedState) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    }
  };

  const handleVoiceComplete = (data: any) => {
    // Pass the selected coach and conversation data back to parent
    if (selectedCoach) {
      onSelectCoach({ ...selectedCoach, conversationData: data });
      closeModal();
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-teal-600 animate-gradient" />
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:scale-105 transition-transform"
      >
        {isDarkMode ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
          </svg>
        )}
      </button>

      {/* Header */}
      <div className="text-center py-12 px-4">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent mb-4">
          Choose Your AI Coach
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Select your personal AI coach to guide your personalized experience and begin your transformation journey
        </p>
      </div>

      {/* Coaches Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-5 lg:gap-6 px-4 md:px-6 lg:px-8 max-w-[1400px] mx-auto pb-8">
        {coaches.map((coach, index) => {
          const categoryColor = getCategoryColor(coach.Speciality);
          const isSelected = coach.uuid === selectedCoachId;
          
          return (
            <motion.div
              key={coach.uuid || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => handleCoachClick(coach)}
              className={`
                relative rounded-2xl overflow-hidden aspect-[3/4] cursor-pointer
                transition-all duration-300 bg-gray-100 dark:bg-gray-800
                border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200 dark:border-gray-700'}
                hover:shadow-2xl group
                ${categoryColor === 'career' ? 'hover:shadow-purple-500/20' : ''}
                ${categoryColor === 'wellness' ? 'hover:shadow-teal-500/20' : ''}
                ${categoryColor === 'mindfulness' ? 'hover:shadow-pink-500/20' : ''}
                ${categoryColor === 'spiritual' ? 'hover:shadow-yellow-500/20' : ''}
              `}
            >
              {/* Coach Image */}
              {coach.Image && (
                <img
                  src={coach.Image}
                  alt={coach.Name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              
              {/* Content with strong backdrop for guaranteed readability */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="backdrop-blur-md bg-black/20 rounded-lg p-3">
                  <h3 className="font-bold text-base mb-1 drop-shadow-2xl text-white" style={{ color: 'white !important' }}>{coach.Name}</h3>
                  <p className="text-xs line-clamp-2 drop-shadow-lg font-medium text-gray-100" style={{ color: '#f3f4f6 !important' }}>{coach.Speciality}</p>
                </div>
              </div>

              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  Selected
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && selectedCoach && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-[90%] max-w-[500px] max-h-[90vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/20"
            >
              {/* Close Button - Better visibility */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors shadow-lg"
              >
                <XMarkIcon className="w-5 h-5 text-white drop-shadow-lg" />
              </button>
              
              {/* Video Section */}
              {currentVideoUrl && (
                <div className="relative aspect-video bg-black">
                  <video
                    ref={videoRef}
                    src={currentVideoUrl}
                    className="w-full h-full object-cover cursor-pointer"
                    autoPlay
                    muted={isVideoMuted}
                    loop={!isShowingIntroVideo} // Don't loop intro videos
                    onClick={handleVideoClick}
                    onEnded={handleVideoEnded}
                    playsInline
                    key={currentVideoUrl} // Force re-render when URL changes
                  />
                  
                  {/* Speaker Icon Overlay */}
                  <button
                    onClick={handleVideoClick}
                    className={`absolute top-4 left-4 z-20 p-3 rounded-full backdrop-blur-md border border-white/30 transition-all transform hover:scale-110 ${getCategoryAccentColor(selectedCoach.Category || selectedCoach.Speciality)}`}
                    aria-label={isVideoMuted ? "Play intro video with sound" : "Mute video"}
                  >
                    {isVideoMuted ? (
                      <SpeakerXMarkIcon className="w-6 h-6 text-white" />
                    ) : (
                      <SpeakerWaveIcon className="w-6 h-6 text-white animate-pulse" />
                    )}
                  </button>
                  
                  {/* Video type indicator */}
                  {isShowingIntroVideo && (
                    <div className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">Intro Video</span>
                        <span className="text-white/70 text-xs">(auto-return)</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Click instruction overlay */}
                  {isVideoMuted && !isShowingIntroVideo && selectedCoach.video_intro && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm animate-pulse">
                        Click to play intro video with sound
                      </div>
                    </div>
                  )}
                  
                  {isVideoMuted && !selectedCoach.video_intro && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm animate-pulse">
                        Click video or speaker icon to play with sound
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              )}
              
              {/* Coach Details or Voice Call */}
              <div className="p-6">
                {!showVoiceCall ? (
                  <>
                    {/* Header */}
                    <div className="flex items-center space-x-4 mb-6">
                      {selectedCoach.Image && (
                        <img
                          src={selectedCoach.Image}
                          alt={selectedCoach.Name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                        />
                      )}
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedCoach.Name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedCoach.Speciality}
                        </p>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-gray-700 dark:text-gray-300 mb-6">
                      {selectedCoach.Personality}
                    </p>
                    
                    {/* Key Features */}
                    {selectedCoach['Key Features'] && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <SparklesIcon className="w-5 h-5 mr-2 text-blue-500" />
                          Key Features
                        </h4>
                        <ul className="space-y-2">
                          {selectedCoach['Key Features'].split(',').map((feature, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {feature.trim()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* CTA Button */}
                    <button
                      onClick={handleSelectCoach}
                      className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <PhoneIcon className="w-5 h-5" />
                      Start Voice Conversation with {selectedCoach.Name}
                    </button>
                  </>
                ) : (
                  // Close modal and show full-screen voice interface
                  null
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-screen Voice Interface - shown when modal is closed and voice chat is active */}
      {showVoiceCall && selectedCoach && !isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
          {/* Back button */}
          <button
            onClick={() => {
              setShowVoiceCall(false);
              setSelectedCoach(null);
            }}
            className="absolute top-4 left-4 z-10 flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Coaches</span>
          </button>
          
          <div className="h-full flex items-center justify-center p-8">
            <VoiceInterface
              agent={selectedCoach}
              user={user || { id: effectiveUserId }}
              mode="onboarding"
              onConversationComplete={(data) => {
                console.log('Conversation complete:', data);
                handleVoiceComplete({
                  goals: data.goals || [],
                  transcript: data.transcript,
                  duration: data.duration
                });
                setShowVoiceCall(false);
                setSelectedCoach(null);
              }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
        }
        .animate-gradient {
          animation: gradient 20s ease infinite;
        }
      `}</style>
    </div>
  );
}