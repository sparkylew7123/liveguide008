'use client';

import { PlasmicComponent } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from '@/lib/plasmic-init';
import { PlasmicPageWrapper } from '@/components/plasmic/PlasmicPageWrapper';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

export default function PlasmicLandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, []);
  // Check if Plasmic is configured
  const isConfigured = process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID && 
                      process.env.NEXT_PUBLIC_PLASMIC_PROJECT_TOKEN;
  
  if (!isConfigured) {
    // Fallback to existing landing page if Plasmic is not configured
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Plasmic Not Configured</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            To use Plasmic, please add your project credentials to the environment variables:
          </p>
          <code className="block bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm">
            NEXT_PUBLIC_PLASMIC_PROJECT_ID=your-project-id<br />
            NEXT_PUBLIC_PLASMIC_PROJECT_TOKEN=your-project-token
          </code>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <PlasmicPageWrapper pageName="LandingPage">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PlasmicPageWrapper>
    );
  }

  return (
    <PlasmicPageWrapper pageName="LandingPage">
      <PlasmicComponent
        component="Homepage" // Try different component names
        componentProps={{
          // Pass authentication state and other props
          isAuthenticated: !!user,
          userName: user?.email?.split('@')[0],
          ctaLink: user ? '/graph' : '/auth/signin',
          ctaText: user ? 'Open Your Graph' : 'Get Started Free',
          
          // Feature flags or A/B test variants could go here
          showTestimonials: true,
          heroVariant: 'default',
        }}
        // Add forceOriginal to bypass any caching
        forceOriginal={true}
      />
    </PlasmicPageWrapper>
  );
}