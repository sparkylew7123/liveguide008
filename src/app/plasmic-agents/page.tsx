import { PlasmicComponent } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from '@/lib/plasmic-init';
import { PlasmicPageWrapper } from '@/components/plasmic/PlasmicPageWrapper';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

// This could be fetched from your database
const mockAgents = [
  {
    id: '1',
    name: 'Career Coach Emma',
    description: 'Strategic career guidance and professional development',
    avatar: '/agents/emma.jpg',
    voice: 'warm',
    specialties: ['Career Planning', 'Interview Prep', 'Leadership'],
  },
  {
    id: '2',
    name: 'Wellness Guide Maya',
    description: 'Holistic health and mindfulness coaching',
    avatar: '/agents/maya.jpg',
    voice: 'calming',
    specialties: ['Meditation', 'Stress Management', 'Work-Life Balance'],
  },
  {
    id: '3',
    name: 'Finance Advisor Alex',
    description: 'Personal finance and investment strategies',
    avatar: '/agents/alex.jpg',
    voice: 'professional',
    specialties: ['Budgeting', 'Investing', 'Financial Planning'],
  },
];

export default async function PlasmicAgentsPage() {
  // Check if Plasmic is configured
  const isConfigured = process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID && 
                      process.env.NEXT_PUBLIC_PLASMIC_PROJECT_TOKEN;
  
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Plasmic Not Configured</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please configure Plasmic to view this page.
          </p>
        </div>
      </div>
    );
  }

  try {
    // Prefetch the Plasmic component data
    const plasmicData = await PLASMIC.fetchComponentData('AgentsGallery');
    
    if (!plasmicData) {
      console.error('Plasmic AgentsGallery component not found');
      notFound();
    }

    // Get current user
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // TODO: Fetch real agents from your database
    // const { data: agents } = await supabase
    //   .from('elevenlabs_agents')
    //   .select('*')
    //   .eq('is_active', true)
    //   .order('display_order');

    return (
      <PlasmicPageWrapper pageName="AgentsGallery">
        <PlasmicComponent
          component="AgentsGallery"
          componentProps={{
            // Pass agents data
            agents: mockAgents,
            
            // User state
            isAuthenticated: !!user,
            
            // Callbacks handled client-side
            onAgentSelect: undefined, // Will be handled by client component
            
            // Page configuration
            showFilters: true,
            gridColumns: 3,
          }}
        />
      </PlasmicPageWrapper>
    );
  } catch (error) {
    console.error('Error loading Plasmic agents page:', error);
    return (
      <PlasmicPageWrapper pageName="AgentsGallery">
        <div className="min-h-screen flex items-center justify-center">
          <p>Unable to load agents. Please try again later.</p>
        </div>
      </PlasmicPageWrapper>
    );
  }
}

// Generate metadata for SEO
export async function generateMetadata() {
  try {
    const plasmicData = await PLASMIC.fetchComponentData('AgentsGallery');
    
    return {
      title: plasmicData?.meta?.title || 'AI Coaches - LiveGuide',
      description: plasmicData?.meta?.description || 'Meet our AI coaches specialized in career, wellness, finance, and more',
      openGraph: {
        title: plasmicData?.meta?.ogTitle || 'AI Coaches - LiveGuide',
        description: plasmicData?.meta?.ogDescription || 'Meet our AI coaches specialized in career, wellness, finance, and more',
        images: plasmicData?.meta?.ogImage ? [plasmicData.meta.ogImage] : [],
      },
    };
  } catch (error) {
    return {
      title: 'AI Coaches - LiveGuide',
      description: 'Meet our AI coaches specialized in career, wellness, finance, and more',
    };
  }
}