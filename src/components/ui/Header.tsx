"use client";

import Link from 'next/link';
import Image from 'next/image';
import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface HeaderProps {
  isAuthenticated?: boolean;
  onMicrophoneClick?: () => void;
}

const Header: FC<HeaderProps> = ({ isAuthenticated = false, onMicrophoneClick }) => {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/login');
      router.refresh();
    }
  };
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <Image 
                  src="/liveguide-logo.png" 
                  alt="LiveGuide" 
                  width={160} 
                  height={45} 
                  className="h-10 w-auto"
                  priority
                />
              </Link>
            </div>
            <nav className="ml-8 flex space-x-8">
              <Link
                href="/features"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-300 hover:text-white hover:border-blue-400 transition-colors"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-300 hover:text-white hover:border-blue-400 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-300 hover:text-white hover:border-blue-400 transition-colors"
              >
                Docs
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex space-x-4 items-center">
                {onMicrophoneClick && (
                  <button
                    onClick={onMicrophoneClick}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-700 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    aria-label="Microphone Calibration"
                    title="Recalibrate Microphone"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                )}
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Dashboard
                </Link>
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-700 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                  >
                    <span className="sr-only">Open user menu</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {isDropdownOpen && (
                    <div 
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-gray-800 border border-gray-700 focus:outline-none z-10"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu"
                    >
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Your Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        role="menuitem"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex space-x-4">
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-transparent hover:bg-gray-800 hover:text-white transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;