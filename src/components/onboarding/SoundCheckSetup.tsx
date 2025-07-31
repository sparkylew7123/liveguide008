'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMicrophoneAccess } from '@/hooks/useMicrophoneAccess'
import { WaveformAnimation } from '@/components/ui/waveform-animation'
import { MicrophoneIcon, Cog6ToothIcon, ChevronRightIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'

interface SoundCheckSetupProps {
  onComplete: (preferences: {
    userName: string
    voicePreference: 'male' | 'female' | 'no-preference'
    microphoneWorking: boolean
  }) => void
}

interface UserPreferences {
  userName: string
  voicePreference: 'male' | 'female' | 'no-preference'
}

export default function SoundCheckSetup({ onComplete }: SoundCheckSetupProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [userName, setUserName] = useState('')
  const [microphoneWorking, setMicrophoneWorking] = useState(false)
  const [listening, setListening] = useState(false)
  const [hasDetectedSound, setHasDetectedSound] = useState(false)
  const totalSteps = 1

  const {
    microphoneState,
    startListening,
    stopListening
  } = useMicrophoneAccess()

  // Auto-start microphone on load
  useEffect(() => {
    console.log('🎤 Auto-starting microphone for sound check')
    startListening()
    return () => {
      console.log('🎤 Cleaning up microphone on unmount')
      stopListening()
    }
  }, [])

  // Monitor microphone levels and auto-advance
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (microphoneState.audioLevel > 0.01) {
        setMicrophoneWorking(true)
        
        // If on step 1 and we haven't detected sound yet
        if (currentStep === 1 && !hasDetectedSound && microphoneState.audioLevel > 0.05) {
          setHasDetectedSound(true)
          
          // Auto advance after 1.5 seconds of detecting good volume
          setTimeout(() => {
            // Skip voice preference and go to name input
            setCurrentStep(2)
            setListening(true)
            startListening()
          }, 1500)
        }
      }
    }, 100) // Debounce updates
    
    return () => clearTimeout(timeoutId)
  }, [microphoneState.audioLevel, currentStep, hasDetectedSound])

  // Handle voice input
  useEffect(() => {
    if (!listening || !microphoneState.transcript) return
    
    const transcript = microphoneState.transcript.toLowerCase().trim()
    console.log('🎤 Processing transcript:', transcript)
    
    // Only process name extraction on step 2 (name input)
    if (currentStep === 2 && transcript.length > 1) {
      let extractedName = ''
      
      // Try various name extraction patterns
      if (transcript.includes('my name is ')) {
        extractedName = transcript.split('my name is ')[1]
      } else if (transcript.includes('call me ')) {
        extractedName = transcript.split('call me ')[1]
      } else if (transcript.includes("i'm ")) {
        extractedName = transcript.split("i'm ")[1]
      } else if (transcript.includes('name is ')) {
        extractedName = transcript.split('name is ')[1]
      } else if (transcript.includes('this is ')) {
        extractedName = transcript.split('this is ')[1]
      } else {
        // If no pattern matches, assume the whole transcript is the name
        extractedName = transcript
      }
      
      // Clean up the extracted name
      extractedName = extractedName
        .replace(/[^a-zA-Z\s]/g, '') // Remove non-letter characters except spaces
        .trim()
        .split(' ')
        .filter(word => word.length > 0) // Remove empty strings
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
        .join(' ')
      
      if (extractedName && extractedName.length > 1) {
        console.log('✅ Extracted name:', extractedName)
        setUserName(extractedName)
        setListening(false)
        stopListening()
      }
    }
  }, [microphoneState.transcript, listening, currentStep])

  const handleContinue = () => {
    onComplete({
      userName: userName.trim() || 'there',
      voicePreference: 'no-preference', // Default to no preference
      microphoneWorking
    })
  }

  const getMicStatus = () => {
    if (!microphoneState.isListening) return { color: 'text-red-400', text: '🎤 Not active' }
    if (microphoneState.audioLevel < 0.005) return { color: 'text-yellow-400', text: '🔇 Speak louder' }
    if (microphoneState.audioLevel > 0.6) return { color: 'text-yellow-400', text: '📢 Too loud' }
    if (microphoneState.audioLevel > 0.01) return { color: 'text-green-400', text: '✓ Perfect! Microphone working' }
    return { color: 'text-gray-400', text: '🎤 Listening...' }
  }

  const status = getMicStatus()

  const nextStep = () => {
    if (currentStep === 1) {
      // Go to name input step
      setCurrentStep(2)
      
      // Auto-start listening for name input
      if (microphoneState.isListening) {
        stopListening()
      }
      
      setTimeout(() => {
        console.log('🎤 Auto-starting microphone for name input')
        setListening(true)
        startListening()
      }, 800) // Longer delay to prevent conflicts
    } else {
      handleContinue()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderMicrophoneMeter = () => {
    return (
      <div className="flex flex-col items-center gap-4">
        {/* Large responsive waveform */}
        <div className="h-20 flex items-center justify-center bg-slate-700/30 rounded-lg px-8 py-4 min-w-[300px]">
          <WaveformAnimation 
            isActive={microphoneState.isListening && microphoneState.audioLevel > 0.01}
            type="user"
            size="lg"
            audioLevel={microphoneState.audioLevel}
            className="scale-150"
          />
        </div>
        
        {/* Audio level indicator */}
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">Audio Level</div>
          <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full origin-left"
              animate={{ 
                scaleX: microphoneState.audioLevel * 2,  // Amplify for visibility
                opacity: microphoneState.isListening ? 1 : 0.3
              }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {(microphoneState.audioLevel * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    )
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
              <h2 className="text-4xl font-bold text-white mb-4">Let's test your microphone</h2>
              <p className="text-xl text-gray-300">Say something to see the meter respond</p>
            </div>
            
            {renderMicrophoneMeter()}
            
            <div className={`text-lg font-medium ${status.color}`}>
              {status.text}
            </div>
            
            {hasDetectedSound && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-green-400 text-lg font-medium"
              >
                Great! Moving to the next step...
              </motion.div>
            )}
            
            {!microphoneWorking && (
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    console.log('🎤 Manually restarting microphone')
                    stopListening()
                    setTimeout(() => startListening(), 500)
                  }}
                  variant="outline"
                  className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600 mr-2"
                >
                  <MicrophoneIcon  className="mr-2 h-4 w-4" />
                  Retry Microphone
                </Button>
                <Button
                  onClick={() => window.open('chrome://settings/content/microphone')}
                  variant="outline"
                  className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600"
                >
                  <Cog6ToothIcon  className="mr-2 h-4 w-4" />
                  Fix Settings
                </Button>
              </div>
            )}
            
            {!hasDetectedSound && (
              <Button
                onClick={nextStep}
                disabled={!microphoneWorking}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
              >
                Continue <ChevronRightIcon  className="ml-2 h-5 w-5" />
              </Button>
            )}
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
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="h-16 text-center text-lg bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              />
              
              <div className="text-gray-400">or</div>
              
              <Button
                onClick={() => {
                  if (listening) {
                    setListening(false)
                    stopListening()
                  } else {
                    // Ensure clean start
                    stopListening()
                    setTimeout(() => {
                      setListening(true)
                      startListening()
                    }, 200)
                  }
                }}
                variant={listening ? "default" : "outline"}
                className={`h-16 w-full ${
                  listening 
                    ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white animate-pulse'
                    : 'bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600'
                }`}
              >
                <MicrophoneIcon  className="mr-2 h-5 w-5" />
                {listening ? 'Listening... (Click to stop)' : 'Click to Listen for Name'}
              </Button>
              
              {microphoneState.transcript && (
                <div className="text-blue-300 bg-slate-700/30 rounded-lg p-4">
                  <div className="text-sm text-blue-400 mb-2">You said:</div>
                  <div className="text-3xl font-semibold">"{microphoneState.transcript}"</div>
                </div>
              )}
              
              {listening && (
                <div className="text-green-400 text-sm animate-pulse">
                  🎤 Say your name... (e.g., "My name is John" or just "Sarah")
                </div>
              )}
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  setListening(false)
                  stopListening()
                  prevStep()
                }}
                variant="outline"
                size="lg"
                className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  setListening(false)
                  stopListening()
                  handleContinue()
                }}
                disabled={!userName.trim()}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
              >
                Start Goal Discovery <ChevronRightIcon  className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar - Hidden when only 1 step */}
        {totalSteps > 1 && (
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
        )}
        
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