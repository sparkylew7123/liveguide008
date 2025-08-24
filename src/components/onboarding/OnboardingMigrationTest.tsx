'use client'

import { useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useOnboardingPersistence } from '@/hooks/useOnboardingPersistence'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/utils/supabase/client'

/**
 * Test component to verify anonymous to authenticated user migration
 * 
 * This component helps test:
 * 1. Anonymous user data storage
 * 2. Sign-in process
 * 3. Data migration from anonymous to authenticated
 * 4. Persistence after migration
 */
export function OnboardingMigrationTest() {
  const { user, isAnonymous, effectiveUserId, signOut } = useUser()
  const {
    onboardingState,
    saveGoals,
    saveTimeHorizon,
    saveLearningPrefs,
    isLoading,
    error
  } = useOnboardingPersistence()
  
  const [migrationStatus, setMigrationStatus] = useState<string>('')
  const [testPhase, setTestPhase] = useState<'setup' | 'anonymous' | 'authenticated'>('setup')
  const supabase = createClient()

  // Step 1: Create anonymous data
  const setupAnonymousData = async () => {
    try {
      setMigrationStatus('Setting up anonymous data...')
      
      // Save some test goals
      const testGoals = [
        { goalId: 'test-goal-1' },
        { goalId: 'test-goal-2' }
      ]
      await saveGoals(testGoals)
      
      // Save time horizon
      await saveTimeHorizon('medium')
      
      // Save learning preferences
      const testPrefs = {
        time_horizon: 'medium' as const,
        learning_prefs: ['visual', 'hands-on'],
        preferred_categories: ['career', 'health'],
        experience_level: 'beginner' as const,
        motivation_factors: ['accountability']
      }
      await saveLearningPrefs(testPrefs)
      
      setMigrationStatus('✅ Anonymous data created successfully!')
      setTestPhase('anonymous')
    } catch (err) {
      setMigrationStatus(`❌ Failed to setup anonymous data: ${err}`)
    }
  }

  // Step 2: Sign in with test user
  const signInWithTestUser = async () => {
    try {
      setMigrationStatus('Signing in with test user...')
      
      // Use a test email/password or sign up
      const testEmail = 'test@example.com'
      const testPassword = 'testpassword123'
      
      // Try to sign in first, if fails then sign up
      let { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })
      
      if (error && error.message.includes('Invalid login credentials')) {
        // Sign up if user doesn't exist
        const signUpResult = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword
        })
        
        if (signUpResult.error) {
          throw signUpResult.error
        }
        
        data = signUpResult.data
      } else if (error) {
        throw error
      }
      
      if (data.user) {
        setMigrationStatus('✅ Signed in successfully! Migration should happen automatically...')
        setTestPhase('authenticated')
      } else {
        setMigrationStatus('❌ Sign in failed - no user returned')
      }
    } catch (err) {
      setMigrationStatus(`❌ Sign in failed: ${err}`)
    }
  }

  // Step 3: Verify migration
  const verifyMigration = async () => {
    if (!user) {
      setMigrationStatus('❌ No authenticated user found')
      return
    }

    try {
      setMigrationStatus('Verifying migration...')
      
      // Check if data was migrated to database
      const { data: userGoals, error: goalsError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
      
      const { data: questionnaire, error: questionnaireError } = await supabase
        .from('user_questionnaire')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (goalsError || questionnaireError) {
        setMigrationStatus(`❌ Database query failed: ${goalsError?.message || questionnaireError?.message}`)
        return
      }
      
      const results = []
      results.push(`Goals migrated: ${userGoals?.length || 0}`)
      results.push(`Questionnaire migrated: ${questionnaire ? 'Yes' : 'No'}`)
      results.push(`Time horizon: ${questionnaire?.time_horizon || 'Not set'}`)
      results.push(`Learning prefs: ${questionnaire?.learning_prefs?.length || 0} items`)
      
      setMigrationStatus(`✅ Migration verified!\n${results.join('\n')}`)
    } catch (err) {
      setMigrationStatus(`❌ Verification failed: ${err}`)
    }
  }

  const resetTest = async () => {
    try {
      setMigrationStatus('Resetting test...')
      
      // Sign out
      await signOut()
      
      // Clear any remaining data
      if (typeof window !== 'undefined') {
        localStorage.clear()
      }
      
      setTestPhase('setup')
      setMigrationStatus('Test reset. Ready to start over.')
    } catch (err) {
      setMigrationStatus(`❌ Reset failed: ${err}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Migration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Current Status */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Status</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <strong>User Status:</strong> 
                <Badge variant={user ? 'default' : 'secondary'} className="ml-2">
                  {user ? 'Authenticated' : 'Anonymous'}
                </Badge>
              </div>
              <div>
                <strong>Effective User ID:</strong> {effectiveUserId}
              </div>
              <div>
                <strong>Test Phase:</strong> 
                <Badge variant="outline" className="ml-2">
                  {testPhase}
                </Badge>
              </div>
              {user && (
                <div>
                  <strong>User Email:</strong> {user.email}
                </div>
              )}
            </div>
          </div>

          {/* Onboarding State */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Onboarding State</h3>
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div>
                <strong>Goals:</strong> {onboardingState?.selectedGoals.length || 0} selected
              </div>
              <div>
                <strong>Time Horizon:</strong> {onboardingState?.timeHorizon || 'Not set'}
              </div>
              <div>
                <strong>Learning Prefs:</strong> {onboardingState?.learningPrefs ? 'Set' : 'Not set'}
              </div>
              <div>
                <strong>Complete:</strong> {onboardingState?.isComplete ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Last Saved:</strong> {onboardingState?.lastSavedAt ? 
                  new Date(onboardingState.lastSavedAt).toLocaleString() : 'Never'
                }
              </div>
            </div>
          </div>

          {/* Migration Status */}
          {migrationStatus && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Migration Status</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{migrationStatus}</pre>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {/* Test Controls */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Test Controls</h3>
            <div className="grid grid-cols-2 gap-4">
              
              {testPhase === 'setup' && (
                <Button 
                  onClick={setupAnonymousData}
                  disabled={isLoading}
                  className="h-auto py-3"
                >
                  <div className="text-center">
                    <div className="font-medium">1. Setup Anonymous Data</div>
                    <div className="text-xs opacity-75">Create test goals & preferences</div>
                  </div>
                </Button>
              )}

              {testPhase === 'anonymous' && (
                <Button 
                  onClick={signInWithTestUser}
                  disabled={isLoading}
                  className="h-auto py-3"
                >
                  <div className="text-center">
                    <div className="font-medium">2. Sign In</div>
                    <div className="text-xs opacity-75">Trigger migration</div>
                  </div>
                </Button>
              )}

              {testPhase === 'authenticated' && user && (
                <Button 
                  onClick={verifyMigration}
                  disabled={isLoading}
                  className="h-auto py-3"
                >
                  <div className="text-center">
                    <div className="font-medium">3. Verify Migration</div>
                    <div className="text-xs opacity-75">Check database</div>
                  </div>
                </Button>
              )}

              <Button 
                onClick={resetTest}
                variant="outline"
                className="h-auto py-3"
              >
                <div className="text-center">
                  <div className="font-medium">Reset Test</div>
                  <div className="text-xs opacity-75">Start over</div>
                </div>
              </Button>

            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Test Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click "Setup Anonymous Data" to create test onboarding data as an anonymous user</li>
              <li>Click "Sign In" to authenticate and trigger the migration process</li>
              <li>Click "Verify Migration" to check that data was successfully migrated to the database</li>
              <li>Use "Reset Test" to sign out and clear data to test again</li>
            </ol>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

// Simple wrapper for testing
export function MigrationTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">Migration Test</h1>
        <OnboardingMigrationTest />
      </div>
    </div>
  )
}