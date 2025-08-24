'use client';

import React, { useState, useEffect } from 'react';
import { PhoneIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

interface InitiateCallButtonProps {
  agentName?: string;
  onInitiate: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function InitiateCallButton({
  agentName,
  onInitiate,
  disabled = false,
  loading = false,
  className
}: InitiateCallButtonProps) {
  const [isPulsing, setIsPulsing] = useState(false);

  // Add pulse animation when agent is selected
  useEffect(() => {
    if (agentName && !disabled) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [agentName, disabled]);

  const buttonText = agentName 
    ? `Begin onboarding with ${agentName}`
    : 'Loading agents...';

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-gray-200",
      "md:relative md:p-0 md:bg-transparent md:border-0 md:backdrop-blur-none",
      className
    )}>
      <button
        onClick={onInitiate}
        disabled={disabled || loading || !agentName}
        className={cn(
          "w-full py-4 px-6 rounded-lg font-medium text-white",
          "flex items-center justify-center gap-3",
          "transition-all duration-300 transform",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          agentName && !disabled && !loading
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 active:scale-95"
            : "bg-gray-400",
          isPulsing && "animate-pulse",
          "shadow-lg hover:shadow-xl"
        )}
        aria-label={buttonText}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <PhoneIcon className={cn(
              "w-5 h-5",
              agentName && !disabled && "animate-bounce"
            )} />
            <span className="text-base md:text-lg">
              {buttonText}
            </span>
          </>
        )}
      </button>

      {/* Visual hint for mobile users */}
      {!agentName && (
        <p className="text-xs text-gray-500 text-center mt-2 md:hidden">
          Swipe to browse agents
        </p>
      )}
    </div>
  );
}