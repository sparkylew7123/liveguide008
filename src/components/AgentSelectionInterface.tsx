"use client";

import * as React from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, ChevronRight, Loader2, Brain, Heart } from "lucide-react";
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
}

interface AgentCardProps {
  agent: AgentPersona;
  onSelect: (agentId: string, elevenLabsId: string) => void;
  isSelected?: boolean;
  enableAnimations?: boolean;
  className?: string;
}

function AgentCard({
  agent,
  onSelect,
  isSelected = false,
  enableAnimations = true,
  className
}: AgentCardProps) {
  const [rotation, setRotation] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

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
        type: "spring", 
        stiffness: 400, 
        damping: 28,
        mass: 0.6,
      }
    } : {},
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
        "relative overflow-hidden rounded-2xl border border-border/20 bg-card shadow-lg transition-all duration-300",
        "hover:shadow-xl hover:border-border/40 group",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 dark:bg-black/20 backdrop-blur-sm" />
      
      {/* Card content */}
      <div className="relative z-20 flex flex-col h-full">
        {/* Image section */}
        <div className="relative h-48 overflow-hidden">
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
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          
          {/* Rating badge */}
          {agent.average_rating && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                {agent.average_rating.toFixed(1)}
              </Badge>
            </div>
          )}
          
          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <Badge 
              variant="outline" 
              className={cn(
                "bg-background/80 backdrop-blur-sm",
                agent.availability_status === 'available' 
                  ? "border-green-500 text-green-700" 
                  : "border-orange-500 text-orange-700"
              )}
            >
              {agent.availability_status}
            </Badge>
          </div>
        </div>

        {/* Content section */}
        <div className="flex-1 p-6 space-y-4">
          {/* Name and specialty */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground leading-tight">
              {agent.Name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-4 h-4" />
              <span>{agent.Speciality}</span>
            </div>
          </div>

          {/* Personality */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Heart className="w-4 h-4" />
              <span>Personality</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {agent.Personality}
            </p>
          </div>

          {/* Key features */}
          {keyFeatures.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Key Features
              </h4>
              <div className="flex flex-wrap gap-2">
                {keyFeatures.slice(0, 3).map((feature, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs bg-muted/50"
                  >
                    {feature}
                  </Badge>
                ))}
                {keyFeatures.length > 3 && (
                  <Badge variant="outline" className="text-xs bg-muted/50">
                    +{keyFeatures.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Select button */}
          <div className="pt-2">
            <Button
              onClick={() => onSelect(agent.uuid, agent["11labs_agentID"])}
              className={cn(
                "w-full group relative overflow-hidden",
                isSelected && "bg-primary/90"
              )}
              disabled={isSelected || agent.availability_status !== 'available'}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSelected ? "Selected" : agent.availability_status === 'available' ? "Select Agent" : "Unavailable"}
                {!isSelected && agent.availability_status === 'available' && (
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                )}
              </span>
              {/* Shine effect */}
              {agent.availability_status === 'available' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
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
}

export function AgentSelectionInterface({
  onAgentSelect,
  selectedAgentId,
  enableAnimations = true,
  className
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
          average_rating
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Choose Your AI Coach
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
            className="bg-primary/5 border border-primary/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Selected Agent: {selectedAgentData.Name}
                </h3>
                <p className="text-muted-foreground">
                  Ready to begin your voice onboarding journey with {selectedAgentData.Name}.
                </p>
                <p className="text-xs text-muted-foreground">
                  ElevenLabs ID: {selectedAgentData["11labs_agentID"]}
                </p>
              </div>
              <Button size="lg" className="ml-4">
                Continue to Voice Chat
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}