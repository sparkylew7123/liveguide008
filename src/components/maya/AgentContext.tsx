'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface AgentContextProps {
  currentAgent: {
    name: string;
    type: 'maya' | 'specialist';
    specialty?: string;
    sessionStartTime?: Date;
    avatar?: string;
  };
  conversationContext: {
    sessionNumber: number;
    currentGoals: string[];
    recentTopics: string[];
    emotionalState?: string;
    lastInteraction?: Date;
  };
  canReturnToMaya: boolean;
  onReturnToMaya?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  className?: string;
}

const agentIcons: Record<string, string> = {
  maya: '🌟',
  'career-transition': '💼',
  'relationship': '❤️',
  'health-wellness': '🌱',
  'financial': '💰',
  'creative': '🎨',
  'business': '🚀',
  'academic': '📚',
  'life-transition': '🌅',
};

const agentColors: Record<string, string> = {
  maya: 'from-blue-500 to-purple-500',
  'career-transition': 'from-blue-600 to-indigo-600',
  'relationship': 'from-pink-600 to-rose-600',
  'health-wellness': 'from-green-600 to-emerald-600',
  'financial': 'from-yellow-600 to-orange-600',
  'creative': 'from-purple-600 to-violet-600',
  'business': 'from-teal-600 to-cyan-600',
  'academic': 'from-indigo-600 to-blue-600',
  'life-transition': 'from-orange-600 to-red-600',
};

function formatDuration(startTime: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - startTime.getTime();
  const minutes = Math.floor(diffMs / 60000);
  
  if (minutes < 1) return 'Just started';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 1 && remainingMinutes === 0) return '1 hour';
  if (remainingMinutes === 0) return `${hours} hours`;
  return `${hours}h ${remainingMinutes}m`;
}

export default function AgentContext({
  currentAgent,
  conversationContext,
  canReturnToMaya,
  onReturnToMaya,
  isMinimized = false,
  onToggleMinimize,
  className = ''
}: AgentContextProps) {
  const [showFullContext, setShowFullContext] = useState(false);

  const agentIcon = currentAgent.type === 'maya' 
    ? agentIcons.maya 
    : agentIcons[currentAgent.specialty as keyof typeof agentIcons] || '👤';
    
  const gradientColor = currentAgent.type === 'maya' 
    ? agentColors.maya 
    : agentColors[currentAgent.specialty as keyof typeof agentColors] || 'from-gray-600 to-gray-700';

  const sessionDuration = currentAgent.sessionStartTime 
    ? formatDuration(currentAgent.sessionStartTime) 
    : 'New session';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
      role="complementary"
      aria-label="Current conversation context"
    >
      {/* Header - Always visible */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {/* Agent Avatar */}
          <div className={`w-10 h-10 bg-gradient-to-r ${gradientColor} rounded-full flex items-center justify-center text-white text-lg`}>
            {agentIcon}
          </div>

          {/* Agent Info */}
          <div>
            <h3 className="font-medium text-gray-900">
              {currentAgent.name}
              {currentAgent.type === 'specialist' && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  Specialist
                </span>
              )}
            </h3>
            <div className="flex items-center text-xs text-gray-500 space-x-2">
              <ClockIcon className="w-3 h-3" />
              <span>{sessionDuration}</span>
              {conversationContext.sessionNumber > 1 && (
                <>
                  <span>•</span>
                  <span>Session #{conversationContext.sessionNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Return to Maya Button */}
          {canReturnToMaya && currentAgent.type === 'specialist' && (
            <motion.button
              onClick={onReturnToMaya}
              whileTap={{ scale: 0.95 }}
              className="flex items-center text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
              aria-label="Return to Maya, your primary guide"
            >
              <ArrowLeftIcon className="w-3 h-3 mr-1" />
              Return to Maya
            </motion.button>
          )}

          {/* Minimize/Expand Toggle */}
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={isMinimized ? 'Show conversation context' : 'Hide conversation context'}
              aria-expanded={!isMinimized}
            >
              {isMinimized ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronUpIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100"
          >
            <div className="p-4 space-y-4">
              {/* Current Goals */}
              {conversationContext.currentGoals.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    Current Goals
                  </h4>
                  <div className="space-y-1">
                    {conversationContext.currentGoals.slice(0, showFullContext ? undefined : 2).map((goal, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start text-sm"
                      >
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-2 mr-2" />
                        <span className="text-gray-700">{goal}</span>
                      </motion.div>
                    ))}
                  </div>
                  {conversationContext.currentGoals.length > 2 && (
                    <button
                      onClick={() => setShowFullContext(!showFullContext)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                      aria-expanded={showFullContext}
                    >
                      {showFullContext 
                        ? 'Show less' 
                        : `View ${conversationContext.currentGoals.length - 2} more goals`
                      }
                    </button>
                  )}
                </div>
              )}

              {/* Recent Topics */}
              {conversationContext.recentTopics.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    Recent Topics
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {conversationContext.recentTopics.slice(0, 5).map((topic, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                      >
                        {topic}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Emotional State */}
              {conversationContext.emotionalState && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    Current Emotional State
                  </h4>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    <span className="text-gray-700 capitalize">
                      {conversationContext.emotionalState}
                    </span>
                  </div>
                </div>
              )}

              {/* Specialist Context Message */}
              {currentAgent.type === 'specialist' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <InformationCircleIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 mr-2" />
                    <div>
                      <p className="text-xs text-blue-800 mb-1 font-medium">
                        Specialist Session
                      </p>
                      <p className="text-xs text-blue-700">
                        You're working with {currentAgent.name} for focused expertise. 
                        Maya is maintaining your conversation history and will be available when you're ready to return.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Maya Context Message */}
              {currentAgent.type === 'maya' && conversationContext.sessionNumber > 1 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5 mr-2" />
                    <p className="text-xs text-purple-700">
                      Continuing your journey together. I have full context from our previous conversations 
                      and any specialist sessions you've had.
                    </p>
                  </div>
                </div>
              )}

              {/* Last Interaction */}
              {conversationContext.lastInteraction && (
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  Last active: {conversationContext.lastInteraction.toLocaleDateString()} at {conversationContext.lastInteraction.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}