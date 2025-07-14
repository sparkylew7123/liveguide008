"use client";

import { useState, useEffect } from 'react';
import { signUp, signInWithProvider } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await signUp(email, password);
      
      if (error) {
        throw error;
      }
      
      const successMsg = returnTo 
        ? 'Registration successful! Check your email to confirm your account, then you can continue to voice coaching.'
        : 'Registration successful! Check your email to confirm your account.';
      setSuccessMessage(successMsg);
      
      // For OAuth providers that auto-confirm, we can redirect immediately
      // For email signup, user needs to verify email first
    } catch (err: any) {
      setError(err?.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: 'google' | 'github') => {
    setError(null);
    
    try {
      const { error } = await signInWithProvider(provider);
      
      if (error) {
        throw error;
      }
      
      // The user will be redirected to the provider's auth page
    } catch (err: any) {
      setError(err?.message || `Failed to sign up with ${provider}`);
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
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
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
        
        <div className="mb-4">
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
        
        <div className="mb-6">
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
          className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
        >
          {loading ? 'Signing up...' : 'Sign Up'}
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
        
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => handleProviderSignIn('google')}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-all"
          >
            Google
          </button>
          <button
            onClick={() => handleProviderSignIn('github')}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-all"
          >
            GitHub
          </button>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <div className="text-sm">
          <span className="text-gray-400">Already have an account?</span>
          <Link 
            href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'} 
            className="ml-1 text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Sign in
          </Link>
        </div>
        {returnTo && (
          <p className="text-xs text-gray-500 mt-2">
            Complete registration to continue to voice coaching
          </p>
        )}
      </div>
    </div>
  );
}