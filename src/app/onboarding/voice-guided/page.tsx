'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { VoiceGuidedOnboarding } from '@/components/onboarding/VoiceGuidedOnboarding';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function VoiceGuidedOnboardingPage() {
  const router = useRouter();
  const { user, anonymousUser, isLoading, effectiveUserId } = useUser();
  
  const userName = user?.user_metadata?.full_name || 
                   user?.user_metadata?.name || 
                   user?.email?.split('@')[0] || 
                   'User';

  // Allow anonymous users to proceed with onboarding
  useEffect(() => {
    if (!isLoading && !effectiveUserId) {
      router.push('/login?returnTo=/onboarding/voice-guided');
    }
  }, [isLoading, effectiveUserId, router]);

  const handleBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your personalized onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <div className="absolute top-6 left-6 z-50">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2 bg-white/80 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>

      {/* Main Onboarding Flow */}
      <VoiceGuidedOnboarding 
        user={user || { id: effectiveUserId }}
        userName={userName}
      />
    </div>
  );
}