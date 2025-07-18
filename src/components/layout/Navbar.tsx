'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  Home,
  Mic,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  User
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
      }
      setIsLoading(false);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const navItems: NavItem[] = [
    { label: 'Lobby', href: '/lobby', icon: Home },
    { label: 'Voice Sessions', href: '/agents', icon: Mic },
    { label: 'Schedule', href: '/schedule', icon: Calendar },
    { label: 'Progress', href: '/progress', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Don't show navbar on landing, login, or register pages
  const hideNavbar = ['/', '/login', '/register'].includes(pathname);
  
  if (hideNavbar || isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="w-full px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/lobby" className="flex items-center gap-3">
              <Image 
                src="https://res.cloudinary.com/dlq71ih0t/image/upload/v1750020672/liveguide-logo-clear.png" 
                alt="LiveGuide" 
                width={120} 
                height={32} 
                className="h-7 w-auto"
                priority
                unoptimized
              />
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              >
                <Bell className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                </Avatar>
                <span className="text-sm text-gray-300">{userName}</span>
              </div>

              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/lobby">
              <Image 
                src="https://res.cloudinary.com/dlq71ih0t/image/upload/v1750020672/liveguide-logo-clear.png" 
                alt="LiveGuide" 
                width={100} 
                height={28} 
                className="h-6 w-auto"
                priority
                unoptimized
              />
            </Link>

            {/* Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white hover:bg-gray-800"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900/95 backdrop-blur-md border-b border-gray-800"
            >
              <div className="px-4 py-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-blue-600/20 text-blue-400"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
                
                <div className="pt-4 mt-4 border-t border-gray-800">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <Avatar className="h-8 w-8">
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>
                    <span className="text-sm text-gray-300">{userName}</span>
                  </div>
                  
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 mt-2"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Spacer to prevent content from being hidden under fixed navbar */}
      {isAuthenticated && !hideNavbar && (
        <div className="h-16" />
      )}
    </>
  );
}