'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowPathIcon, StarIcon, CheckIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentPersona {
  uuid: string;
  Name: string;
  Speciality: string;
  'Key Features'?: string;
  Personality?: string;
  Image: string;
  '11labs_agentID': string;
  availability_status: string;
  average_rating?: number | null;
}

interface AgentSelectionProps {
  onSelectAgent: (agentId: string, agentName: string) => void;
  selectedAgentId?: string;
}

export function AgentSelection({ onSelectAgent, selectedAgentId }: AgentSelectionProps) {
  const [agents, setAgents] = useState<AgentPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  // Adaptive batch size based on screen width
  const getLimit = () => {
    if (typeof window === 'undefined') return 3;
    const width = window.innerWidth;
    if (width < 768) return 3; // Mobile: 1 column, 3 agents
    if (width < 1024) return 4; // Tablet: 2 columns, 4 agents
    return 6; // Desktop: 3 columns, 6 agents
  };
  
  const [limit, setLimit] = useState(getLimit());

  const fetchAgents = async (isLoadMore = false) => {
    try {
      // Prevent loading if we already know there are no more
      if (isLoadMore && !hasMore) {
        console.log('No more agents to load, skipping fetch');
        return;
      }
      
      const currentOffset = isLoadMore ? agents.length : 0;
      console.log(`Fetching agents with offset: ${currentOffset}, limit: ${limit}, current agents count: ${agents.length}`);
      
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setOffset(0); // Reset offset for initial load
      }
      
      const supabase = createClient();
      
      // First, get total count if loading more
      if (isLoadMore) {
        const { count } = await supabase
          .from('agent_personae')
          .select('*', { count: 'exact', head: true })
          .not('11labs_agentID', 'is', null)
          .eq('availability_status', 'available');
        
        if (count && currentOffset >= count) {
          console.log(`Already loaded all ${count} agents`);
          setHasMore(false);
          setLoadingMore(false);
          return;
        }
      }
      
      const { data, error } = await supabase
        .from('agent_personae')
        .select('uuid, Name, Speciality, Image, "11labs_agentID", availability_status')
        .not('11labs_agentID', 'is', null)
        .eq('availability_status', 'available')
        .order('Name')
        .range(currentOffset, currentOffset + limit - 1);

      console.log('Query result:', { data, error, count: data?.length, offset: currentOffset });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      const newAgents = data || [];
      
      if (isLoadMore) {
        setAgents(prev => [...prev, ...newAgents]);
      } else {
        setAgents(newAgents);
      }
      
      // Check if there are more agents to load
      if (newAgents.length < limit) {
        setHasMore(false);
        console.log('No more agents to load');
      }
      
      // Also check for duplicates (safety check)
      if (isLoadMore && newAgents.length > 0) {
        const existingIds = new Set(agents.map(a => a.uuid));
        const hasDuplicates = newAgents.some(agent => existingIds.has(agent.uuid));
        if (hasDuplicates) {
          setHasMore(false);
          console.log('Duplicate agents detected, stopping pagination');
          return;
        }
      }
      
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(`Failed to load agents: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    
    // Update limit on window resize
    const handleResize = () => {
      setLimit(getLimit());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // Adaptive trigger distance based on viewport height
      // Mobile: trigger at 50% of viewport height from bottom
      // Tablet/Desktop: trigger at 75% of viewport height from bottom
      const triggerDistance = windowHeight * (windowHeight < 768 ? 0.5 : 0.75);

      if (scrollTop + windowHeight >= docHeight - triggerDistance) {
        fetchAgents(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, agents.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <ArrowPathIcon  className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading available coaches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Choose Your AI Coach</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select a specialized coach to guide you through your personalized journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {agents.map((agent, index) => (
            <motion.div
              key={agent.uuid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`relative h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${
                  selectedAgentId === agent['11labs_agentID'] ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onSelectAgent(agent['11labs_agentID'], agent.Name)}
              >
                {selectedAgentId === agent['11labs_agentID'] && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-primary text-primary-foreground">
                      <CheckIcon  className="w-3 h-3 mr-1" />
                      Selected
                    </Badge>
                  </div>
                )}
                
                {/* Agent Image */}
                {agent.Image && (
                  <div className="relative h-72 w-full overflow-hidden rounded-t-lg">
                    <img
                      src={agent.Image}
                      alt={agent.Name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <h3 className="text-xl font-bold">{agent.Name}</h3>
                    </div>
                  </div>
                )}
                
                <CardHeader className={!agent.Image ? '' : 'pt-4'}>
                  {!agent.Image && <CardTitle>{agent.Name}</CardTitle>}
                  <CardDescription className="font-medium text-sm">
                    {agent.Speciality}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full" 
                    variant={selectedAgentId === agent['11labs_agentID'] ? 'default' : 'outline'}
                  >
                    {selectedAgentId === agent['11labs_agentID'] ? 'Selected' : 'Select Coach'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {agents.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No coaches are available at this time.</p>
        </div>
      )}

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <ArrowPathIcon  className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading more coaches...</p>
          </div>
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && agents.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">You've seen all available coaches</p>
        </div>
      )}
    </div>
  );
}