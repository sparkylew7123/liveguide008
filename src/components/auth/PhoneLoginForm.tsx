"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

export default function PhoneLoginForm() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const { showToast } = useToast();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Add +1 for US numbers if not present
    if (phoneNumber.length === 10) {
      return `+1${phoneNumber}`;
    } else if (phoneNumber.length === 11 && phoneNumber.startsWith('1')) {
      return `+${phoneNumber}`;
    }
    
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      setCodeSent(true);
      showToast({
        message: 'Verification code sent to your phone!',
        type: 'success',
        duration: 5000
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: code,
        type: 'sms',
      });

      if (error) throw error;

      showToast({
        message: 'Login successful! Welcome back.',
        type: 'success',
        duration: 3000
      });

      // Redirect to appropriate destination
      setTimeout(() => {
        router.push(returnTo || '/agents');
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-800">
      <h2 className="mb-6 text-2xl font-bold text-center text-white">
        {codeSent ? 'Verify Your Phone' : 'Sign In with Phone'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg backdrop-blur-sm">
          {error}
        </div>
      )}
      
      {!codeSent ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block mb-2 text-sm font-medium text-gray-300">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Enter your phone number with country code
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block mb-2 text-sm font-medium text-gray-300">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              maxLength={6}
            />
            <p className="mt-1 text-xs text-gray-400">
              Enter the 6-digit code sent to {phone}
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setCodeSent(false);
              setCode('');
              setError(null);
            }}
            className="w-full px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Change Phone Number
          </button>
        </form>
      )}
      
      <div className="mt-6 text-center">
        <div className="text-sm">
          <span className="text-gray-400">Don't have an account?</span>
          <Link 
            href="/register-phone" 
            className="ml-1 text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Sign up
          </Link>
        </div>
        <div className="mt-2 text-sm">
          <Link 
            href="/login" 
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            Use email instead
          </Link>
        </div>
        {returnTo && (
          <p className="text-xs text-gray-500 mt-2">
            Sign in to continue to voice coaching
          </p>
        )}
      </div>
    </div>
  );
}