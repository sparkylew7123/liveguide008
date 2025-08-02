'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CallScheduler from '@/components/CallScheduler';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';

interface Agent {
  id: string;
  name: string;
  image: string;
  speciality?: string;
  rating?: number;
  videoIntro?: string;
}

export default function SchedulePage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('agent_personae')
        .select('uuid, Name, Speciality, Image, average_rating, video_intro')
        .eq('availability_status', 'available')
        .order('Name');

      if (error) throw error;

      const formattedAgents: Agent[] = (data || []).map(agent => ({
        id: agent.uuid,
        name: agent.Name,
        image: agent.Image || '',
        speciality: agent.Speciality,
        rating: agent.average_rating ? Number(agent.average_rating) : 4.5,
        videoIntro: agent.video_intro || ''
      }));

      setAgents(formattedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = (scheduleData: any) => {
    console.log('Scheduled:', scheduleData);
    // Here you would typically:
    // 1. Save the schedule to the database
    // 2. Send confirmation email
    // 3. Navigate to a confirmation page
    
    // For now, just show an alert and navigate back
    alert(`Call scheduled with ${scheduleData.agentName} on ${scheduleData.date.toLocaleString()}`);
    router.push('/lobby');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="h-16" /> {/* Spacer for navbar */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <CallScheduler 
            agents={agents}
            onSchedule={handleSchedule}
          />
        )}
      </div>
    </div>
  );
}