'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface WaveformAnimationProps {
  isActive: boolean
  type: 'user' | 'agent'
  className?: string
  size?: 'sm' | 'md' | 'lg'
  intensity?: 'low' | 'medium' | 'high'
  audioLevel?: number
}

export function WaveformAnimation({ 
  isActive, 
  type, 
  className, 
  size = 'md', 
  intensity = 'medium',
  audioLevel = 0
}: WaveformAnimationProps) {
  const [waves, setWaves] = useState<number[]>([])

  // Generate wave heights based on audio level or random for agents
  useEffect(() => {
    if (!isActive) {
      setWaves([])
      return
    }

    const generateWaves = () => {
      const waveCount = size === 'sm' ? 8 : size === 'md' ? 12 : 16
      
      if (type === 'user' && audioLevel > 0) {
        // Use real audio level for user waveform (simplified for performance)
        const amplifiedLevel = Math.max(0.05, audioLevel * 3)
        const newWaves = Array.from({ length: waveCount }, (_, i) => {
          // Simplified calculation for better performance
          const variation = (Math.random() - 0.5) * 0.3
          const height = amplifiedLevel + variation
          return Math.max(0.05, Math.min(1, height))
        })
        setWaves(newWaves)
      } else {
        // Use random heights for agent or when no audio level
        const baseHeight = intensity === 'low' ? 0.3 : intensity === 'medium' ? 0.5 : 0.7
        const newWaves = Array.from({ length: waveCount }, () => {
          const randomHeight = Math.random() * baseHeight + 0.1
          return Math.max(0.1, Math.min(1, randomHeight))
        })
        setWaves(newWaves)
      }
    }

    generateWaves()
    const interval = setInterval(generateWaves, type === 'user' ? 200 : 300) // Slower updates to prevent performance issues
    
    return () => clearInterval(interval)
  }, [isActive, size, intensity, type, audioLevel])

  const sizeClasses = {
    sm: 'h-8 gap-0.5',
    md: 'h-12 gap-1',
    lg: 'h-16 gap-1.5'
  }

  const barWidth = {
    sm: 'w-1',
    md: 'w-1.5',
    lg: 'w-2'
  }

  const colors = {
    user: 'bg-blue-500',
    agent: 'bg-purple-500'
  }

  const glowColors = {
    user: 'shadow-blue-500/30',
    agent: 'shadow-purple-500/30'
  }

  return (
    <div className={cn(
      'flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      <AnimatePresence>
        {isActive && waves.map((height, index) => (
          <motion.div
            key={index}
            className={cn(
              'rounded-full',
              barWidth[size],
              colors[type],
              `shadow-lg ${glowColors[type]}`
            )}
            initial={{ height: 4 }}
            animate={{ 
              height: `${height * 100}%`,
              opacity: 0.8 + (height * 0.2)
            }}
            exit={{ height: 4 }}
            transition={{
              duration: 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </AnimatePresence>
      
      {/* Static bars when inactive */}
      {!isActive && (
        <div className={cn('flex items-center justify-center', sizeClasses[size])}>
          {Array.from({ length: size === 'sm' ? 8 : size === 'md' ? 12 : 16 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'rounded-full h-1 opacity-20',
                barWidth[size],
                colors[type]
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ConversationWaveformsProps {
  userSpeaking: boolean
  agentSpeaking: boolean
  isListening?: boolean
  audioLevel?: number
  className?: string
}

export function ConversationWaveforms({ 
  userSpeaking, 
  agentSpeaking, 
  isListening = false,
  audioLevel = 0,
  className 
}: ConversationWaveformsProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Agent Waveform - Top */}
      <div className="flex items-center justify-center">
        <WaveformAnimation 
          isActive={agentSpeaking} 
          type="agent" 
          size="md"
          intensity="medium"
        />
      </div>
      
      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
      
      {/* User Waveform - Bottom */}
      <div className="flex items-center justify-center">
        <WaveformAnimation 
          isActive={userSpeaking || (isListening && audioLevel > 0)} 
          type="user" 
          size="md"
          intensity={isListening && !userSpeaking ? "low" : "medium"}
          audioLevel={audioLevel}
        />
      </div>
    </div>
  )
}

interface WaveformGlowProps {
  userSpeaking: boolean
  agentSpeaking: boolean
  isListening?: boolean
  audioLevel?: number
  className?: string
}

export function WaveformGlow({ 
  userSpeaking, 
  agentSpeaking, 
  isListening = false,
  audioLevel = 0,
  className 
}: WaveformGlowProps) {
  const isUserActive = userSpeaking || (isListening && audioLevel > 0)
  const isAgentActive = agentSpeaking
  
  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      <AnimatePresence>
        {/* Agent Speaking Glow - Purple */}
        {isAgentActive && (
          <motion.div
            key="agent-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 via-purple-400/30 to-purple-500/20 blur-xl"
          />
        )}
        
        {/* User Speaking Glow - Blue */}
        {isUserActive && (
          <motion.div
            key="user-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/20 via-blue-400/30 to-blue-500/20 blur-xl"
          />
        )}
        
        {/* Listening State - Green */}
        {isListening && !userSpeaking && (
          <motion.div
            key="listening-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-500/15 via-green-400/25 to-green-500/15 blur-lg"
          />
        )}
      </AnimatePresence>
    </div>
  )
}

interface VoiceIndicatorProps {
  isActive: boolean
  type: 'user' | 'agent'
  label?: string
  className?: string
}

export function VoiceIndicator({ 
  isActive, 
  type, 
  label, 
  className 
}: VoiceIndicatorProps) {
  const colors = {
    user: 'border-blue-500 bg-blue-500/10',
    agent: 'border-purple-500 bg-purple-500/10'
  }

  const activeColors = {
    user: 'border-blue-400 bg-blue-400/20 shadow-blue-400/30',
    agent: 'border-purple-400 bg-purple-400/20 shadow-purple-400/30'
  }

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2 rounded-lg border-2 transition-all duration-200',
      isActive ? activeColors[type] + ' shadow-lg' : colors[type],
      className
    )}>
      {label && (
        <span className={cn(
          'text-sm font-medium',
          type === 'user' ? 'text-blue-400' : 'text-purple-400'
        )}>
          {label}
        </span>
      )}
      <WaveformAnimation 
        isActive={isActive} 
        type={type} 
        size="sm"
        intensity="medium"
      />
    </div>
  )
}