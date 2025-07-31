"use client";

import * as React from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { StarIcon, SparklesIcon, ChevronRightIcon, ArrowPathIcon, CpuChipIcon, HeartIcon, PlayIcon } from '@heroicons/react/24/outline';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";

interface AgentPersona {
  uuid: string;
  Name: string;
  Speciality: string;
  "Key Features": string;
  Personality: string;
  Image: string;
  "11labs_agentID": string;
  availability_status: string;
  average_rating: number | null;
  video_intro?: string;
}

interface AgentCardProps {
  agent: AgentPersona;
  onSelect: (agentId: string, elevenLabsId: string) => void;
  isSelected?: boolean;
  enableAnimations?: boolean;
  className?: string;
  theme?: 'rose-quartz' | 'lavender' | 'peachy' | 'mauve';
}

// Theme-specific styling configurations
const themeStyles = {
  'rose-quartz': {
    cardBorder: "border-rose-200/30",
    cardHoverBorder: "hover:border-rose-300/50",
    glassOverlay: "bg-rose-50/10",
    statusAvailable: "border-rose-500 text-rose-700 bg-rose-50/80",
    statusUnavailable: "border-rose-300 text-rose-600 bg-rose-50/80",
    ratingBadge: "bg-rose-50/80 text-rose-700 border-rose-200",
    featureBadge: "bg-rose-100/50 text-rose-700 border-rose-200",
    primaryButton: "bg-rose-500 hover:bg-rose-600 text-white",
    selectedRing: "ring-rose-400",
    shimmer: "from-transparent via-rose-200/20 to-transparent",
    introButton: "bg-purple-900/80 text-purple-100",
    videoBadge: "bg-rose-100/80 text-rose-700"
  },
  'lavender': {
    cardBorder: "border-purple-200/30",
    cardHoverBorder: "hover:border-purple-300/50",
    glassOverlay: "bg-purple-50/10",
    statusAvailable: "border-purple-500 text-purple-700 bg-purple-50/80",
    statusUnavailable: "border-purple-300 text-purple-600 bg-purple-50/80",
    ratingBadge: "bg-purple-50/80 text-purple-700 border-purple-200",
    featureBadge: "bg-purple-100/50 text-purple-700 border-purple-200",
    primaryButton: "bg-purple-500 hover:bg-purple-600 text-white",
    selectedRing: "ring-purple-400",
    shimmer: "from-transparent via-purple-200/20 to-transparent",
    introButton: "bg-pink-900/80 text-pink-100",
    videoBadge: "bg-purple-100/80 text-purple-700"
  },
  'peachy': {
    cardBorder: "border-orange-200/30",
    cardHoverBorder: "hover:border-orange-300/50",
    glassOverlay: "bg-orange-50/10",
    statusAvailable: "border-orange-500 text-orange-700 bg-orange-50/80",
    statusUnavailable: "border-orange-300 text-orange-600 bg-orange-50/80",
    ratingBadge: "bg-orange-50/80 text-orange-700 border-orange-200",
    featureBadge: "bg-orange-100/50 text-orange-700 border-orange-200",
    primaryButton: "bg-orange-500 hover:bg-orange-600 text-white",
    selectedRing: "ring-orange-400",
    shimmer: "from-transparent via-orange-200/20 to-transparent",
    introButton: "bg-rose-900/80 text-rose-100",
    videoBadge: "bg-orange-100/80 text-orange-700"
  },
  'mauve': {
    cardBorder: "border-purple-300/30",
    cardHoverBorder: "hover:border-purple-400/50",
    glassOverlay: "bg-purple-100/10",
    statusAvailable: "border-purple-600 text-purple-800 bg-purple-50/80",
    statusUnavailable: "border-purple-400 text-purple-700 bg-purple-50/80",
    ratingBadge: "bg-purple-50/80 text-purple-800 border-purple-300",
    featureBadge: "bg-purple-100/50 text-purple-800 border-purple-300",
    primaryButton: "bg-purple-600 hover:bg-purple-700 text-white",
    selectedRing: "ring-purple-500",
    shimmer: "from-transparent via-purple-300/20 to-transparent",
    introButton: "bg-rose-900/80 text-rose-100",
    videoBadge: "bg-purple-100/80 text-purple-800"
  }
};

