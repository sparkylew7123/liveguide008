"use client";

import { useState } from 'react';
import { signUp, signInWithProvider } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Prevent double submission
    if (loading) {
      return;
    }
    
    setLoading(true);

    try {
      const { error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        throw signUpError;
      }
      
      // Show success toast message
      showToast({
        message: 'Account created successfully! Please check your email to verify your account.',
        type: 'success',
        duration: 7000
      });
      
      // Redirect to verify-email page
      setTimeout(() => {
        router.push('/verify-email');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: 'google' | 'github') => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    
    try {
      const { error } = await signInWithProvider(provider);
      
      if (error) {
        throw error;
      }
      
      // The user will be redirected to the provider's auth page
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to sign in with ${provider}`;
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-800">
      <h2 className="mb-6 text-2xl font-bold text-center text-white">Create an Account</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg backdrop-blur-sm">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-500/50 text-green-400 rounded-lg backdrop-blur-sm">
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-gray-300">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900/80 text-gray-400">Or continue with</span>
          </div>
        </div>
        
        <div className="space-y-3 mt-6">
          <button
            onClick={() => handleProviderSignIn('google')}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              <path fill="none" d="M1 1h22v22H1z" />
            </svg>
            Continue with Google
          </button>
          
          <Link
            href="/register-phone"
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-all"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Continue with Phone
          </Link>
        </div>
      </div>
      
      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}