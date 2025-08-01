'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function GraphDebugPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUserData();
  }, []);

  const checkUserData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserData({ error: 'No authenticated user' });
        setLoading(false);
        return;
      }

      // Check old user_goals table
      const { data: oldGoals, error: oldGoalsError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id);

      // Check graph_nodes for goals
      const { data: graphGoals, error: graphGoalsError } = await supabase
        .from('graph_nodes')
        .select('*')
        .eq('user_id', user.id)
        .eq('node_type', 'goal')
        .is('deleted_at', null);

      // Check profile for selected_goals
      const { data: profile } = await supabase
        .from('profiles')
        .select('selected_goals')
        .eq('id', user.id)
        .single();

      setUserData({
        userId: user.id,
        oldGoals: oldGoals || [],
        graphGoals: graphGoals || [],
        profileGoals: profile?.selected_goals || [],
        errors: {
          oldGoals: oldGoalsError,
          graphGoals: graphGoalsError
        }
      });
    } catch (error) {
      console.error('Error checking user data:', error);
      setUserData({ error: error.message });
    }
    setLoading(false);
  };

  const migrateGoalsToGraph = async () => {
    if (!userData?.userId) return;
    
    setMigrating(true);
    try {
      const goalsToMigrate = userData.profileGoals.length > 0 
        ? userData.profileGoals 
        : userData.oldGoals;

      for (const goal of goalsToMigrate) {
        const { data, error } = await supabase.rpc('create_goal_node', {
          p_user_id: userData.userId,
          p_title: goal.title || goal.goal_title || goal,
          p_category: goal.category || 'Personal Growth',
          p_properties: {
            description: goal.description || goal.goal_description || `Migrated goal: ${goal.title || goal}`,
            target_date: goal.target_date,
            priority: goal.priority || 'medium',
            migrated_from: 'legacy_data',
            original_id: goal.id
          }
        });

        if (error) {
          console.error('Error migrating goal:', error);
        } else {
          console.log('Successfully migrated goal:', data);
        }
      }

      // Refresh data
      await checkUserData();
      alert('Goals migrated successfully! Redirecting to graph...');
      router.push('/graph');
    } catch (error) {
      console.error('Migration error:', error);
      alert('Error during migration: ' + error.message);
    }
    setMigrating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Graph Debug Information</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>User ID:</strong> {userData?.userId || 'Not authenticated'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Selected Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(userData?.profileGoals || [], null, 2)}
            </pre>
            <p className="mt-2 text-sm text-gray-600">
              Count: {userData?.profileGoals?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Old user_goals Table</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(userData?.oldGoals || [], null, 2)}
            </pre>
            <p className="mt-2 text-sm text-gray-600">
              Count: {userData?.oldGoals?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Graph Nodes (Goals)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(userData?.graphGoals || [], null, 2)}
            </pre>
            <p className="mt-2 text-sm text-gray-600">
              Count: {userData?.graphGoals?.length || 0}
            </p>
            {userData?.graphGoals?.length === 0 && (userData?.profileGoals?.length > 0 || userData?.oldGoals?.length > 0) && (
              <div className="mt-4">
                <p className="text-amber-600 mb-2">
                  ⚠️ Found goals in legacy tables but not in graph nodes!
                </p>
                <Button 
                  onClick={migrateGoalsToGraph}
                  disabled={migrating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {migrating ? 'Migrating...' : 'Migrate Goals to Graph'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-red-50 p-2 rounded overflow-auto text-red-800">
              {JSON.stringify(userData?.errors || {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 space-x-4">
        <Button onClick={() => router.push('/graph')} variant="outline">
          Back to Graph
        </Button>
        <Button onClick={checkUserData} variant="outline">
          Refresh Data
        </Button>
      </div>
    </div>
  );
}