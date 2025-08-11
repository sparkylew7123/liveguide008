'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  XMarkIcon, 
  InformationCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface AgentRecommendationProps {
  recommendation: {
    agentType: string;
    agentName: string;
    agentDescription: string;
    reason: string;
    benefits: string[];
    estimatedDuration: string;
    continuityAssurance: string;
    context: string;
  };
  onAccept: (agentType: string) => void;
  onDecline: () => void;
  onMoreInfo: (agentType: string) => void;
  isVisible: boolean;
}

const agentIcons: Record<string, string> = {
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
  'career-transition': 'from-blue-600 to-indigo-600',
  'relationship': 'from-pink-600 to-rose-600',
  'health-wellness': 'from-green-600 to-emerald-600',
  'financial': 'from-yellow-600 to-orange-600',
  'creative': 'from-purple-600 to-violet-600',
  'business': 'from-teal-600 to-cyan-600',
  'academic': 'from-indigo-600 to-blue-600',
  'life-transition': 'from-orange-600 to-red-600',
};

export default function AgentRecommendation({
  recommendation,
  onAccept,
  onDecline,
  onMoreInfo,
  isVisible
}: AgentRecommendationProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    // Small delay for better UX feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    onAccept(recommendation.agentType);
  };

  const handleDecline = () => {
    onDecline();
  };

  if (!isVisible) return null;

  const agentIcon = agentIcons[recommendation.agentType] || '👤';
  const gradientColor = agentColors[recommendation.agentType] || 'from-gray-600 to-gray-700';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 max-w-md mx-auto"
        role="dialog"
        aria-labelledby="agent-recommendation-title"
        aria-describedby="agent-recommendation-description"
      >
        {/* Header with Agent Identity */}
        <div className="flex items-start space-x-4 mb-6">
          <div className={`w-12 h-12 bg-gradient-to-r ${gradientColor} rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0`}>
            {agentIcon}
          </div>
          <div className="flex-1">
            <h3 id="agent-recommendation-title" className="text-lg font-semibold text-gray-900 mb-1">
              Connect with {recommendation.agentName}
            </h3>
            <p className="text-sm text-gray-600">
              {recommendation.agentDescription}
            </p>
          </div>
        </div>

        {/* Maya's Recommendation Reasoning */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex items-start">
            <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">
                Why I'm suggesting this
              </p>
              <p id="agent-recommendation-description" className="text-sm text-blue-700">
                {recommendation.reason}
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Preview */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            What they bring to your situation:
          </h4>
          <ul className="space-y-2">
            {recommendation.benefits.slice(0, showDetails ? recommendation.benefits.length : 2).map((benefit, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start text-sm text-gray-700"
              >
                <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5 mr-2" />
                {benefit}
              </motion.li>
            ))}
          </ul>

          {recommendation.benefits.length > 2 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-600 hover:text-blue-700 mt-2 flex items-center"
              aria-expanded={showDetails}
              aria-controls="additional-benefits"
            >
              {showDetails ? 'Show less' : `View ${recommendation.benefits.length - 2} more benefits`}
              <motion.div
                animate={{ rotate: showDetails ? 180 : 0 }}
                className="ml-1"
              >
                ↓
              </motion.div>
            </button>
          )}
        </div>

        {/* Session Details */}
        <div className="flex items-center text-xs text-gray-500 mb-6 space-x-4">
          <div className="flex items-center">
            <ClockIcon className="w-4 h-4 mr-1" />
            {recommendation.estimatedDuration}
          </div>
          <div className="flex items-center">
            <UserIcon className="w-4 h-4 mr-1" />
            I'll be right here when you return
          </div>
        </div>

        {/* Continuity Assurance */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-green-800 italic">
            "{recommendation.continuityAssurance}"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <motion.button
            onClick={handleAccept}
            disabled={isProcessing}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 bg-gradient-to-r ${gradientColor} text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
              isProcessing ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            aria-describedby="accept-button-description"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <span>Connect Now</span>
                <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </motion.button>

          <motion.button
            onClick={handleDecline}
            disabled={isProcessing}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            Stay with Maya
          </motion.button>
        </div>

        {/* More Info Link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => onMoreInfo(recommendation.agentType)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
            aria-label={`Learn more about ${recommendation.agentName}`}
          >
            Learn more about this specialist
          </button>
        </div>

        {/* Accessibility Descriptions */}
        <div className="sr-only">
          <div id="accept-button-description">
            Connect with {recommendation.agentName} for specialized help with {recommendation.context}. 
            Maya will maintain your conversation history and be available when you return.
          </div>
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center"
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Preparing connection...</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}