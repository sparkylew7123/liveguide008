'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  UserIcon, 
  BellIcon, 
  ShieldCheckIcon, 
  KeyIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  DatabaseIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import DangerZone from '@/components/settings/DangerZone';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/login');
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, full_name, role')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setIsAdmin(profileData.role === 'admin' || profileData.role === 'moderator');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const userSettings = [
    {
      title: 'Profile',
      description: 'Manage your personal information',
      href: '/settings/profile',
      icon: UserIcon,
      available: true
    },
    {
      title: 'Notifications',
      description: 'Configure notification preferences',
      href: '/settings/notifications',
      icon: BellIcon,
      available: false
    },
    {
      title: 'Security',
      description: 'Password and authentication settings',
      href: '/settings/security',
      icon: KeyIcon,
      available: false
    },
    {
      title: 'Appearance',
      description: 'Theme and display preferences',
      href: '/settings/appearance',
      icon: PaintBrushIcon,
      available: false
    },
    {
      title: 'Language',
      description: 'Language and region settings',
      href: '/settings/language',
      icon: GlobeAltIcon,
      available: false
    }
  ];

  const adminSettings = [
    {
      title: 'Admin Dashboard',
      description: 'System overview and statistics',
      href: '/settings/admin',
      icon: ChartBarIcon,
      available: true
    },
    {
      title: 'Database Schema',
      description: 'Interactive database visualization',
      href: '/settings/admin/database',
      icon: DatabaseIcon,
      available: true
    },
    {
      title: 'Embeddings',
      description: 'Manage and process embeddings',
      href: '/settings/admin/embeddings',
      icon: BoltIcon,
      available: true
    },
    {
      title: 'User Management',
      description: 'Manage user accounts and roles',
      href: '/settings/admin/users',
      icon: UsersIcon,
      available: false
    },
    {
      title: 'Conversations',
      description: 'View and manage conversations',
      href: '/settings/admin/conversations',
      icon: ChatBubbleLeftRightIcon,
      available: false
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      href: '/settings/admin/system',
      icon: Cog6ToothIcon,
      available: false
    }
  ];

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User Settings */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          Account Settings
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userSettings.map((setting) => (
            <div
              key={setting.href}
              className={`rounded-lg border bg-card p-6 transition-all ${
                setting.available 
                  ? 'hover:bg-accent cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              {setting.available ? (
                <Link href={setting.href} className="block">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <setting.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{setting.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-muted p-2">
                    <setting.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{setting.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Admin Settings - Only show if user is admin */}
      {isAdmin && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            Administration
            <span className="ml-2 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {profile?.role}
            </span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {adminSettings.map((setting) => (
              <div
                key={setting.href}
                className={`rounded-lg border bg-card p-6 transition-all ${
                  setting.available 
                    ? 'hover:bg-accent cursor-pointer border-primary/20' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {setting.available ? (
                  <Link href={setting.href} className="block">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <setting.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{setting.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-muted p-2">
                      <setting.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{setting.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {setting.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Info */}
      <div className="mt-12 rounded-lg border bg-card p-6">
        <h3 className="font-semibold mb-4">Account Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-mono">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-mono text-xs">{user.id}</span>
          </div>
          {profile?.username && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Username</span>
              <span className="font-mono">{profile.username}</span>
            </div>
          )}
          {profile?.role && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-mono capitalize">{profile.role}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <DangerZone userId={user.id} />
    </div>
  );
}