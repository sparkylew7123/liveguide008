'use client';

import { useState } from 'react';
import { AgentSelectionInterface } from '@/components/AgentSelectionInterface';
import { SimpleVoiceOnboarding } from '@/components/SimpleVoiceOnboarding';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function VoiceOnboardingPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedElevenLabsId, setSelectedElevenLabsId] = useState<string | null>(null);
  const [showVoiceChat, setShowVoiceChat] = useState(false);

  const handleAgentSelect = (agentId: string, elevenLabsId: string) => {
    setSelectedAgentId(agentId);
    setSelectedElevenLabsId(elevenLabsId);
  };

  const handleContinueToVoice = () => {
    if (selectedElevenLabsId) {
      setShowVoiceChat(true);
    }
  };

  const handleBackToSelection = () => {
    setShowVoiceChat(false);
  };

  if (showVoiceChat && selectedElevenLabsId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Back button */}
        <div className="absolute top-6 left-6 z-50">
          <Button 
            onClick={handleBackToSelection}
            variant="outline"
            size="sm"
            className="bg-white/80 backdrop-blur-sm"
          >
            <ArrowLeftIcon  className="w-4 h-4 mr-2" />
            Change Agent
          </Button>
        </div>
        
        <SimpleVoiceOnboarding agentId={selectedElevenLabsId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <AgentSelectionInterface
        onAgentSelect={handleAgentSelect}
        selectedAgentId={selectedAgentId || undefined}
      />
      
      {/* Continue Button */}
      {selectedAgentId && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            onClick={handleContinueToVoice}
            size="lg"
            className="shadow-lg"
          >
            Start Voice Chat
          </Button>
        </div>
      )}
    </div>
  );
}