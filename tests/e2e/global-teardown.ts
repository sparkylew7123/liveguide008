import { createClient } from '@supabase/supabase-js';

async function globalTeardown() {
  console.log('Global teardown: Cleaning up test environment...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase credentials not available for cleanup.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Clean up test data
    const testEmails = [
      'test-user-1@liveguide.test',
      'test-user-2@liveguide.test',
      'test-admin@liveguide.test',
    ];

    for (const email of testEmails) {
      try {
        const { data: users } = await supabase.auth.admin.listUsers();
        const testUser = users?.users?.find((u: any) => u.email === email);
        
        if (testUser) {
          // Delete user's graph data
          await supabase
            .from('graph_edges')
            .delete()
            .eq('user_id', testUser.id);
            
          await supabase
            .from('graph_nodes')
            .delete()
            .eq('user_id', testUser.id);
          
          // Delete user profile
          await supabase
            .from('profiles')
            .delete()
            .eq('id', testUser.id);
          
          // Delete auth user
          await supabase.auth.admin.deleteUser(testUser.id);
          
          console.log(`Cleaned up test user: ${email}`);
        }
      } catch (error) {
        console.warn(`Failed to cleanup user ${email}:`, error);
      }
    }

    console.log('Global teardown completed successfully');
  } catch (error) {
    console.error('Global teardown failed:', error);
  }
}

export default globalTeardown;