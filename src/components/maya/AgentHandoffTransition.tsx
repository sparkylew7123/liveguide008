'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, ArrowRightIcon, UserIcon } from '@heroicons/react/24/outline';

interface AgentHandoffTransitionProps {
  isVisible: boolean;
  fromAgent: {
    name: string;
    type: 'maya' | 'specialist';
    specialty?: string;
  };
  toAgent: {
    name: string;
    type: 'maya' | 'specialist';
    specialty?: string;
  };
  context: {
    reason: string;
    continuityMessage: string;
    expectedDuration?: string;
  };
  onTransitionComplete: () => void;
}

const agentColors = {
  maya: 'from-blue-500 to-purple-500',
  specialist: 'from-green-500 to-teal-500',
};

const agentIcons = {
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

export default function AgentHandoffTransition({
  isVisible,
  fromAgent,
  toAgent,
  context,
  onTransitionComplete
}: AgentHandoffTransitionProps) {
  const [stage, setStage] = useState<'intro' | 'transition' | 'complete'>('intro');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setStage('intro');
      setProgress(0);
      return;
    }

    const timer1 = setTimeout(() => {
      setStage('transition');
      
      // Animate progress
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressTimer);
            return 100;
          }
          return prev + 2;
        });
      }, 20);

    }, 1000);

    const timer2 = setTimeout(() => {
      setStage('complete');
    }, 3000);

    const timer3 = setTimeout(() => {
      onTransitionComplete();
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible, onTransitionComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        aria-live="polite"
        role="dialog"
        aria-label="Agent transition in progress"
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-4"
            >
              🔄
            </motion.div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting You With Specialized Support
            </h2>
            <p className="text-gray-600 text-sm">
              {context.reason}
            </p>
          </div>

          {/* Agent Transition Visualization */}
          <div className="flex items-center justify-between mb-6">
            {/* From Agent */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${agentColors[fromAgent.type]} rounded-full flex items-center justify-center text-white text-lg mb-2`}>
                {agentIcons[fromAgent.specialty as keyof typeof agentIcons] || agentIcons.maya}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {fromAgent.name}
              </span>
            </motion.div>

            {/* Transition Arrow */}
            <motion.div
              className="flex-1 mx-4 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="h-px bg-gray-300 relative">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-green-500 h-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 bg-white p-1 rounded-full shadow-lg"
                animate={{ 
                  x: `${(progress - 50) * 0.8}px`,
                  rotate: progress * 3.6 
                }}
                transition={{ duration: 0.1 }}
              >
                <ArrowRightIcon className="w-4 h-4 text-gray-600" />
              </motion.div>
            </motion.div>

            {/* To Agent */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${agentColors[toAgent.type]} rounded-full flex items-center justify-center text-white text-lg mb-2`}>
                {agentIcons[toAgent.specialty as keyof typeof agentIcons] || agentIcons.maya}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {toAgent.name}
              </span>
            </motion.div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Preparing context</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Stage-based Content */}
          <AnimatePresence mode="wait">
            {stage === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <p className="text-gray-600 text-sm mb-4">
                  Preparing to connect you with specialized expertise...
                </p>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                </div>
              </motion.div>
            )}

            {stage === 'transition' && (
              <motion.div
                key="transition"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <p className="text-gray-600 text-sm mb-4">
                  Transferring your conversation context and ensuring continuity...
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 italic">
                    "{context.continuityMessage}"
                  </p>
                </div>
              </motion.div>
            )}

            {stage === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-gray-900 font-medium mb-2">
                  Connection Established
                </p>
                <p className="text-gray-600 text-sm">
                  You're now speaking with {toAgent.name}
                  {context.expectedDuration && (
                    <span className="block mt-1">
                      Estimated session: {context.expectedDuration}
                    </span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Accessibility Information */}
          <div className="sr-only" aria-live="polite">
            {stage === 'intro' && 'Preparing agent transition'}
            {stage === 'transition' && 'Transferring conversation context'}
            {stage === 'complete' && `Successfully connected to ${toAgent.name}`}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}