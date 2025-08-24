'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

export function useAnonymousAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First, check if user is already authenticated
        const { data: { user: existingUser }, error: getUserError } = await supabase.auth.getUser();
        
        if (getUserError && getUserError.message !== 'Auth session missing!') {
          throw getUserError;
        }

        if (existingUser) {
          console.log('🔐 Existing user found:', existingUser.id);
          setUser(existingUser);
          setLoading(false);
          return;
        }

        // No existing user, create anonymous session
        console.log('🔓 No user found, creating anonymous session...');
        const { data, error: signInError } = await supabase.auth.signInAnonymously();
        
        if (signInError) {
          throw signInError;
        }

        if (data?.user) {
          console.log('✅ Anonymous user created:', data.user.id);
          setUser(data.user);
        }
      } catch (err) {
        console.error('❌ Authentication error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event, session?.user?.id);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Error signing in anonymously:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const upgradeToRegisteredUser = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // This will link the anonymous account to a permanent account
      const { data, error } = await supabase.auth.updateUser({
        email,
        password
      });
      
      if (error) throw error;
      
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Error upgrading user:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade account');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    isAnonymous: user?.is_anonymous ?? false,
    signInAnonymously,
    upgradeToRegisteredUser
  };
}