function AgentCard({
  agent,
  onSelect,
  isSelected = false,
  enableAnimations = true,
  className,
  theme = 'rose-quartz'
}: AgentCardProps) {
  const [rotation, setRotation] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = React.useState(false);
  const [showVideoIntro, setShowVideoIntro] = React.useState(false);
  const [isVideoIntroLoaded, setIsVideoIntroLoaded] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const videoIntroRef = React.useRef<HTMLVideoElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;
  
  const styles = themeStyles[theme];

  // Cleanup video intro when component unmounts or video changes
  React.useEffect(() => {
    return () => {
      if (videoIntroRef.current) {
        videoIntroRef.current.pause();
        videoIntroRef.current.src = '';
      }
    };
  }, [agent.video_intro]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!shouldAnimate || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotationX = (y - centerY) / 20;
    const rotationY = -(x - centerX) / 20;
    
    setRotation({ x: rotationX, y: rotationY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Resume video playback on hover if it's a video
    if (videoRef.current && agent.Image?.toLowerCase().endsWith('.mp4')) {
      videoRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  };

  // Parse key features from the string format
  const keyFeatures = agent["Key Features"]
    ? agent["Key Features"].split(/[-•]/).filter(f => f.trim()).map(f => f.trim())
    : [];

  const containerVariants = {
    rest: { 
      scale: 1,
      y: 0,
      filter: "blur(0px)",
    },
    hover: shouldAnimate ? { 
      scale: 1.02, 
      y: -8,
      filter: "blur(0px)",
      transition: { 
        type: "spring" as const, 
        stiffness: 400, 
        damping: 28,
        mass: 0.6,
      }
    } : {
      scale: 1,
      y: 0,
      filter: "blur(0px)",
    },
  };

  const imageVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
  };

  return (
    <motion.div
      ref={cardRef}
      initial="rest"
      whileHover="hover"
      variants={containerVariants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={shouldAnimate ? { 
        transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        transformStyle: "preserve-3d"
      } : {}}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg transition-all duration-300",
        "hover:shadow-xl group h-[720px] flex flex-col",
        styles.cardBorder,
        styles.cardHoverBorder,
        isSelected && `ring-2 ${styles.selectedRing} ring-offset-2 ring-offset-background`,
        className
      )}
    >
      {/* Glass effect overlay */}
      <div className={cn(
        "absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm",
        styles.glassOverlay
      )} />
      
      {/* Card content */}
      <div className="relative z-20 flex flex-col h-full">
        {/* Image/Video section */}
        <div className="relative h-72 overflow-hidden group">
          {/* Video Intro (shown when play button is clicked) */}
          {showVideoIntro && agent.video_intro && (
            <div className="absolute inset-0 z-30 bg-black">
              <video
                ref={videoIntroRef}
                src={agent.video_intro}
                className="w-full h-full object-cover"
                autoPlay
                controls
                onLoadedData={() => setIsVideoIntroLoaded(true)}
                onEnded={() => setShowVideoIntro(false)}
                onError={() => {
                  console.error('Failed to load video intro');
                  setShowVideoIntro(false);
                }}
              />
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVideoIntro(false);
                }}
                className="absolute top-2 right-2 z-40 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Play Button Overlay (shown when video_intro exists) */}
          {agent.video_intro && !showVideoIntro && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVideoIntro(true);
              }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <div className="bg-white/90 rounded-full p-4 shadow-lg transform transition-transform group-hover:scale-110">
                <PlayIcon  className="w-8 h-8 text-gray-900" fill="currentColor" />
              </div>
            </button>
          )}

          {agent.Image && agent.Image.toLowerCase().endsWith('.mp4') ? (
            <>
              {/* Show placeholder while video loads */}
              {!isVideoLoaded && (
                <img
                  src="/placeholder-avatar.png"
                  alt={agent.Name}
                  className="w-full h-full object-cover absolute inset-0"
                />
              )}
              <motion.video
                ref={videoRef}
                src={agent.Image}
                className={cn(
                  "w-full h-full object-cover",
                  !isVideoLoaded && "opacity-0"
                )}
                variants={imageVariants}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                onLoadedData={() => setIsVideoLoaded(true)}
                onError={(e) => {
                  const target = e.target as HTMLVideoElement;
                  // Replace video with placeholder image on error
                  const img = document.createElement('img');
                  img.src = '/placeholder-avatar.png';
                  img.className = 'w-full h-full object-cover';
                  target.parentNode?.replaceChild(img, target);
                }}
              />
            </>
          ) : (
            <motion.img
              src={agent.Image || '/placeholder-avatar.png'}
              alt={agent.Name}
              className="w-full h-full object-cover"
              variants={imageVariants}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-avatar.png';
              }}
            />
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent" />
          
          {/* Rating badge */}
          {agent.average_rating && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className={cn("backdrop-blur-sm", styles.ratingBadge)}>
                <StarIcon  className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                {agent.average_rating.toFixed(1)}
              </Badge>
            </div>
          )}
          
          {/* Status badge */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "backdrop-blur-sm",
                agent.availability_status === 'available' 
                  ? styles.statusAvailable
                  : styles.statusUnavailable
              )}
            >
              {agent.availability_status}
            </Badge>
            {agent.video_intro && (
              <Badge 
                variant="secondary" 
                className={cn("backdrop-blur-sm", styles.introButton)}
              >
                <PlayIcon  className="w-3 h-3 mr-1" />
                Intro Available
              </Badge>
            )}
          </div>
        </div>

        {/* Content section */}
        <div className="flex-1 p-6 flex flex-col">
          {/* Name and specialty */}
          <div className="space-y-2 mb-4">
            <h3 className="text-xl font-bold text-foreground leading-tight">
              {agent.Name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CpuChipIcon  className="w-4 h-4" />
              <span>{agent.Speciality}</span>
            </div>
          </div>

          {/* Personality */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <HeartIcon  className="w-4 h-4" />
              <span>Personality</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {agent.Personality}
            </p>
          </div>

          {/* Key features */}
          {keyFeatures.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <SparklesIcon  className="w-4 h-4" />
                Key Features
              </h4>
              <div className="flex flex-wrap gap-2">
                {keyFeatures.slice(0, 3).map((feature, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className={cn("text-xs", styles.featureBadge)}
                  >
                    {feature}
                  </Badge>
                ))}
                {keyFeatures.length > 3 && (
                  <Badge variant="outline" className={cn("text-xs", styles.featureBadge)}>
                    +{keyFeatures.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Spacer to push button to bottom */}
          <div className="flex-1" />
          
          {/* Select button */}
          <div className="mt-auto">
            <Button
              onClick={() => onSelect(agent.uuid, agent["11labs_agentID"])}
              className={cn(
                "w-full group relative overflow-hidden",
                styles.primaryButton,
                isSelected && "opacity-90"
              )}
              disabled={isSelected || agent.availability_status !== 'available'}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSelected ? "Selected" : agent.availability_status === 'available' ? "Select Agent" : "Unavailable"}
                {!isSelected && agent.availability_status === 'available' && (
                  <ChevronRightIcon  className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                )}
              </span>
              {/* Shine effect */}
              {agent.availability_status === 'available' && (
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-r translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out",
                  styles.shimmer
                )} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface AgentSelectionInterfaceProps {
  onAgentSelect?: (agentId: string, elevenLabsId: string) => void;
  selectedAgentId?: string;
  enableAnimations?: boolean;
  className?: string;
  theme?: 'rose-quartz' | 'lavender' | 'peachy' | 'mauve';
}

export function AgentSelectionInterfaceFeminine({
  onAgentSelect,
  selectedAgentId,
  enableAnimations = true,
  className,
  theme = 'rose-quartz'
}: AgentSelectionInterfaceProps) {
  const [agents, setAgents] = React.useState<AgentPersona[]>([]);
  const [selectedAgent, setSelectedAgent] = React.useState<string | null>(selectedAgentId || null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  React.useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('agent_personae')
        .select(`
          uuid,
          "Name",
          "Speciality", 
          "Key Features",
          "Personality",
          "Image",
          "11labs_agentID",
          availability_status,
          average_rating,
          video_intro
        `)
        .not('11labs_agentID', 'is', null)
        .eq('availability_status', 'available')
        .order('"Name"');

      if (error) {
        throw error;
      }

      setAgents(data || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError('Failed to load agents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentSelect = (agentId: string, elevenLabsId: string) => {
    setSelectedAgent(agentId);
    onAgentSelect?.(agentId, elevenLabsId);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };

  const headerVariants = {
    hidden: { 
      opacity: 0, 
      y: -20,
      filter: "blur(4px)"
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 28,
        mass: 0.6,
      },
    },
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95,
      filter: "blur(4px)"
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 28,
        mass: 0.6,
      },
    },
  };

  // Theme-specific header colors
  const headerColors = {
    'rose-quartz': 'text-rose-900',
    'lavender': 'text-purple-900',
    'peachy': 'text-orange-900',
    'mauve': 'text-purple-900'
  };

  const subheaderColors = {
    'rose-quartz': 'text-rose-700',
    'lavender': 'text-purple-700',
    'peachy': 'text-orange-700',
    'mauve': 'text-purple-700'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <ArrowPathIcon  className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading coaching agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-500">{error}</p>
          <Button onClick={fetchAgents} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">No agents available at the moment.</p>
          <Button onClick={fetchAgents} variant="outline">
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const selectedAgentData = agents.find(a => a.uuid === selectedAgent);

  return (
    <motion.div
      variants={shouldAnimate ? containerVariants : {}}
      initial={shouldAnimate ? "hidden" : "visible"}
      animate="visible"
      className={cn("w-full max-w-7xl mx-auto p-6 space-y-8", className)}
    >
      {/* Header */}
      <motion.div 
        variants={shouldAnimate ? headerVariants : {}}
        className="text-center space-y-4"
      >
        <h1 className={cn("text-3xl md:text-4xl font-bold", headerColors[theme])}>
          Choose Your AI Coach
        </h1>
        <p className={cn("text-lg max-w-2xl mx-auto", subheaderColors[theme])}>
          Select the perfect AI coaching agent to guide your voice onboarding journey. 
          Each agent brings unique expertise and personality to help you succeed.
        </p>
      </motion.div>

      {/* Agent Grid */}
      <motion.div
        variants={shouldAnimate ? gridVariants : {}}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {agents.map((agent) => (
          <motion.div
            key={agent.uuid}
            variants={shouldAnimate ? cardVariants : {}}
          >
            <AgentCard
              agent={agent}
              onSelect={handleAgentSelect}
              isSelected={selectedAgent === agent.uuid}
              enableAnimations={enableAnimations}
              theme={theme}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Selected Agent Summary */}
      <AnimatePresence>
        {selectedAgent && selectedAgentData && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={cn(
              "border rounded-2xl p-6",
              theme === 'rose-quartz' && "bg-rose-50/50 border-rose-200",
              theme === 'lavender' && "bg-purple-50/50 border-purple-200",
              theme === 'peachy' && "bg-orange-50/50 border-orange-200",
              theme === 'mauve' && "bg-purple-50/50 border-purple-300"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h3 className={cn("text-lg font-semibold", headerColors[theme])}>
                  Selected Agent: {selectedAgentData.Name}
                </h3>
                <p className={subheaderColors[theme]}>
                  Ready to begin your voice onboarding journey with {selectedAgentData.Name}.
                </p>
                <p className="text-xs text-muted-foreground">
                  ElevenLabs ID: {selectedAgentData["11labs_agentID"]}
                </p>
              </div>
              <Button size="lg" className={cn("ml-4", themeStyles[theme].primaryButton)}>
                Continue to Voice Chat
                <ChevronRightIcon  className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}