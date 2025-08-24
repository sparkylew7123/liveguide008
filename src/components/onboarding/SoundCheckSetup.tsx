'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MicrophoneIcon, ChevronRightIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { voiceUISync, useVoiceUISync } from '@/lib/voice-ui-sync'
import type { VoiceCommand } from '@/hooks/useMayaVoiceOnboarding'

interface SoundCheckSetupProps {
  onComplete: (preferences: {
    userName: string
    voicePreference: 'male' | 'female' | 'no-preference'
    microphoneWorking: boolean
  }) => void
  voiceController?: {
    isConnected: boolean
    isSpeaking: boolean
    isListening: boolean
    sendMessage: (message: string) => void
    onVoiceCommand: (command: VoiceCommand) => void
  }
}

interface UserPreferences {
  userName: string
  voicePreference: 'male' | 'female' | 'no-preference'
}

export default function SoundCheckSetup({ onComplete, voiceController }: SoundCheckSetupProps) {
  const [userName, setUserName] = useState('')
  const [mayaIntroduced, setMayaIntroduced] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [waitingForVoiceConfirmation, setWaitingForVoiceConfirmation] = useState(false)
  
  const voiceSync = useVoiceUISync()

  // Maya voice integration
  useEffect(() => {
    if (voiceController?.isConnected && !mayaIntroduced) {
      // Maya introduces herself when voice controller is connected
      setTimeout(() => {
        voiceController.sendMessage(`Hi there! I'm Maya, your voice guide. I'm here to help you get started with LiveGuide. Can you hear me clearly? Just say yes if you can hear me.`)
        setMayaIntroduced(true)
        setWaitingForVoiceConfirmation(true)
      }, 1000)
    }
  }, [voiceController?.isConnected, mayaIntroduced])

  // Handle voice commands from Maya
  useEffect(() => {
    if (!voiceController) return

    const handleVoiceCommand = (command: VoiceCommand) => {
      console.log('🎙️ Setup received voice command:', command)
      
      switch (command.intent) {
        case 'confirm_audio':
          if (command.data.confirmed) {
            setWaitingForVoiceConfirmation(false)
            voiceController.sendMessage("Perfect! I can hear you clearly. Now I'd love to get to know you better. What should I call you?")
            // Advance to name collection
            setTimeout(() => {
              setCurrentStep(2)
            }, 2000)
          }
          break
          
        case 'provide_name':
          if (command.data.name) {
            setUserName(command.data.name)
            voiceController.sendMessage(`Nice to meet you, ${command.data.name}! I'm excited to help you discover your goals and find the perfect coach for your journey.`)
            // Visual feedback
            voiceSync.animateSelection('name-input', true)
            setTimeout(() => voiceSync.animateSelection('name-input', false), 2000)
          }
          break
      }
    }

    voiceController.onVoiceCommand = handleVoiceCommand
  }, [voiceController, voiceSync])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceSync.cleanup()
    }
  }, [voiceSync])

  const handleContinue = () => {
    onComplete({
      userName: userName.trim() || 'there',
      voicePreference: 'no-preference',
      microphoneWorking: true // Assume working if Maya is connected
    })
  }

  const nextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2)
      if (voiceController?.isConnected) {
        voiceController.sendMessage("Now I'd love to get to know you better. What should I call you?")
      }
    } else {
      handleContinue()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="text-center space-y-8"
          >
            <div>
              <h2 className="text-4xl font-bold text-white mb-4">Welcome to LiveGuide!</h2>
              <p className="text-xl text-gray-300">Let's get you connected with Maya, your voice guide</p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              {voiceController?.isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <SpeakerWaveIcon className="w-6 h-6 animate-pulse" />
                    <span className="text-lg">Maya is connected</span>
                  </div>
                  
                  {waitingForVoiceConfirmation && (
                    <div className="text-blue-400 animate-pulse">
                      🔊 Say "yes" if you can hear Maya clearly
                    </div>
                  )}
                  
                  {voiceController?.isSpeaking && (
                    <div className="text-blue-400 text-sm animate-pulse">
                      Maya is speaking...
                    </div>
                  )}
                  
                  {voiceController?.isListening && (
                    <div className="text-green-400 text-sm animate-pulse">
                      Maya is listening...
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-yellow-400">
                  <div className="flex items-center justify-center gap-2">
                    <MicrophoneIcon className="w-6 h-6" />
                    <span>Connecting to Maya...</span>
                  </div>
                </div>
              )}
            </div>
            
            <Button
              onClick={nextStep}
              disabled={!voiceController?.isConnected && !waitingForVoiceConfirmation}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
            >
              Continue <ChevronRightIcon className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        )
        
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="text-center space-y-8"
          >
            <div>
              <h2 className="text-4xl font-bold text-white mb-4">What should I call you?</h2>
              <p className="text-xl text-gray-300">Enter your name or say it out loud</p>
            </div>
            
            <div className="max-w-md mx-auto space-y-4">
              <Input
                id="name-input"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="h-16 text-center text-lg bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              />
              
              <div className="text-gray-400">or</div>
              
              {voiceController?.isConnected && (
                <div className="text-center space-y-2">
                  {voiceController?.isListening && (
                    <div className="text-green-400 text-sm animate-pulse">
                      <div className="space-y-1">
                        <div>🎤 Maya is listening for your name...</div>
                        <div className="text-xs opacity-75">
                          Say "My name is..." or just your first name
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {voiceController?.isSpeaking && (
                <div className="text-blue-400 text-sm animate-pulse">
                  <div className="flex items-center justify-center gap-2">
                    <SpeakerWaveIcon className="w-4 h-4" />
                    <span>Maya is speaking...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button
                onClick={prevStep}
                variant="outline"
                size="lg"
                className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600"
              >
                Back
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!userName.trim()}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
              >
                Start Goal Discovery <ChevronRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )
        
      default:
        return null
    }
  }

  const totalSteps = 2 // Name setup and confirmation

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-400">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-gray-400">
              Before We Begin
            </span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Main Content */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg pt-1.5 pb-6 px-6 min-h-[400px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}