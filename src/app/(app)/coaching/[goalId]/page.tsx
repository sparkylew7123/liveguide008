'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { graphGoalService, GraphGoal } from '@/lib/graph-goals'
import { SimpleVoiceOnboarding } from '@/components/SimpleVoiceOnboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft,
  Target,
  Calendar,
  Clock,
  Trophy,
  Activity,
  Mic,
  MessageSquare,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

interface CoachingSessionPageProps {
  params: {
    goalId: string
  }
}

export default function CoachingSessionPage() {
  const params = useParams()
  const router = useRouter()
  const goalId = params.goalId as string
  const { effectiveUserId, isLoading: userLoading } = useUser()
  
  const [goal, setGoal] = useState<GraphGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [agentDetails, setAgentDetails] = useState<any>(null)
  const [showVoiceSession, setShowVoiceSession] = useState(false)
  const [recentAccomplishments, setRecentAccomplishments] = useState<any[]>([])

  useEffect(() => {
    if (!effectiveUserId || !goalId) return

    const loadGoalData = async () => {
      try {
        // Load goal details
        const goals = await graphGoalService.getUserGoalsWithProgress(effectiveUserId)
        const currentGoal = goals.find(g => g.goal_id === goalId)
        
        if (currentGoal) {
          setGoal(currentGoal)
          
          // Load recent accomplishments for this goal
          const accomplishments = await graphGoalService.getGoalAccomplishments(effectiveUserId, goalId)
          setRecentAccomplishments(accomplishments.slice(0, 3))
        } else {
          console.error('Goal not found')
          router.push('/lobby')
        }

        // Load Maya agent details (hardcoded for now, can be made dynamic later)
        const supabase = createClient()
        const { data: mayaAgent } = await supabase
          .from('agent_personae')
          .select('*')
          .eq('Name', 'Maya')
          .single()
        
        if (mayaAgent) {
          setAgentDetails(mayaAgent)
          setSelectedAgentId(mayaAgent['11labs_agentID'])
        }
      } catch (error) {
        console.error('Error loading goal data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGoalData()
  }, [effectiveUserId, goalId, router])

  const handleStartSession = () => {
    setShowVoiceSession(true)
  }

  const handleEndSession = () => {
    setShowVoiceSession(false)
    // Optionally refresh data after session
    router.refresh()
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading coaching session...</div>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Goal not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              variant="ghost"
              onClick={() => router.push('/lobby')}
              className="flex items-center gap-2 text-gray-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lobby
            </Button>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                Coaching Session
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showVoiceSession ? (
          <>
            {/* Goal Overview */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {goal.goal_title}
                  </h1>
                  <div className="flex items-center gap-4 text-gray-300">
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {goal.category}
                    </span>
                    {goal.target_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Target: {new Date(goal.target_date).toLocaleDateString()}
                      </span>
                    )}
                    <Badge 
                      variant="outline" 
                      className={
                        goal.priority === 'high' 
                          ? 'text-red-400 border-red-400' 
                          : goal.priority === 'medium'
                          ? 'text-amber-400 border-amber-400'
                          : 'text-gray-400 border-gray-400'
                      }
                    >
                      {goal.priority} priority
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Sessions</p>
                        <p className="text-2xl font-bold text-white">{goal.session_count}</p>
                      </div>
                      <MessageSquare className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Time Invested</p>
                        <p className="text-2xl font-bold text-white">
                          {Math.floor(goal.total_duration_minutes / 60)}h {goal.total_duration_minutes % 60}m
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Accomplishments</p>
                        <p className="text-2xl font-bold text-white">{goal.accomplishment_count}</p>
                      </div>
                      <Trophy className="w-8 h-8 text-amber-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Last Session</p>
                        <p className="text-sm font-medium text-white">
                          {goal.latest_session_date
                            ? new Date(goal.latest_session_date).toLocaleDateString()
                            : 'No sessions yet'}
                        </p>
                      </div>
                      <Activity className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Start Session CTA */}
              <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 mb-8">
                <CardContent className="py-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-3">
                      Ready for Your Coaching Session?
                    </h2>
                    <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                      Work with Maya, your AI coach, to make progress on "{goal.goal_title}". 
                      She'll help you identify next steps, overcome obstacles, and celebrate your wins.
                    </p>
                    <Button 
                      onClick={handleStartSession}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Mic className="mr-2 h-5 w-5" />
                      Start Voice Session with Maya
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Accomplishments */}
              {recentAccomplishments.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Recent Accomplishments</h3>
                  <div className="space-y-3">
                    {recentAccomplishments.map((accomplishment) => (
                      <Card key={accomplishment.id} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="py-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-white">{accomplishment.label}</h4>
                              {accomplishment.description && (
                                <p className="text-sm text-gray-300 mt-1">{accomplishment.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(accomplishment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={handleEndSession}
                className="text-gray-300 hover:text-white mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                End Session
              </Button>
              <h2 className="text-2xl font-bold text-white mb-2">
                Coaching Session: {goal.goal_title}
              </h2>
              <p className="text-gray-300">
                You're now connected with Maya, your AI coach
              </p>
            </div>
            
            <SimpleVoiceOnboarding 
              agentId={selectedAgentId}
              agentDetails={agentDetails}
              loading={!agentDetails}
              userName={effectiveUserId}
              goalContext={{
                goalId: goal.goal_id,
                goalTitle: goal.goal_title,
                category: goal.category,
                sessionCount: goal.session_count,
                accomplishmentCount: goal.accomplishment_count
              }}
            />
          </div>
        )}
      </main>
    </div>
  )
}