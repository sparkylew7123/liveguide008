'use client'

import { useOnboardingPersistence } from '@/hooks/useOnboardingPersistence'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Example component showing how to use the onboarding persistence hooks
 * 
 * This demonstrates:
 * - Reading current onboarding state
 * - Saving goals with optimistic updates
 * - Saving time horizon
 * - Saving learning preferences
 * - Error handling
 * - Loading states
 */
export function OnboardingPersistenceExample() {
  const {
    onboardingState,
    isLoading,
    error,
    saveGoals,
    saveTimeHorizon,
    saveLearningPrefs,
    completeOnboarding,
    refreshState
  } = useOnboardingPersistence()

  // Example: Save some goals
  const handleSaveExampleGoals = async () => {
    try {
      // These would be actual goal IDs from your database
      const exampleGoalSelections = [
        { goalId: 'career-promotion-goal-id' },
        { goalId: 'health-fitness-goal-id' }
      ]
      
      await saveGoals(exampleGoalSelections)
      console.log('Goals saved successfully!')
    } catch (err) {
      console.error('Failed to save goals:', err)
    }
  }

  // Example: Save time horizon
  const handleSaveTimeHorizon = async () => {
    try {
      await saveTimeHorizon('medium')
      console.log('Time horizon saved successfully!')
    } catch (err) {
      console.error('Failed to save time horizon:', err)
    }
  }

  // Example: Save learning preferences
  const handleSaveLearningPrefs = async () => {
    try {
      const learningPrefs = {
        time_horizon: 'medium' as const,
        learning_prefs: ['visual', 'hands-on'],
        preferred_categories: ['career', 'health'],
        experience_level: 'intermediate' as const,
        motivation_factors: ['accountability', 'progress-tracking']
      }
      
      await saveLearningPrefs(learningPrefs)
      console.log('Learning preferences saved successfully!')
    } catch (err) {
      console.error('Failed to save learning preferences:', err)
    }
  }

  // Example: Complete onboarding
  const handleCompleteOnboarding = async () => {
    try {
      await completeOnboarding()
      console.log('Onboarding completed successfully!')
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading onboarding state...</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Persistence Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Current State Display */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Onboarding State</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <strong>Goals Selected:</strong> {onboardingState?.selectedGoals.length || 0}
              </div>
              <div>
                <strong>Time Horizon:</strong> {onboardingState?.timeHorizon || 'Not set'}
              </div>
              <div>
                <strong>Learning Preferences:</strong> {onboardingState?.learningPrefs ? 'Set' : 'Not set'}
              </div>
              <div>
                <strong>Onboarding Complete:</strong> 
                <Badge variant={onboardingState?.isComplete ? 'default' : 'secondary'} className="ml-2">
                  {onboardingState?.isComplete ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <strong>Last Saved:</strong> {onboardingState?.lastSavedAt ? 
                  new Date(onboardingState.lastSavedAt).toLocaleString() : 'Never'
                }
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={handleSaveExampleGoals}
              variant="outline"
              className="h-auto py-3"
            >
              <div className="text-center">
                <div className="font-medium">Save Example Goals</div>
                <div className="text-xs text-gray-500">Career + Health goals</div>
              </div>
            </Button>

            <Button 
              onClick={handleSaveTimeHorizon}
              variant="outline"
              className="h-auto py-3"
            >
              <div className="text-center">
                <div className="font-medium">Save Time Horizon</div>
                <div className="text-xs text-gray-500">Set to 'medium'</div>
              </div>
            </Button>

            <Button 
              onClick={handleSaveLearningPrefs}
              variant="outline"
              className="h-auto py-3"
            >
              <div className="text-center">
                <div className="font-medium">Save Learning Prefs</div>
                <div className="text-xs text-gray-500">Visual + hands-on</div>
              </div>
            </Button>

            <Button 
              onClick={handleCompleteOnboarding}
              variant="outline"
              className="h-auto py-3"
            >
              <div className="text-center">
                <div className="font-medium">Complete Onboarding</div>
                <div className="text-xs text-gray-500">Mark as finished</div>
              </div>
            </Button>
          </div>

          {/* Refresh Button */}
          <div className="text-center">
            <Button onClick={refreshState} variant="ghost">
              Refresh State
            </Button>
          </div>

          {/* Usage Code Examples */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Usage Examples</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <pre>{`// Basic usage in a component
import { useOnboardingPersistence } from '@/hooks/useOnboardingPersistence'

export function MyOnboardingStep() {
  const {
    onboardingState,
    saveGoals,
    saveTimeHorizon,
    saveLearningPrefs,
    isLoading,
    error
  } = useOnboardingPersistence()

  // Save goals (with optimistic updates)
  const handleGoalSave = async (goalIds: string[]) => {
    const goalSelections = goalIds.map(id => ({ goalId: id }))
    await saveGoals(goalSelections)
  }

  // Save time horizon  
  const handleTimeHorizonSave = async () => {
    await saveTimeHorizon('medium')
  }

  // Save learning preferences
  const handleLearningPrefsSave = async () => {
    const prefs = {
      time_horizon: 'medium' as const,
      learning_prefs: ['visual', 'auditory'],
      preferred_categories: ['career'],
      experience_level: 'beginner' as const,
      motivation_factors: ['accountability']
    }
    await saveLearningPrefs(prefs)
  }

  // Access current state
  const hasGoals = onboardingState?.selectedGoals.length > 0
  const isComplete = onboardingState?.isComplete

  // Handle loading and errors
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return <div>Your onboarding component</div>
}`}</pre>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

// Simple wrapper for quick testing
export function QuickOnboardingTest() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">Onboarding Persistence Test</h1>
        <OnboardingPersistenceExample />
      </div>
    </div>
  )
}