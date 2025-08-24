'use client';

import React from 'react';
import { 
  MayaOnboardingProvider, 
  useMayaOnboardingPhase,
  useMayaOnboardingData,
  useMayaOnboardingVoice,
  useMayaOnboardingErrors,
  useMayaOnboardingAnalytics
} from '@/contexts/MayaOnboardingContext';
import { useMayaOnboardingPersistence } from '@/hooks/useMayaOnboardingPersistence';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  MicrophoneIcon,
  CloudArrowUpIcon,
  WifiIcon 
} from '@heroicons/react/24/outline';

/**
 * Example implementation showing how to integrate the Maya Onboarding Context
 * with various components and features.
 */

// =====================================================
// MAIN ONBOARDING WRAPPER
// =====================================================

export function MayaOnboardingExample() {
  const { user, effectiveUserId, isAnonymous } = useUser();
  const userName = user?.user_metadata?.name || 'User';

  return (
    <MayaOnboardingProvider
      user={user}
      userName={userName}
      effectiveUserId={effectiveUserId}
      isAnonymous={isAnonymous}
    >
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <OnboardingHeader />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <PhaseNavigator />
              <CurrentPhaseComponent />
            </div>
            <div className="space-y-6">
              <VoiceControlPanel />
              <ErrorPanel />
              <PersistencePanel />
              <AnalyticsPanel />
            </div>
          </div>
        </div>
      </div>
    </MayaOnboardingProvider>
  );
}

// =====================================================
// HEADER WITH PROGRESS
// =====================================================

