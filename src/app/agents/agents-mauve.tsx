'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AgentSelectionInterfaceFeminine } from '@/components/AgentSelectionInterfaceFeminine';
import { SimpleVoiceOnboarding } from '@/components/SimpleVoiceOnboarding';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface AgentDetails {
  uuid: string;
  Name: string;
  Speciality: string;
  'Key Features': string;
  Personality: string;
  Image: string;
  '11labs_agentID': string;
  availability_status: string;
  average_rating: number | null;
  video_intro?: string;
}

// Mauve Sophistication Theme
// Psychological Principles:
// - Mauve combines strength of purple with softness of pink
// - Conveys professionalism while maintaining approachability
// - Dusty tones reduce visual fatigue during extended use
// - Creates an atmosphere of quiet confidence and expertise

export default function AgentsPageMauve() {
  const router = useRouter();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedAgentName, setSelectedAgentName] = useState<string>('');
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<AgentDetails | null>(null);
  const [showVoiceOnboarding, setShowVoiceOnboarding] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [userName, setUserName] = useState<string>('');
  
  // Get authenticated user info on mount
  useEffect(() => {
    const getUserInfo = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // First try to get from user metadata, then email
        const name = user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.email?.split('@')[0] || 
                    'User';
        setUserName(name);
      }
    };
    
    getUserInfo();
  }, []);

  const handleAgentSelect = async (agentId: string, elevenLabsId: string) => {
    setSelectedAgentId(elevenLabsId);
    setSelectedAgentName('');
    setLoadingDetails(true);
    
    // Lazy load full agent details
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('agent_personae')
        .select('uuid, Name, Speciality, "Key Features", Personality, Image, "11labs_agentID", availability_status, average_rating, video_intro')
        .eq('11labs_agentID', elevenLabsId)
        .single();
      
      if (error) {
        console.error('Error loading agent details:', error);
      } else {
        setSelectedAgentDetails(data);
        setSelectedAgentName(data.Name);
      }
    } catch (error) {
      console.error('Error loading agent details:', error);
    } finally {
      setLoadingDetails(false);
    }
    
    // Automatically start voice conversation when agent is selected
    setShowVoiceOnboarding(true);
  };

  const handleBack = () => {
    if (showVoiceOnboarding) {
      setShowVoiceOnboarding(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-rose-50 to-pink-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2 hover:bg-purple-100/50 text-purple-800"
          >
            <ArrowLeft className="w-4 h-4" />
            {showVoiceOnboarding ? 'Back to Agent Selection' : 'Back to Home'}
          </Button>
        </div>

        {/* Content */}
        {!showVoiceOnboarding ? (
          <div className="space-y-8">
            <AgentSelectionInterfaceFeminine
              onAgentSelect={handleAgentSelect}
              selectedAgentId={selectedAgentId}
              theme="mauve"
            />
            
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-purple-900">Voice Onboarding</h2>
              <p className="text-purple-700">
                You&apos;re now connected with {selectedAgentName}
              </p>
            </div>
            <SimpleVoiceOnboarding 
              agentId={selectedAgentId} 
              agentDetails={selectedAgentDetails}
              loading={loadingDetails}
              userName={userName}
            />
          </div>
        )}
      </div>
    </div>
  );
}