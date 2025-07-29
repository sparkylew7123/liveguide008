"use client";

import * as React from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Loader2, Users, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/utils/supabase/client";
import { AgentCardRedesigned } from "./AgentCardRedesigned";

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

interface AgentSelectionInterfaceProps {
  onAgentSelect?: (agentId: string, elevenLabsId: string) => void;
  selectedAgentId?: string;
  enableAnimations?: boolean;
  className?: string;
  theme?: 'rose-quartz' | 'lavender' | 'peachy' | 'mauve';
}

export function AgentSelectionInterfaceRedesigned({
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
        .order('average_rating', { ascending: false, nullsLast: true })
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

  const selectedAgentData = agents.find(a => a.uuid === selectedAgent);

  // Theme-specific styles
  const themeStyles = {
    'rose-quartz': {
      header: "from-rose-50 to-pink-50",
      title: "text-gray-900",
      subtitle: "text-gray-600",
      selectedCard: "bg-rose-50/50 border-rose-200",
      continueButton: "bg-rose-500 hover:bg-rose-600"
    },
    'lavender': {
      header: "from-purple-50 to-indigo-50",
      title: "text-gray-900",
      subtitle: "text-gray-600",
      selectedCard: "bg-purple-50/50 border-purple-200",
      continueButton: "bg-purple-500 hover:bg-purple-600"
    },
    'peachy': {
      header: "from-orange-50 to-amber-50",
      title: "text-gray-900",
      subtitle: "text-gray-600",
      selectedCard: "bg-orange-50/50 border-orange-200",
      continueButton: "bg-orange-500 hover:bg-orange-600"
    },
    'mauve': {
      header: "from-purple-100 to-pink-100",
      title: "text-gray-900",
      subtitle: "text-gray-600",
      selectedCard: "bg-purple-100/50 border-purple-300",
      continueButton: "bg-purple-600 hover:bg-purple-700"
    }
  };

  const styles = themeStyles[theme];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-gray-400 mx-auto" />
          <p className="text-gray-600 font-medium">Loading AI coaches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Alert className="max-w-md">
          <AlertDescription className="text-center space-y-4">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchAgents} variant="outline" size="sm">
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Alert className="max-w-md">
          <Users className="w-5 h-5" />
          <AlertDescription className="text-center space-y-4">
            <p>No coaches available at the moment.</p>
            <Button onClick={fetchAgents} variant="outline" size="sm">
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-8", className)}>
      {/* Header Section - Cleaner, more professional */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center space-y-3 px-4"
      >
        <div className={cn("absolute inset-x-0 top-0 h-64 bg-gradient-to-b opacity-30", styles.header)} />
        <h1 className={cn("text-3xl md:text-4xl font-bold tracking-tight relative", styles.title)}>
          Choose Your AI Coach
        </h1>
        <p className={cn("text-base md:text-lg max-w-2xl mx-auto leading-relaxed relative", styles.subtitle)}>
          Select a coaching agent that matches your learning style and goals
        </p>
      </motion.div>

      {/* Main Content Area */}
      <div className="px-4 md:px-6 max-w-7xl mx-auto">
        {/* Agent Grid - Responsive with better spacing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {agents.map((agent, index) => (
            <motion.div
              key={agent.uuid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: shouldAnimate ? index * 0.05 : 0 
              }}
            >
              <AgentCardRedesigned
                agent={agent}
                onSelect={handleAgentSelect}
                isSelected={selectedAgent === agent.uuid}
                enableAnimations={enableAnimations}
                theme={theme}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Selected Agent Confirmation - Simplified */}
        <AnimatePresence>
          {selectedAgent && selectedAgentData && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              <Card className={cn(
                "p-6 border-2",
                styles.selectedCard
              )}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div className="text-center md:text-left">
                      <h3 className="font-semibold text-gray-900">
                        {selectedAgentData.Name} Selected
                      </h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        Ready to begin your voice onboarding journey
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    className={cn("font-medium shadow-sm", styles.continueButton)}
                  >
                    Continue to Voice Chat
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}