function OnboardingHeader() {
  const { currentPhase } = useMayaOnboardingPhase();
  const { data } = useMayaOnboardingData();
  const { analytics } = useMayaOnboardingAnalytics();

  const phases = [
    'setup', 'category_selection', 'goal_selection', 'time_horizon',
    'learning_preferences', 'agent_matching', 'agent_conversation', 'completed'
  ];

  const currentIndex = phases.indexOf(currentPhase);
  const progressPercentage = ((currentIndex + 1) / phases.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Maya Voice-Guided Onboarding</CardTitle>
            <p className="text-gray-600 mt-1">
              Current Phase: {currentPhase.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              {analytics.voiceInteractions} voice • {analytics.manualInteractions} manual
            </div>
            <div className="text-xs text-gray-400">
              Session: {Math.floor((Date.now() - new Date(analytics.startTime).getTime()) / 1000 / 60)}m
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>
      </CardHeader>
    </Card>
  );
}

// =====================================================
// PHASE NAVIGATOR
// =====================================================

function PhaseNavigator() {
  const { currentPhase, transitionToPhase, canAdvanceToPhase } = useMayaOnboardingPhase();
  const { data } = useMayaOnboardingData();

  const phases = [
    { key: 'setup', name: 'Setup', icon: '⚙️' },
    { key: 'category_selection', name: 'Categories', icon: '📂' },
    { key: 'goal_selection', name: 'Goals', icon: '🎯' },
    { key: 'time_horizon', name: 'Timeline', icon: '⏰' },
    { key: 'learning_preferences', name: 'Learning', icon: '🧠' },
    { key: 'agent_matching', name: 'Agent Match', icon: '🤝' },
    { key: 'agent_conversation', name: 'Conversation', icon: '💬' },
    { key: 'completed', name: 'Complete', icon: '✅' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {phases.map((phase) => {
            const isCurrent = currentPhase === phase.key;
            const isCompleted = phases.findIndex(p => p.key === currentPhase) > phases.findIndex(p => p.key === phase.key);
            const canAdvance = canAdvanceToPhase(phase.key as any);

            return (
              <Button
                key={phase.key}
                variant={isCurrent ? 'default' : isCompleted ? 'secondary' : 'outline'}
                className={`h-auto p-3 flex flex-col items-center space-y-1 ${
                  !canAdvance && !isCurrent && !isCompleted ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!canAdvance && !isCurrent && !isCompleted}
                onClick={() => {
                  if (canAdvance || isCompleted) {
                    transitionToPhase(phase.key as any, 'manual');
                  }
                }}
              >
                <span className="text-lg">{phase.icon}</span>
                <span className="text-xs">{phase.name}</span>
                {isCompleted && <CheckCircleIcon className="w-3 h-3 text-green-500" />}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// CURRENT PHASE COMPONENT
// =====================================================

function CurrentPhaseComponent() {
  const { currentPhase } = useMayaOnboardingPhase();
  const { data, updateData, validationErrors } = useMayaOnboardingData();

  const renderPhaseContent = () => {
    switch (currentPhase) {
      case 'setup':
        return <SetupPhaseDemo />;
      case 'category_selection':
        return <CategorySelectionDemo />;
      case 'goal_selection':
        return <GoalSelectionDemo />;
      case 'time_horizon':
        return <TimeHorizonDemo />;
      case 'learning_preferences':
        return <LearningPreferencesDemo />;
      case 'agent_matching':
        return <AgentMatchingDemo />;
      case 'agent_conversation':
        return <AgentConversationDemo />;
      case 'completed':
        return <CompletedDemo />;
      default:
        return <div>Unknown phase: {currentPhase}</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {currentPhase.replace('_', ' ').toUpperCase()} Phase
        </CardTitle>
        {validationErrors[currentPhase] && (
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Validation Error</AlertTitle>
            <AlertDescription>
              {validationErrors[currentPhase].join(', ')}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        {renderPhaseContent()}
      </CardContent>
    </Card>
  );
}

// =====================================================
// VOICE CONTROL PANEL
// =====================================================

function VoiceControlPanel() {
  const { 
    voiceState, 
    voiceEnabled, 
    voiceFallbackMode,
    enableVoice, 
    disableVoice, 
    toggleVoiceFallback 
  } = useMayaOnboardingVoice();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MicrophoneIcon className="w-5 h-5" />
          <span>Voice Control</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Voice Enabled</span>
          <Button
            size="sm"
            variant={voiceEnabled ? "default" : "outline"}
            onClick={voiceEnabled ? disableVoice : enableVoice}
          >
            {voiceEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Fallback Mode</span>
          <Badge variant={voiceFallbackMode ? "destructive" : "secondary"}>
            {voiceFallbackMode ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Status</span>
            <div className="flex space-x-1">
              {voiceState.isConnected && <Badge variant="secondary">Connected</Badge>}
              {voiceState.isListening && <Badge variant="default">Listening</Badge>}
              {voiceState.isSpeaking && <Badge variant="default">Speaking</Badge>}
              {voiceState.isProcessing && <Badge variant="outline">Processing</Badge>}
            </div>
          </div>

          {voiceState.error && (
            <Alert>
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {voiceState.error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Button 
          size="sm" 
          variant="outline" 
          onClick={toggleVoiceFallback}
          className="w-full"
        >
          Toggle Fallback Mode
        </Button>
      </CardContent>
    </Card>
  );
}

// =====================================================
// ERROR PANEL
// =====================================================

function ErrorPanel() {
  const { 
    errors, 
    conflicts, 
    hasErrors, 
    hasConflicts, 
    clearErrors, 
    retryFailedActions 
  } = useMayaOnboardingErrors();

  if (!hasErrors && !hasConflicts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-600">
            <CheckCircleIcon className="w-5 h-5" />
            <span>All Good</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No errors or conflicts detected.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>Issues</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {errors.map((error) => (
          <Alert key={error.id} variant="destructive">
            <AlertTitle>{error.type} Error</AlertTitle>
            <AlertDescription className="text-sm">
              {error.message}
              {error.retryable && (
                <Badge variant="outline" className="ml-2">Retryable</Badge>
              )}
            </AlertDescription>
          </Alert>
        ))}

        {conflicts.filter(c => !c.resolved).map((conflict) => (
          <Alert key={conflict.id}>
            <AlertTitle>Voice-UI Conflict</AlertTitle>
            <AlertDescription className="text-sm">
              Conflict between voice command and manual action
            </AlertDescription>
          </Alert>
        ))}

        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={clearErrors}>
            Clear Errors
          </Button>
          <Button size="sm" onClick={retryFailedActions}>
            Retry Failed Actions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// PERSISTENCE PANEL
// =====================================================

function PersistencePanel() {
  const { data } = useMayaOnboardingData();
  const { 
    saveWithRetry, 
    runHealthCheck, 
    isOnline, 
    syncQueueLength, 
    syncStatus 
  } = useMayaOnboardingPersistence();

  const [healthStatus, setHealthStatus] = React.useState<any>(null);

  const checkHealth = async () => {
    const status = await runHealthCheck();
    setHealthStatus(status);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CloudArrowUpIcon className="w-5 h-5" />
          <span>Persistence</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Connection</span>
            <div className="flex items-center space-x-1">
              <WifiIcon className={`w-4 h-4 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
              <Badge variant={isOnline ? "secondary" : "destructive"}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Sync Status</span>
            <Badge variant={
              syncStatus === 'idle' ? 'secondary' :
              syncStatus === 'syncing' ? 'default' :
              syncStatus === 'error' ? 'destructive' : 'outline'
            }>
              {syncStatus}
            </Badge>
          </div>

          {syncQueueLength > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending</span>
              <Badge variant="outline">{syncQueueLength} operations</Badge>
            </div>
          )}

          {data.lastSyncTime && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Sync</span>
              <span className="text-xs text-gray-500">
                {new Date(data.lastSyncTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button size="sm" onClick={() => saveWithRetry()}>
            Force Save
          </Button>
          <Button size="sm" variant="outline" onClick={checkHealth}>
            Health Check
          </Button>
        </div>

        {healthStatus && (
          <Alert variant={healthStatus.isHealthy ? "default" : "destructive"}>
            <AlertTitle>
              Health: {healthStatus.isHealthy ? 'Good' : 'Issues Found'}
            </AlertTitle>
            <AlertDescription>
              {healthStatus.issues.length > 0 && (
                <ul className="text-xs mt-2 space-y-1">
                  {healthStatus.issues.map((issue, i) => (
                    <li key={i}>• {issue.message}</li>
                  ))}
                </ul>
              )}
              {healthStatus.suggestions.length > 0 && (
                <div className="text-xs mt-2">
                  <strong>Suggestions:</strong> {healthStatus.suggestions.join(', ')}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// ANALYTICS PANEL
// =====================================================

function AnalyticsPanel() {
  const { analytics, getAnalyticsSummary } = useMayaOnboardingAnalytics();
  const summary = getAnalyticsSummary();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {analytics.voiceInteractions}
            </div>
            <div className="text-xs text-gray-500">Voice Interactions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {analytics.manualInteractions}
            </div>
            <div className="text-xs text-gray-500">Manual Interactions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {analytics.errorCount}
            </div>
            <div className="text-xs text-gray-500">Errors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {Math.round(summary.voiceSuccessRate)}%
            </div>
            <div className="text-xs text-gray-500">Voice Success</div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="text-sm font-medium mb-2">Phase Completion Times</div>
          <div className="space-y-1">
            {Object.entries(analytics.phaseCompletionTimes).map(([phase, time]) => {
              if (!time) return null;
              return (
                <div key={phase} className="flex justify-between text-xs">
                  <span>{phase.replace('_', ' ')}</span>
                  <span>{Math.round(time / 1000)}s</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// DEMO PHASE COMPONENTS
// =====================================================

function SetupPhaseDemo() {
  const { data, updateData } = useMayaOnboardingData();
  const { transitionToPhase } = useMayaOnboardingPhase();

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Enter your name"
        className="w-full p-2 border rounded"
        value={data.userPreferences?.userName || ''}
        onChange={(e) => updateData({
          userPreferences: { ...data.userPreferences, userName: e.target.value }
        })}
      />
      <Button onClick={() => transitionToPhase('category_selection', 'manual')}>
        Continue to Categories
      </Button>
    </div>
  );
}

function CategorySelectionDemo() {
  const { data, updateData } = useMayaOnboardingData();
  const { transitionToPhase } = useMayaOnboardingPhase();

  const categories = ['Health', 'Career', 'Relationships', 'Learning'];

  const toggleCategory = (category: string) => {
    const current = data.selectedCategories;
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updateData({ selectedCategories: updated });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {categories.map(category => (
          <Button
            key={category}
            variant={data.selectedCategories.includes(category) ? "default" : "outline"}
            onClick={() => toggleCategory(category)}
            className="h-20"
          >
            {category}
          </Button>
        ))}
      </div>
      {data.selectedCategories.length > 0 && (
        <Button onClick={() => transitionToPhase('goal_selection', 'manual')}>
          Continue to Goals
        </Button>
      )}
    </div>
  );
}

function GoalSelectionDemo() {
  const { data, updateData } = useMayaOnboardingData();
  const { transitionToPhase } = useMayaOnboardingPhase();

  const [newGoal, setNewGoal] = React.useState('');

  const addGoal = () => {
    if (newGoal.trim()) {
      const updated = [...data.selectedGoals, { title: newGoal, category: 'General' }];
      updateData({ selectedGoals: updated });
      setNewGoal('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Add a goal..."
          className="flex-1 p-2 border rounded"
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addGoal()}
        />
        <Button onClick={addGoal}>Add</Button>
      </div>
      
      <div className="space-y-2">
        {data.selectedGoals.map((goal, index) => (
          <div key={index} className="p-2 bg-gray-100 rounded flex justify-between">
            <span>{goal.title}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const updated = data.selectedGoals.filter((_, i) => i !== index);
                updateData({ selectedGoals: updated });
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      {data.selectedGoals.length > 0 && (
        <Button onClick={() => transitionToPhase('time_horizon', 'manual')}>
          Continue to Timeline
        </Button>
      )}
    </div>
  );
}

function TimeHorizonDemo() {
  const { data, updateData } = useMayaOnboardingData();
  const { transitionToPhase } = useMayaOnboardingPhase();

  const timeOptions = [
    { key: 'short', label: '3 Months' },
    { key: 'medium', label: '6 Months' },
    { key: 'long', label: '1 Year' }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {timeOptions.map(option => (
          <Button
            key={option.key}
            variant={data.timeHorizon === option.key ? "default" : "outline"}
            className="w-full"
            onClick={() => updateData({ timeHorizon: option.key as any })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {data.timeHorizon && (
        <Button onClick={() => transitionToPhase('learning_preferences', 'manual')}>
          Continue to Learning Preferences
        </Button>
      )}
    </div>
  );
}

function LearningPreferencesDemo() {
  return <div>Learning preferences configuration...</div>;
}

function AgentMatchingDemo() {
  return <div>Agent matching in progress...</div>;
}

function AgentConversationDemo() {
  return <div>Agent conversation interface...</div>;
}

function CompletedDemo() {
  return (
    <div className="text-center space-y-4">
      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
      <h2 className="text-xl font-bold">Onboarding Complete!</h2>
      <p className="text-gray-600">You're all set to start your journey.</p>
    </div>
  );
}