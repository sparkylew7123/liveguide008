'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Bookmark, 
  MoreVertical, 
  FileText, 
  Video, 
  Headphones, 
  Mic,
  Map,
  CheckCircle,
  Clock,
  Bell,
  RefreshCw
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

interface InboxMessage {
  id: string;
  sender_name: string;
  sender_avatar_url?: string;
  subject: string;
  preview: string;
  message_type: string;
  priority: string;
  is_read: boolean;
  is_pinned: boolean;
  created_at: string;
  metadata?: any;
  message_attachments?: MessageAttachment[];
}

interface MessageAttachment {
  id: string;
  attachment_type: string;
  title: string;
  url: string;
  duration_seconds?: number;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'achievement' | 'reminder' | 'system';
  isRead: boolean;
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState('messages');
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPopulating, setIsPopulating] = useState(false);
  const supabase = createClient();

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inbox_messages')
        .select(`
          *,
          message_attachments (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateTestData = async () => {
    try {
      setIsPopulating(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/populate-inbox-test-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to populate test data');
      
      const result = await response.json();
      console.log('Test data populated:', result);
      
      // Refresh messages
      await fetchMessages();
    } catch (error) {
      console.error('Error populating test data:', error);
    } finally {
      setIsPopulating(false);
    }
  };

  const notifications: Notification[] = [
    {
      id: '1',
      title: 'Achievement Unlocked!',
      description: 'You\'ve completed your 7-day meditation streak',
      timestamp: '1 hour ago',
      type: 'achievement',
      isRead: false
    },
    {
      id: '2',
      title: 'Session Reminder',
      description: 'Your coaching session with Dr. Sarah Chen starts in 30 minutes',
      timestamp: '3 hours ago',
      type: 'reminder',
      isRead: false
    },
    {
      id: '3',
      title: 'New Feature Available',
      description: 'Try our new AI-powered goal tracking system',
      timestamp: 'Yesterday',
      type: 'system',
      isRead: true
    }
  ];

  const getContentIcon = (attachments?: MessageAttachment[]) => {
    if (!attachments || attachments.length === 0) {
      return <FileText className="h-4 w-4" />;
    }
    
    const type = attachments[0].attachment_type;
    switch (type) {
      case 'mindmap':
        return <Map className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'podcast':
        return <Headphones className="h-4 w-4" />;
      case 'audio':
        return <Mic className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'achievement':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-blue-400" />;
      case 'system':
        return <Bell className="h-5 w-5 text-purple-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <div data-sb-object-id="inbox-header">
                  <h1 data-sb-field-path="title" className="text-3xl font-bold text-white mb-2">Inbox</h1>
                  <p data-sb-field-path="subtitle" className="text-gray-400">Stay connected with your coaches and track your progress</p>
                </div>
              </div>
              {messages.length === 0 && !loading && (
                <Button
                  onClick={populateTestData}
                  disabled={isPopulating}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isPopulating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Populating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Populate Test Data
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full sm:w-auto mb-6">
              <TabsTrigger value="messages" className="flex items-center gap-2">
                Messages
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {messages.filter(m => !m.is_read).length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                Notifications
                <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              </TabsTrigger>
            </TabsList>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No messages yet</p>
                  <p className="text-gray-500 text-sm">Click "Populate Test Data" to add sample messages</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "bg-slate-800/50 backdrop-blur-md rounded-lg p-4 hover:bg-slate-800/70 transition-all duration-200 cursor-pointer",
                      !message.is_read && "border-l-4 border-blue-500"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Coach Avatar */}
                      {message.sender_avatar_url && message.sender_avatar_url.includes('video') ? (
                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500">
                          <video
                            src={message.sender_avatar_url}
                            className="h-full w-full object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                          />
                        </div>
                      ) : (
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={message.sender_avatar_url} alt={message.sender_name} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                            {message.sender_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h3 className="font-semibold text-white flex items-center gap-2">
                              {message.sender_name}
                              {message.is_pinned && <Bookmark className="h-4 w-4 text-yellow-500 fill-current" />}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {message.metadata?.session_date ? `Re. session on ${new Date(message.metadata.session_date).toLocaleDateString()}` : message.message_type}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">{formatTimestamp(message.created_at)}</span>
                        </div>
                        
                        <h4 className="font-medium text-gray-200 mb-1">{message.subject}</h4>
                        <p className="text-sm text-gray-400 line-clamp-2">{message.preview}</p>
                        
                        <div className="flex items-center gap-2 mt-3">
                          {message.message_attachments && message.message_attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-slate-700 px-2 py-1 rounded">
                              {getContentIcon(message.message_attachments)}
                              {message.message_attachments[0].attachment_type.charAt(0).toUpperCase() + message.message_attachments[0].attachment_type.slice(1)}
                            </span>
                          )}
                          {message.priority === 'high' && (
                            <span className="inline-flex items-center text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-white hover:bg-slate-700"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-white hover:bg-slate-700"
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-white hover:bg-slate-700"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "bg-slate-800/50 backdrop-blur-md rounded-lg p-4 hover:bg-slate-800/70 transition-all duration-200",
                    !notification.isRead && "border-l-4 border-purple-500"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{notification.title}</h4>
                      <p className="text-sm text-gray-400 mb-2">{notification.description}</p>
                      <span className="text-xs text-gray-500">{notification.timestamp}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}