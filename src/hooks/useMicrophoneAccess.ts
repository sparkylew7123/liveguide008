'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface MicrophoneState {
  isListening: boolean
  isSpeaking: boolean
  audioLevel: number
  error: string | null
  isSupported: boolean
  transcript: string
  isRecognizing: boolean
}

export function useMicrophoneAccess() {
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>({
    isListening: false,
    isSpeaking: false,
    audioLevel: 0,
    error: null,
    isSupported: typeof window !== 'undefined' && !!navigator.mediaDevices,
    transcript: '',
    isRecognizing: false
  })

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef<boolean>(false)

  const startListening = useCallback(async () => {
    try {
      console.log('startListening called, current state:', microphoneState.isListening)
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser')
      }

      // Stop any existing recognition first
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          // Ignore errors
        }
        recognitionRef.current = null
      }

      // Only proceed if we're not already listening
      if (microphoneState.isListening) {
        console.log('Already listening, returning early')
        return
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      mediaStreamRef.current = stream

      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Resume audio context if suspended (required for Chrome)
      if (audioContext.state === 'suspended') {
        console.log('🔊 Audio context was suspended, resuming...')
        await audioContext.resume()
      }
      
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256  // Smaller for better performance
      analyser.smoothingTimeConstant = 0.8  // More smoothing for stability
      microphone.connect(analyser)
      
      console.log('🎤 Audio context initialized:', audioContext.state)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Initialize Web Speech API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        const recognition = new SpeechRecognition()
        
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.maxAlternatives = 1
        
        // Increase timeout to reduce no-speech errors
        if ('speechRecognitionTimeout' in recognition) {
          (recognition as any).speechRecognitionTimeout = 10000 // 10 seconds
        }
        
        recognition.onstart = () => {
          console.log('🎤 Speech recognition started')
          setMicrophoneState(prev => ({ ...prev, isRecognizing: true }))
        }
        
        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          let interimTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
            } else {
              interimTranscript += transcript
            }
          }
          
          const fullTranscript = finalTranscript || interimTranscript
          console.log('🗣️ User said:', fullTranscript)
          
          setMicrophoneState(prev => ({
            ...prev,
            transcript: fullTranscript.trim()
          }))
        }
        
        recognition.onerror = (event: any) => {
          // Handle different error types
          if (event.error === 'aborted') {
            // Aborted is normal when we stop recognition manually
            setMicrophoneState(prev => ({
              ...prev,
              isRecognizing: false
            }))
          } else if (event.error === 'no-speech') {
            // No speech detected is not really an error, just restart if still listening
            console.log('🔇 No speech detected, waiting...')
            if (isListeningRef.current) {
              // Automatically restart recognition to continue listening
              setTimeout(() => {
                if (isListeningRef.current && recognitionRef.current) {
                  try {
                    recognitionRef.current.start()
                  } catch (e) {
                    // Ignore if already started
                  }
                }
              }, 100)
            }
          } else if (event.error === 'audio-capture') {
            console.error('🎤 Microphone access error')
            setMicrophoneState(prev => ({
              ...prev,
              error: 'Microphone access denied or unavailable',
              isRecognizing: false,
              hasPermission: false
            }))
          } else if (event.error === 'not-allowed') {
            console.error('🚫 Microphone permission denied')
            setMicrophoneState(prev => ({
              ...prev,
              error: 'Microphone permission denied',
              isRecognizing: false,
              hasPermission: false
            }))
          } else {
            // Log other errors
            console.error('❌ Speech recognition error:', event.error)
            setMicrophoneState(prev => ({
              ...prev,
              error: `Speech recognition error: ${event.error}`,
              isRecognizing: false
            }))
          }
        }
        
        recognition.onend = () => {
          console.log('🎤 Speech recognition ended')
          setMicrophoneState(prev => ({ ...prev, isRecognizing: false }))
        }
        
        recognitionRef.current = recognition
        
        // Add a small delay to prevent conflicts
        setTimeout(() => {
          if (recognitionRef.current === recognition) {
            try {
              recognition.start()
            } catch (error) {
              console.warn('Speech recognition start error:', error)
              // Clear the reference if start fails
              recognitionRef.current = null
            }
          }
        }, 100)
      }

      setMicrophoneState(prev => ({
        ...prev,
        isListening: true,
        error: null
      }))
      
      isListeningRef.current = true

      // Start audio level monitoring with throttling
      let lastUpdate = 0
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return
        
        const now = Date.now()
        // Throttle updates to every 100ms to prevent performance issues
        if (now - lastUpdate < 100) {
          if (animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
          }
          return
        }
        lastUpdate = now

        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate average volume (optimized - sample fewer points)
        let sum = 0
        const step = Math.max(1, Math.floor(bufferLength / 32)) // Sample every nth element
        for (let i = 0; i < bufferLength; i += step) {
          sum += dataArray[i]
        }
        const average = sum / (bufferLength / step)
        const normalizedLevel = Math.min(1, average / 255)

        // Determine if user is speaking (threshold-based)
        const speakingThreshold = 0.1
        const isSpeaking = normalizedLevel > speakingThreshold

        setMicrophoneState(prev => {
          // Only continue monitoring if we're still listening
          if (prev.isListening) {
            animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
          }
          
          return {
            ...prev,
            audioLevel: normalizedLevel,
            isSpeaking
          }
        })
      }

      monitorAudioLevel()

    } catch (error) {
      console.error('Error accessing microphone:', error)
      setMicrophoneState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to access microphone',
        isListening: false
      }))
    }
  }, [])

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // Stop speech recognition safely
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        // Ignore errors when stopping (already stopped, etc.)
      }
      recognitionRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null

    setMicrophoneState(prev => ({
      ...prev,
      isListening: false,
      isSpeaking: false,
      audioLevel: 0,
      transcript: '',
      isRecognizing: false
    }))
  }, [])

  const toggleListening = useCallback(() => {
    if (microphoneState.isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [microphoneState.isListening, startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  return {
    microphoneState,
    startListening,
    stopListening,
    toggleListening
  }
}