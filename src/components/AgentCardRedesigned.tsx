"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Star, Brain, Heart, Sparkles, Play, Info, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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

// Simplified theme configuration focused on readability
const themeStyles = {
  'rose-quartz': {
    card: "border-rose-200/50 hover:border-rose-300/70 hover:shadow-rose-100/50",
    header: "bg-gradient-to-br from-rose-50/80 to-pink-50/60",
    badge: {
      available: "bg-emerald-50 text-emerald-700 border-emerald-200",
      unavailable: "bg-gray-50 text-gray-600 border-gray-200",
      rating: "bg-amber-50 text-amber-700 border-amber-200"
    },
    button: "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200/50",
    selected: "ring-2 ring-rose-400 ring-offset-2 bg-rose-50/20"
  },
  'lavender': {
    card: "border-purple-200/50 hover:border-purple-300/70 hover:shadow-purple-100/50",
    header: "bg-gradient-to-br from-purple-50/80 to-indigo-50/60",
    badge: {
      available: "bg-emerald-50 text-emerald-700 border-emerald-200",
      unavailable: "bg-gray-50 text-gray-600 border-gray-200",
      rating: "bg-amber-50 text-amber-700 border-amber-200"
    },
    button: "bg-purple-500 hover:bg-purple-600 text-white shadow-purple-200/50",
    selected: "ring-2 ring-purple-400 ring-offset-2 bg-purple-50/20"
  },
  'peachy': {
    card: "border-orange-200/50 hover:border-orange-300/70 hover:shadow-orange-100/50",
    header: "bg-gradient-to-br from-orange-50/80 to-amber-50/60",
    badge: {
      available: "bg-emerald-50 text-emerald-700 border-emerald-200",
      unavailable: "bg-gray-50 text-gray-600 border-gray-200",
      rating: "bg-amber-50 text-amber-700 border-amber-200"
    },
    button: "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200/50",
    selected: "ring-2 ring-orange-400 ring-offset-2 bg-orange-50/20"
  },
  'mauve': {
    card: "border-purple-300/50 hover:border-purple-400/70 hover:shadow-purple-200/50",
    header: "bg-gradient-to-br from-purple-100/80 to-pink-100/60",
    badge: {
      available: "bg-emerald-50 text-emerald-700 border-emerald-200",
      unavailable: "bg-gray-50 text-gray-600 border-gray-200",
      rating: "bg-amber-50 text-amber-700 border-amber-200"
    },
    button: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-300/50",
    selected: "ring-2 ring-purple-500 ring-offset-2 bg-purple-100/20"
  }
};

export function AgentCardRedesigned({
  agent,
  onSelect,
  isSelected = false,
  enableAnimations = true,
  className,
  theme = 'rose-quartz'
}: AgentCardProps) {
  const [showVideoIntro, setShowVideoIntro] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;
  
  const styles = themeStyles[theme];
  
  // Parse key features with better formatting
  const keyFeatures = React.useMemo(() => {
    if (!agent["Key Features"]) return [];
    return agent["Key Features"]
      .split(/[-•]/)
      .filter(f => f.trim())
      .map(f => f.trim());
  }, [agent["Key Features"]]);

  // Format personality into shorter, readable chunks
  const personalityTraits = React.useMemo(() => {
    const personality = agent.Personality || "";
    // Extract key traits from personality description
    const words = personality.split(/[,.]/).filter(w => w.trim());
    return words.slice(0, 3).map(w => w.trim());
  }, [agent.Personality]);

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: shouldAnimate ? {
      y: -4,
      transition: { duration: 0.2, ease: "easeOut" }
    } : {}
  };

  const isAvailable = agent.availability_status === 'available';

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={containerVariants}
      className={cn("h-full", className)}
    >
      <Card className={cn(
        "h-full flex flex-col overflow-hidden transition-all duration-200",
        "hover:shadow-lg",
        styles.card,
        isSelected && styles.selected
      )}>
        {/* Image/Video Section - Reduced height for better content visibility */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {agent.Image && !imageError ? (
            // Check if it's a video file
            agent.Image.match(/\.(mp4|webm|ogg|mov)$/i) ? (
              <video
                src={agent.Image}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                onError={() => setImageError(true)}
              />
            ) : (
              <img
                src={agent.Image}
                alt={agent.Name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Brain className="w-16 h-16 text-gray-300" />
            </div>
          )}
          
          {/* Overlay gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          
          {/* Status and Rating badges - Top corners for easy scanning */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <Badge 
              variant="secondary" 
              className={cn(
                "font-medium",
                isAvailable ? styles.badge.available : styles.badge.unavailable
              )}
            >
              {isAvailable ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Available
                </>
              ) : (
                "Unavailable"
              )}
            </Badge>
            
            {agent.average_rating && (
              <Badge variant="secondary" className={cn("font-medium", styles.badge.rating)}>
                <Star className="w-3 h-3 mr-1 fill-current" />
                {agent.average_rating.toFixed(1)}
              </Badge>
            )}
          </div>
          
        </div>

        {/* Header Section - Clear hierarchy */}
        <CardHeader className={cn("pb-3", styles.header)}>
          <CardTitle className="text-xl font-semibold tracking-tight">
            {agent.Name}
          </CardTitle>
          <CardDescription className="text-sm font-medium mt-1 flex items-center gap-1.5">
            <Brain className="w-4 h-4" />
            {agent.Speciality}
          </CardDescription>
        </CardHeader>

        {/* Content Section - Organized information */}
        <CardContent className="flex-1 space-y-4 pb-4">
          {/* Personality Section - Simplified */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              Personality
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {agent.Personality}
            </p>
          </div>

          <Separator className="my-3" />

          {/* Key Features - Better visibility */}
          {keyFeatures.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Key Capabilities
              </h4>
              <ScrollArea className="h-24 pr-2">
                <ul className="space-y-1.5">
                  {keyFeatures.map((feature, index) => (
                    <li 
                      key={index}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span className="flex-1">{feature}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </CardContent>

        {/* Footer Section - Clear CTA */}
        <CardFooter className="pt-0 pb-4 px-6">
          <Button
            onClick={() => onSelect(agent.uuid, agent["11labs_agentID"])}
            disabled={!isAvailable || isSelected}
            className={cn(
              "w-full font-medium",
              styles.button,
              isSelected && "opacity-80"
            )}
            size="lg"
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Selected
              </>
            ) : isAvailable ? (
              "Select This Coach"
            ) : (
              "Currently Unavailable"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Video Modal - Simplified */}
      {showVideoIntro && agent.video_intro && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowVideoIntro(false)}
        >
          <div className="relative max-w-3xl w-full bg-white rounded-lg overflow-hidden">
            <video
              src={agent.video_intro}
              className="w-full"
              autoPlay
              controls
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowVideoIntro(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}