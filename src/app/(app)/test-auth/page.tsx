'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAuthPage() {
  const [authStatus, setAuthStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { user, anonymousUser, isAnonymous, effectiveUserId } = useUser();
  const supabase = createClient();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      setAuthStatus({
        hasSession: !!session,
        hasUser: !!user,
        sessionError: sessionError?.message,
        userError: userError?.message,
        userId: user?.id,
        email: user?.email,
      });
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSignUp = async () => {
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'Test123456!';
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    console.log('Sign up result:', { data, error });
    alert(error ? `Error: ${error.message}` : 'Check console for result');
    checkAuthStatus();
  };

  const testSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'Test123456!',
    });
    
    console.log('Sign in result:', { data, error });
    alert(error ? `Error: ${error.message}` : 'Sign in successful!');
    checkAuthStatus();
  };

  const testSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    console.log('Sign out result:', { error });
    alert(error ? `Error: ${error.message}` : 'Sign out successful!');
    checkAuthStatus();
  };

  return (
    <div className="min-h-screen p-8 bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-8">Authentication Test Page</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Current User Context</CardTitle>
            <CardDescription>From UserContext hook</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({
                user: user ? { id: user.id, email: user.email } : null,
                anonymousUser: anonymousUser ? { id: anonymousUser.id } : null,
                isAnonymous,
                effectiveUserId,
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supabase Auth Status</CardTitle>
            <CardDescription>Direct from Supabase client</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(authStatus, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={testSignUp}>Test Sign Up</Button>
              <Button onClick={testSignIn}>Test Sign In</Button>
              <Button onClick={testSignOut}>Test Sign Out</Button>
              <Button onClick={checkAuthStatus} variant="outline">Refresh Status</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Check</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({
                NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
                NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}