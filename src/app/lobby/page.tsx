'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { goalService, GoalCategoryWithGoals } from '@/lib/goals'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { 
  Target, 
  Mic, 
  Calendar, 
  TrendingUp,
  Users,
  Heart,
  Briefcase,
  Sparkles,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function LobbyPage() {
  const { user, anonymousUser, isAnonymous, effectiveUserId, isLoading } = useUser()
  const [goalCategories, setGoalCategories] = useState<GoalCategoryWithGoals[]>([])
  const [loadingGoals, setLoadingGoals] = useState(true)

  useEffect(() => {
    if (!effectiveUserId) return

    const loadGoals = async () => {
      try {
        const categories = await goalService.getUserGoalsByCategory(effectiveUserId)
        setGoalCategories(categories)
      } catch (error) {
        console.error('Error loading goals:', error)
      } finally {
        setLoadingGoals(false)
      }
    }

    loadGoals()
  }, [effectiveUserId])

  const getCategoryIcon = (categoryTitle: string) => {
    switch (categoryTitle) {
      case 'Personal Growth':
        return <Target className="h-5 w-5" />
      case 'Professional':
        return <Briefcase className="h-5 w-5" />
      case 'Health & Wellness':
        return <Heart className="h-5 w-5" />
      case 'Relationships':
        return <Users className="h-5 w-5" />
      default:
        return <Sparkles className="h-5 w-5" />
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

  const totalGoals = goalCategories.reduce((sum, cat) => sum + cat.goals.length, 0)
  const completedGoals = goalCategories.reduce((sum, cat) => 
    sum + cat.goals.filter(goal => goal.goal_status === 'completed').length, 0
  )
  const progressPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0

  if (isLoading || loadingGoals) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image 
                src="https://res.cloudinary.com/dlq71ih0t/image/upload/v1750020672/liveguide-logo-clear.png" 
                alt="LiveGuide" 
                width={140} 
                height={40} 
                className="h-8 w-auto"
                priority
                unoptimized
              />
            </Link>
            
            <div className="flex items-center gap-4">
              {isAnonymous ? (
                <>
                  <Badge variant="outline" className="text-amber-400 border-amber-400">
                    Anonymous Session
                  </Badge>
                  <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Link href="/register">Create Account</Link>
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="border-gray-400 text-gray-300">
                  {user?.email}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back{isAnonymous ? '' : `, ${user?.email?.split('@')[0]}`}!
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
                <Mic className="h-5 w-5" />
                Continue Coaching
              </CardTitle>
              <CardDescription className="text-gray-300">
                Talk to your AI coach and work on your goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/onboarding/voice-guided">
                  <Mic className="mr-2 h-4 w-4" />
                  Start Session
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goal Progress
              </CardTitle>
              <CardDescription className="text-gray-300">
                Track your progress across all goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Completed</span>
                  <span className="text-white">{completedGoals}/{totalGoals}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="text-xs text-gray-400">
                  {progressPercentage.toFixed(0)}% Complete
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-gray-300">
                Your coaching session history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-gray-400 text-gray-300 hover:bg-gray-800">
                <Clock className="mr-2 h-4 w-4" />
                View Sessions
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Goals Overview */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Your Goals</h2>
            <Button asChild variant="outline" className="border-gray-400 text-gray-300 hover:bg-gray-800">
              <Link href="/onboarding/voice-guided">
                <Target className="mr-2 h-4 w-4" />
                Add New Goals
              </Link>
            </Button>
          </div>

          {goalCategories.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Goals Yet</h3>
                <p className="text-gray-300 mb-6">
                  Start by talking to our AI coach to discover and set your personal goals.
                </p>
                <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Link href="/onboarding/voice-guided">
                    <Mic className="mr-2 h-4 w-4" />
                    Discover Your Goals
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {goalCategories.map((category) => (
                <AccordionItem key={category.id} value={category.id} className="border-slate-700">
                  <AccordionTrigger className="bg-slate-800/50 px-6 py-4 rounded-lg hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getCategoryColor(category.title || '')}`}>
                        {getCategoryIcon(category.title || '')}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white">{category.title}</div>
                        <div className="text-sm text-gray-300">
                          {category.goals.length} goal{category.goals.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4">
                    <div className="space-y-3">
                      {category.goals.map((goal) => (
                        <div key={goal.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            {goal.goal_status === 'completed' ? (
                              <CheckCircle className="h-5 w-5 text-green-400" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
                            )}
                            <div>
                              <div className="text-white font-medium">{goal.goal_title}</div>
                              {goal.goal_description && (
                                <div className="text-sm text-gray-300">{goal.goal_description}</div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-gray-300 border-gray-400">
                            {goal.goal_status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

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
                    <ArrowRight className="ml-2 h-4 w-4" />
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