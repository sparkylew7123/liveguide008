'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { graphGoalService, GraphGoal } from '@/lib/graph-goals'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ViewfinderCircleIcon, MicrophoneIcon, CalendarIcon, ArrowTrendingUpIcon, UsersIcon, HeartIcon, BriefcaseIcon, SparklesIcon, CheckCircleIcon, ClockIcon, ArrowRightIcon, TrophyIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function LobbyPage() {
  const router = useRouter()
  const { user, anonymousUser, isAnonymous, effectiveUserId, isLoading } = useUser()
  const [userGoals, setUserGoals] = useState<GraphGoal[]>([])
  const [loadingGoals, setLoadingGoals] = useState(true)
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [emotionalJourney, setEmotionalJourney] = useState<any[]>([])

  useEffect(() => {
    // Only redirect if we're done loading and there's no user
    if (!isLoading && !user && !anonymousUser) {
      router.push('/login')
      return
    }

    if (!effectiveUserId) {
      // For non-authenticated users, set empty data and stop loading
      setUserGoals([])
      setRecentSessions([])
      setEmotionalJourney([])
      setLoadingGoals(false)
      return
    }

    const loadData = async () => {
      try {
        // Load goals with progress
        const goals = await graphGoalService.getUserGoalsWithProgress(effectiveUserId)
        
        // Deduplicate goals by title
        const uniqueGoals = goals.reduce((acc, goal) => {
          const existingGoal = acc.find(g => g.goal_title === goal.goal_title)
          if (!existingGoal) {
            acc.push(goal)
          } else if ((goal.session_count || 0) > (existingGoal.session_count || 0)) {
            // Keep the goal with more sessions
            const index = acc.indexOf(existingGoal)
            acc[index] = goal
          }
          return acc
        }, [] as GraphGoal[])
        
        console.log(`Deduplicated ${goals.length} goals to ${uniqueGoals.length} unique goals`)
        setUserGoals(uniqueGoals)

        // Load recent sessions
        const sessions = await graphGoalService.getRecentSessions(effectiveUserId, 5)
        setRecentSessions(sessions)

        // Load emotional journey for confidence tracking
        const emotions = await graphGoalService.getEmotionalJourney(effectiveUserId, 30)
        setEmotionalJourney(emotions)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoadingGoals(false)
      }
    }

    loadData()
  }, [effectiveUserId, user, isLoading, router])

  const getCategoryIcon = (categoryTitle: string) => {
    switch (categoryTitle) {
      case 'Personal Growth':
        return <ViewfinderCircleIcon />
      case 'Professional':
        return <BriefcaseIcon />
      case 'Health & Wellness':
        return <HeartIcon />
      case 'Relationships':
        return <UsersIcon />
      default:
        return <SparklesIcon />
    }
  }

  const getCategoryColor = (categoryTitle: string) => {
    switch (categoryTitle) {
      case 'Personal Growth':
        return 'bg-purple-500'
      case 'Professional':
        return 'bg-blue-500'
      case 'Health & Wellness':
        return 'bg-green-500'
      case 'Relationships':
        return 'bg-amber-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Group goals by category
  const goalsByCategory = userGoals.reduce((acc, goal) => {
    const category = goal.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(goal)
    return acc
  }, {} as Record<string, GraphGoal[]>)

  // Calculate overall progress metrics
  const totalGoals = userGoals.length
  const totalSessions = userGoals.reduce((sum, goal) => sum + (goal.session_count || 0), 0)
  const totalDuration = userGoals.reduce((sum, goal) => sum + (goal.total_duration_minutes || 0), 0)
  const totalAccomplishments = userGoals.reduce((sum, goal) => sum + (goal.accomplishment_count || 0), 0)
  
  // Calculate average confidence from emotional journey
  const averageConfidence = emotionalJourney.length > 0
    ? emotionalJourney.reduce((sum, emotion) => sum + (emotion.confidence_level || 0), 0) / emotionalJourney.length
    : 0

  if (isLoading || loadingGoals) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Spacer for fixed navbar */}
      <div className="h-16" />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </h1>
          <p className="text-gray-300">
            {isAnonymous 
              ? "Continue your coaching journey or create an account to save your progress permanently."
              : "Ready to continue your personal development journey?"
            }
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MicrophoneIcon />
                Continue Coaching
              </CardTitle>
              <CardDescription className="text-gray-300">
                Talk to your AI coach and work on your goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/onboarding/voice-guided">
                  <MicrophoneIcon  className="mr-2 h-4 w-4" />
                  Start Session
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ViewfinderCircleIcon />
                Goal Progress
              </CardTitle>
              <CardDescription className="text-gray-300">
                Track your progress across all goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Active Goals</span>
                  <span className="text-white">{totalGoals}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Total Sessions</span>
                  <span className="text-white">{totalSessions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Accomplishments</span>
                  <span className="text-white">{totalAccomplishments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Time Invested</span>
                  <span className="text-white">{Math.round(totalDuration / 60)}h {totalDuration % 60}m</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CalendarIcon />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-gray-300">
                Your coaching session history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Last Session</span>
                  <span className="text-white">
                    {recentSessions.length > 0 
                      ? new Date(recentSessions[0].start_time).toLocaleDateString()
                      : 'No sessions yet'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Confidence Level</span>
                  <span className="text-white">{(averageConfidence * 100).toFixed(0)}%</span>
                </div>
                <Progress value={averageConfidence * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals Overview */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Your Goals</h2>
            <Button asChild variant="outline" className="border-gray-400 text-gray-300 hover:bg-gray-800">
              <Link href="/onboarding/voice-guided">
                <ViewfinderCircleIcon  className="mr-2 h-4 w-4" />
                Add New Goals
              </Link>
            </Button>
          </div>

          {userGoals.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 text-center">
                <ViewfinderCircleIcon  className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Goals Yet</h3>
                <p className="text-gray-300 mb-6">
                  Start by talking to our AI coach to discover and set your personal goals.
                </p>
                <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Link href="/onboarding/voice-guided">
                    <MicrophoneIcon  className="mr-2 h-4 w-4" />
                    Discover Your Goals
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {Object.entries(goalsByCategory).map(([category, goals], index) => (
                <AccordionItem key={`category-${category}-${index}`} value={category} className="border-slate-700">
                  <AccordionTrigger className="bg-slate-800/50 px-6 py-4 rounded-lg hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>
                        {getCategoryIcon(category)}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white">{category}</div>
                        <div className="text-sm text-gray-300">
                          {goals.length} goal{goals.length !== 1 ? 's' : ''} • 
                          {goals.reduce((sum, g) => sum + (g.session_count || 0), 0)} sessions
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4">
                    <div className="space-y-3">
                      {goals.map((goal, goalIndex) => (
                        <div key={`goal-${goal.goal_id}-${goalIndex}`} className="p-4 bg-slate-800/30 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <TrophyIcon  className="h-4 w-4 text-amber-400" />
                                <div className="text-white font-medium">{goal.goal_title}</div>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Sessions:</span>
                                  <span className="text-gray-200 ml-1">{goal.session_count || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Duration:</span>
                                  <span className="text-gray-200 ml-1">{goal.total_duration_minutes || 0}m</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Accomplishments:</span>
                                  <span className="text-gray-200 ml-1">{goal.accomplishment_count || 0}</span>
                                </div>
                              </div>
                              {goal.target_date && (
                                <div className="mt-2 text-sm text-gray-400">
                                  Target: {new Date(goal.target_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {goal.priority && (
                                <Badge 
                                  variant="outline" 
                                  className={
                                    goal.priority === 'high' ? 'border-red-400 text-red-400' :
                                    goal.priority === 'medium' ? 'border-amber-400 text-amber-400' :
                                    'border-gray-400 text-gray-400'
                                  }
                                >
                                  {goal.priority}
                                </Badge>
                              )}
                              <Link href={`/coaching/${goal.goal_id}`}>
                                <Button size="sm" variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-900/20">
                                  <MicrophoneIcon  className="w-4 h-4 mr-1" />
                                  Coach
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentSessions.map((session, sessionIndex) => (
                <Card key={`session-${session.session_id}-${sessionIndex}`} className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <ChartBarIcon  className="h-4 w-4" />
                        {new Date(session.start_time).toLocaleDateString()}
                      </CardTitle>
                      <Badge variant="outline" className="text-gray-300 border-gray-400">
                        {session.duration_minutes || 0}m
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {session.emotional_state && (
                        <div className="flex items-center gap-2 text-sm">
                          <HeartIcon  className="h-4 w-4 text-red-400" />
                          <span className="text-gray-300">Feeling: {session.emotional_state}</span>
                        </div>
                      )}
                      {session.confidence_level && (
                        <div className="flex items-center gap-2 text-sm">
                          <ArrowTrendingUpIcon  className="h-4 w-4 text-green-400" />
                          <span className="text-gray-300">Confidence: {(session.confidence_level * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      {session.accomplishment_count > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircleIcon  className="h-4 w-4 text-amber-400" />
                          <span className="text-gray-300">{session.accomplishment_count} accomplishments</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Confidence Trend */}
        {emotionalJourney.length > 0 && (
          <div className="mb-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowTrendingUpIcon />
                  Confidence Trend
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Your emotional journey over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Average Confidence</span>
                    <span className="text-2xl font-bold text-white">{(averageConfidence * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={averageConfidence * 100} className="h-3" />
                  <p className="text-sm text-gray-400">
                    Based on {emotionalJourney.length} emotional check-ins
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Anonymous User CTA */}
        {isAnonymous && (
          <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Save Your Progress
                  </h3>
                  <p className="text-gray-300">
                    Create an account to permanently save your goals and track your progress across sessions.
                  </p>
                </div>
                <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Link href="/register">
                    Create Account
                    <ArrowRightIcon  className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}