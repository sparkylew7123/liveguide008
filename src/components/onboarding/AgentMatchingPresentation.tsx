'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Star, MessageCircle, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface AgentMatchingPresentationProps {
  user: any;
  userName: string;
  selectedGoals: string[];
  coachingPreferences?: any;
  onComplete: (data: { selectedAgent: any, matchedAgents: any[] }) => void;
  isLoading: boolean;
}

interface MatchedAgent extends Record<string, any> {
  uuid: string;
  match_score: number;
  match_reasoning: string;
}

export function AgentMatchingPresentation({
  user,
  userName,
  selectedGoals,
  coachingPreferences,
  onComplete,
  isLoading
}: AgentMatchingPresentationProps) {
  const [matchedAgents, setMatchedAgents] = useState<MatchedAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<MatchedAgent | null>(null);
  const [isMatching, setIsMatching] = useState(true);
  const [matchingProgress, setMatchingProgress] = useState(0);

  useEffect(() => {
    performAgentMatching();
  }, [selectedGoals, coachingPreferences]);

  const performAgentMatching = async () => {
    setIsMatching(true);
    setMatchingProgress(0);

    try {
      const supabase = createClient();
      
      // Simulate matching progress
      const progressInterval = setInterval(() => {
        setMatchingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Fetch all available agents
      const { data: agents, error } = await supabase
        .from('agent_personae')
        .select('*')
        .eq('availability_status', 'available');

      if (error) {
        console.error('Error fetching agents:', error);
        return;
      }

      // TODO: Implement sophisticated matching algorithm
      // For now, use a simple scoring system
      const scoredAgents = agents?.map(agent => {
        let score = 0;
        let reasoning = '';

        // Use JSONB data if available, otherwise fall back to column values
        const agentData = agent.JSONB || agent;
        const agentName = agent.Name || agentData.name;
        const agentSpecialty = agent.Speciality || agentData.specialty || '';
        const agentPersonality = agent.Personality || agentData.personality || '';

        // Goal-based matching
        const goalCategories = agent['Goal Category'] || agent.Category || '';
        const specialtyText = `${agentSpecialty} ${goalCategories}`.toLowerCase();
        
        const goalMatches = selectedGoals.filter(goal => {
          const goalText = typeof goal === 'string' ? goal : goal.title || '';
          return specialtyText.includes(goalText.toLowerCase()) ||
                 goalText.toLowerCase().includes(agentSpecialty.toLowerCase());
        });
        
        if (goalMatches.length > 0) {
          score += (goalMatches.length / selectedGoals.length) * 40;
          reasoning += `Strong match for ${goalMatches.length} of your goals. `;
        }

        // Coaching style matching based on personality
        if (coachingPreferences && agentPersonality) {
          // Simple personality-based matching
          const personalityLower = agentPersonality.toLowerCase();
          let styleScore = 0.5; // Base compatibility
          
          if (coachingPreferences.Energy?.preference === 'high' && 
              (personalityLower.includes('energetic') || personalityLower.includes('motivating'))) {
            styleScore += 0.2;
          }
          if (coachingPreferences.Structure?.preference === 'high' && 
              (personalityLower.includes('structured') || personalityLower.includes('organized'))) {
            styleScore += 0.2;
          }
          if (personalityLower.includes('supportive') || personalityLower.includes('empathetic')) {
            styleScore += 0.1;
          }
          
          score += styleScore * 30;
          if (styleScore > 0.7) {
            reasoning += `Excellent coaching style compatibility. `;
          }
        }

        // Personality compatibility
        if (agentPersonality) {
          score += 20; // Base score for having personality info
          reasoning += `${agentPersonality.split('.')[0]}. `;
        }

        // Experience and rating
        const rating = agent.average_rating || 4.5;
        score += (rating / 5) * 10;

        return {
          ...agent,
          match_score: Math.min(score, 100),
          match_reasoning: reasoning || 'Well-rounded coach suitable for your goals.'
        };
      }) || [];

      // Sort by match score and take top 3
      const topMatches = scoredAgents
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 3);

      clearInterval(progressInterval);
      setMatchingProgress(100);
      setMatchedAgents(topMatches);
      setIsMatching(false);
    } catch (error) {
      console.error('Error matching agents:', error);
      setIsMatching(false);
    }
  };

  const calculateStyleMatch = (preferences: any, agentStyle: string): number => {
    // Simple style matching logic
    // TODO: Implement more sophisticated matching
    let matchScore = 0.5; // Base compatibility
    
    if (preferences.Energy?.preference === 'Energetic' && agentStyle.includes('dynamic')) {
      matchScore += 0.2;
    }
    
    if (preferences.Structure?.preference === 'Structured' && agentStyle.includes('structured')) {
      matchScore += 0.2;
    }
    
    return Math.min(matchScore, 1.0);
  };

  const handleAgentSelect = (agent: MatchedAgent) => {
    setSelectedAgent(agent);
  };

  const handleConfirmSelection = () => {
    if (!selectedAgent) {
      alert('Please select a coach to continue.');
      return;
    }

    onComplete({
      selectedAgent,
      matchedAgents
    });
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getMatchScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent Match';
    if (score >= 70) return 'Good Match';
    return 'Compatible';
  };

  if (isMatching) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Finding Your Perfect Coach
          </h1>
          <p className="text-lg text-gray-600">
            Analyzing your goals and preferences to match you with the ideal coach
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Matching Progress
                </span>
                <span className="text-sm text-gray-500">
                  {matchingProgress}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${matchingProgress}%` }}
                />
              </div>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing compatibility...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Goals Analyzed</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {selectedGoals.length} selected goals
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Preferences Processed</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {coachingPreferences ? 'Coaching style discovered' : 'Balanced approach'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Meet Your Matched Coaches
        </h1>
        <p className="text-lg text-gray-600">
          We've found {matchedAgents.length} coaches who are perfect for your goals and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {matchedAgents.map((agent) => (
          <Card 
            key={agent.uuid}
            className={`cursor-pointer transition-all duration-200 ${
              selectedAgent?.uuid === agent.uuid
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:shadow-lg hover:bg-gray-50'
            }`}
            onClick={() => handleAgentSelect(agent)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={agent.Image} alt={agent.Name} />
                    <AvatarFallback className="text-lg font-semibold">
                      {(agent.Name || '').split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-xl">{agent.Name}</CardTitle>
                      <Badge 
                        className={`${getMatchScoreColor(agent.match_score)} border-none`}
                      >
                        {Math.round(agent.match_score)}% {getMatchScoreLabel(agent.match_score)}
                      </Badge>
                    </div>
                    <CardDescription className="text-base mt-1">
                      {agent.Speciality}
                    </CardDescription>
                  </div>
                </div>
                
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${selectedAgent?.uuid === agent.uuid
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                  }
                `}>
                  {selectedAgent?.uuid === agent.uuid && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-gray-700 mb-4">{agent.Backstory || agent.JSONB?.backstory || ''}</p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Why this coach is perfect for you:
                  </h4>
                  <p className="text-sm text-gray-600">{agent.match_reasoning}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Key Features:</h4>
                  <div className="flex flex-wrap gap-2">
                    {(agent.JSONB?.key_features || agent['Key Features']?.split(',') || []).map((feature: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">
                        {agent.average_rating || 4.8}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {agent['Tone and Style'] || agent.JSONB?.tone_and_style || 'Adaptive Style'}
                      </span>
                    </div>
                  </div>
                  
                  {agent.video_intro && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Play video intro
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Preview Voice
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {matchedAgents.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">
              We're having trouble finding coaches right now. Please try again later or contact support.
            </p>
            <Button variant="outline" onClick={performAgentMatching}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedAgent && (
        <div className="sticky bottom-6 bg-white/90 backdrop-blur-sm border rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedAgent.avatar_url} alt={selectedAgent.name} />
                <AvatarFallback>
                  {selectedAgent.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">{selectedAgent.name}</p>
                <p className="text-sm text-gray-600">Selected as your coach</p>
              </div>
            </div>
            
            <Button 
              onClick={handleConfirmSelection}
              disabled={isLoading}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Start Coaching with {selectedAgent.name}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}