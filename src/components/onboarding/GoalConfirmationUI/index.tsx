'use client';

import React, { useState } from 'react';
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface PresetGoal {
  id: string;
  title: string;
  description?: string;
  category_id: string;
}

interface GoalConfirmationProps {
  userPhrase: string;
  suggestedGoal: PresetGoal | null;
  onConfirm: (confirmed: boolean, preferredTerm?: string) => void;
  isProcessing?: boolean;
  className?: string;
}

export default function GoalConfirmationUI({
  userPhrase,
  suggestedGoal,
  onConfirm,
  isProcessing = false,
  className
}: GoalConfirmationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [customTerm, setCustomTerm] = useState(userPhrase);

  const handleAccept = () => {
    onConfirm(true, suggestedGoal?.title);
  };

  const handleModify = () => {
    if (isEditing) {
      onConfirm(true, customTerm);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleReject = () => {
    onConfirm(false);
  };

  return (
    <div className={cn(
      "bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto",
      "border border-gray-200",
      className
    )}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Goal Confirmation
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Let's make sure we understand your goal correctly
        </p>
      </div>

      {/* User's Original Phrase */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-2">You said:</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-gray-900 italic">"{userPhrase}"</p>
        </div>
      </div>

      {/* Suggested Match or Custom Goal */}
      {suggestedGoal ? (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">We found a similar goal:</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            {isEditing ? (
              <div className="space-y-3">
                <label htmlFor="custom-term" className="text-sm text-gray-700">
                  How would you prefer to phrase this goal?
                </label>
                <input
                  id="custom-term"
                  type="text"
                  value={customTerm}
                  onChange={(e) => setCustomTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your preferred wording"
                  autoFocus
                />
              </div>
            ) : (
              <>
                <p className="font-medium text-gray-900">
                  {suggestedGoal.title}
                </p>
                {suggestedGoal.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {suggestedGoal.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Category: {suggestedGoal.category_id}
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">
            This seems to be a unique goal. We'll create a custom one for you!
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-medium text-gray-900">
              Custom Goal: "{userPhrase}"
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {suggestedGoal && (
          <>
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className={cn(
                "flex-1 py-3 px-4 rounded-lg font-medium",
                "bg-green-600 text-white hover:bg-green-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
                "transition-colors duration-200"
              )}
            >
              <CheckIcon className="w-5 h-5" />
              <span>Yes, that's right</span>
            </button>

            <button
              onClick={handleModify}
              disabled={isProcessing}
              className={cn(
                "flex-1 py-3 px-4 rounded-lg font-medium",
                "bg-blue-600 text-white hover:bg-blue-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
                "transition-colors duration-200"
              )}
            >
              <PencilIcon className="w-5 h-5" />
              <span>{isEditing ? 'Save my version' : 'I prefer different wording'}</span>
            </button>

            <button
              onClick={handleReject}
              disabled={isProcessing}
              className={cn(
                "flex-1 py-3 px-4 rounded-lg font-medium",
                "bg-gray-600 text-white hover:bg-gray-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
                "transition-colors duration-200"
              )}
            >
              <XMarkIcon className="w-5 h-5" />
              <span>No, create custom</span>
            </button>
          </>
        )}

        {!suggestedGoal && (
          <button
            onClick={() => onConfirm(false)}
            disabled={isProcessing}
            className={cn(
              "w-full py-3 px-4 rounded-lg font-medium",
              "bg-blue-600 text-white hover:bg-blue-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2",
              "transition-colors duration-200"
            )}
          >
            <CheckIcon className="w-5 h-5" />
            <span>Create this custom goal</span>
          </button>
        )}
      </div>

      {isProcessing && (
        <div className="mt-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Processing your choice...</p>
        </div>
      )}
    </div>
  );
}