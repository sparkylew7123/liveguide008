'use client';

import { PlasmicComponent } from '@plasmicapp/loader-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  voice?: string;
  specialties?: string[];
}

interface AgentsGalleryClientProps {
  agents: Agent[];
  isAuthenticated: boolean;
  showFilters?: boolean;
  gridColumns?: number;
}

export function AgentsGalleryClient({
  agents,
  isAuthenticated,
  showFilters = true,
  gridColumns = 3,
}: AgentsGalleryClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAgentSelect = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    
    if (!agent) return;

    if (!isAuthenticated) {
      showToast({
        title: 'Sign in required',
        description: 'Please sign in to start a conversation with ' + agent.name,
        type: 'info',
      });
      router.push('/auth/signin');
      return;
    }

    // Navigate to the agent conversation or store selection
    showToast({
      title: 'Starting conversation',
      description: `Connecting you with ${agent.name}...`,
      type: 'success',
    });
    
    // Store selected agent and navigate
    localStorage.setItem('selectedAgentId', agentId);
    router.push('/conversation');
  };

  // Filter agents based on search and specialty
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = searchQuery === '' || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialty = selectedSpecialty === 'all' ||
      agent.specialties?.includes(selectedSpecialty);
    
    return matchesSearch && matchesSpecialty;
  });

  // Extract all unique specialties
  const allSpecialties = Array.from(
    new Set(agents.flatMap(agent => agent.specialties || []))
  );

  return (
    <PlasmicComponent
      component="AgentsGallery"
      componentProps={{
        agents: filteredAgents,
        isAuthenticated,
        showFilters,
        gridColumns,
        
        // Interaction handlers
        onAgentSelect: handleAgentSelect,
        onSearchChange: setSearchQuery,
        onSpecialtyChange: setSelectedSpecialty,
        
        // Filter data
        searchQuery,
        selectedSpecialty,
        specialties: ['all', ...allSpecialties],
        
        // Additional props
        emptyStateMessage: filteredAgents.length === 0 
          ? 'No agents match your search criteria' 
          : undefined,
      }}
    />
  );
}