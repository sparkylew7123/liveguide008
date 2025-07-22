'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import { 
  Mic, 
  Brain, 
  Users, 
  Zap, 
  Star, 
  ArrowRight,
  CheckCircle,
  PlayCircle,
  Shield,
  Clock,
  RotateCcw,
  Target,
  Play,
  Phone,
  MessageSquare
} from 'lucide-react'

export default function LandingPage() {
  const videoRef = useRef<HTMLDivElement>(null)
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)

  useEffect(() => {
    // Initialize video event listeners
    const videoElement = videoElementRef.current
    if (videoElement) {
      const handleVideoEnd = () => {
        setHasEnded(true)
        setIsPaused(false)
        setShowOverlay(true)
      }

      const handleVideoPlay = () => {
        setShowOverlay(false)
        setIsPaused(false)
        setHasEnded(false)
      }

      const handleVideoPause = () => {
        // Only show overlay if video wasn't ended (to avoid double overlay)
        if (!videoElement.ended) {
          setIsPaused(true)
          setShowOverlay(true)
        }
      }

      const handleVideoSeeked = () => {
        // If user seeks while paused, keep overlay visible
        if (videoElement.paused && !videoElement.ended) {
          setIsPaused(true)
          setShowOverlay(true)
        }
      }

      videoElement.addEventListener('ended', handleVideoEnd)
      videoElement.addEventListener('play', handleVideoPlay)
      videoElement.addEventListener('pause', handleVideoPause)
      videoElement.addEventListener('seeked', handleVideoSeeked)

      return () => {
        videoElement.removeEventListener('ended', handleVideoEnd)
        videoElement.removeEventListener('play', handleVideoPlay)
        videoElement.removeEventListener('pause', handleVideoPause)
        videoElement.removeEventListener('seeked', handleVideoSeeked)
      }
    }
  }, [])

  const handlePlayAction = () => {
    const videoElement = videoElementRef.current
    if (videoElement) {
      if (isPaused && !hasEnded) {
        // Resume from current position
        videoElement.play()
      } else {
        // Restart from beginning
        videoElement.currentTime = 0
        videoElement.play()
      }
      setShowOverlay(false)
    }
  }

  const handleVoiceOnboarding = () => {
    window.location.href = '/onboarding/voice-guided'
  }

  const handleTalkToAgent = () => {
    window.location.href = '/onboarding/voice-guided'
  }

  const handleVoiceDemo = () => {
    window.location.href = '/demo/voice'
  }

  // Determine button text and icon based on video state
  const getPlayButtonProps = () => {
    if (isPaused && !hasEnded) {
      return {
        text: 'Resume',
        icon: <Play className="mr-2 h-5 w-5" />
      }
    } else {
      return {
        text: 'Watch Again',
        icon: <RotateCcw className="mr-2 h-5 w-5" />
      }
    }
  }

  // Updated features for streamlined ElevenLabs-focused platform
  const features = [
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Voice-First AI Coaching",
      description: "Speak naturally with specialized AI coaches powered by ElevenLabs for personalized life guidance"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "12 Expert AI Coaches",
      description: "Choose from career, wellness, mindfulness, and emotional well-being specialists with unique personalities"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Secure Broker Architecture",
      description: "Direct, secure connections to ElevenLabs agents with enterprise-grade privacy protection"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Goal-Focused Sessions",
      description: "Every conversation is tailored to help you achieve your specific personal and professional goals"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy First",
      description: "Your voice conversations are protected with end-to-end encryption and secure data handling"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Always Available",
      description: "Get coaching support 24/7 with instant voice responses from your personalized AI coach"
    }
  ]

  // Updated testimonials to reflect streamlined voice-first approach
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Product Manager",
      content: "The voice coaching feels incredibly natural. Having a dedicated AI coach for my career goals has been transformative.",
      rating: 5
    },
    {
      name: "Marcus Johnson",
      role: "Entrepreneur",
      content: "Finally, a platform that understands the power of voice. My mindfulness coach Elias has helped me find balance.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Designer",
      content: "The voice quality from ElevenLabs is amazing. It's like talking to a real person who truly cares about my progress.",
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Spacer for fixed navbar */}
      <div className="h-16" />
      

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col justify-center order-1 lg:order-1"
            >
              <Badge className="mb-6 w-fit bg-blue-600/20 text-blue-300 border-blue-500/30">
                Voice-First AI Life Coaching
              </Badge>
              
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Your Personal
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {" "}Voice Coach
                </span>
              </h1>
            </motion.div>

            {/* Video Section - Appears after title on mobile, side-by-side on desktop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative order-2 lg:order-2 mt-8 lg:mt-0"
            >
              <div className="relative overflow-hidden rounded-2xl bg-gray-900 shadow-2xl max-w-md mx-auto lg:max-w-none">
                <div 
                  ref={videoRef}
                  className="aspect-square w-full relative"
                >
                  <video 
                    ref={videoElementRef}
                    id="liveguide-player"
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                    webkit-playsinline="true"
                    poster="https://res.cloudinary.com/dlq71ih0t/image/upload/v1749989050/LiveGuide-Cover_ey0bol.jpg"
                  >
                    <source 
                      src="https://res.cloudinary.com/dlq71ih0t/video/upload/v1/LiveGuide_hkm79c.mp4" 
                      type="video/mp4" 
                    />
                    Your browser does not support the video tag.
                  </video>

                  {/* Video Overlay Buttons */}
                  {showOverlay && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-2xl"
                    >
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                      >
                        <Button
                          onClick={handlePlayAction}
                          size="lg"
                          variant="outline"
                          className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-8 py-4 text-lg"
                        >
                          {getPlayButtonProps().icon}
                          {getPlayButtonProps().text}
                        </Button>
                      </motion.div>
                      
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                      >
                        <Button
                          onClick={handleTalkToAgent}
                          size="lg"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-4 text-lg"
                        >
                          <Mic className="mr-2 h-5 w-5" />
                          Talk to Agent
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-purple-500/20 blur-xl"></div>
                <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-blue-500/20 blur-xl"></div>
              </div>
            </motion.div>

            {/* Rest of Hero Content - Appears after video on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="order-3 lg:col-span-2 mt-8 lg:mt-6"
            >              
              <p className="text-lg leading-8 text-gray-300 sm:text-xl lg:max-w-3xl">
                Experience the future of personal development with AI coaches powered by ElevenLabs. 
                Choose from 12 specialized coaches for career, wellness, mindfulness, and emotional growth. 
                Start speaking, start growing.
              </p>
              
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-4 text-lg"
                  onClick={handleTalkToAgent}
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Talk to Agent
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-gray-400 text-gray-300 hover:bg-gray-800 px-8 py-4 text-lg"
                  onClick={handleVoiceDemo}
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Try Voice Demo
                </Button>
              </div>
              
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Free voice demo
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Secure & private
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Why Choose LiveGuide?
            </h2>
            <p className="mt-4 text-lg text-gray-300 max-w-3xl mx-auto">
              Our streamlined platform combines ElevenLabs&apos; cutting-edge voice AI with proven coaching methodologies 
              to deliver personalized guidance that sounds and feels completely natural.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Trusted by Voice-First Learners
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              See what our users are saying about their natural voice coaching experience
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-300 mb-6">&ldquo;{testimonial.content}&rdquo;</p>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-sm text-gray-400">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl mb-6">
              Ready to Start Voice Coaching?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Join others who have discovered the power of voice-first AI coaching. 
              Choose your specialized coach and start your journey today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-400"
              />
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                onClick={handleTalkToAgent}
              >
                <Mic className="mr-2 h-4 w-4" />
                Start Coaching
              </Button>
            </div>
            
            <p className="text-sm text-gray-400 mt-4">
              Start your free voice demo today. No commitment required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <h3 className="text-xl font-bold text-white mb-4">LiveGuide</h3>
              <p className="text-gray-400 max-w-md">
                Empowering personal growth through voice-first AI coaching powered by ElevenLabs technology.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Voice Coaches</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/demo/voice" className="hover:text-white transition-colors">Voice Demo</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-gray-400">
            <p>&copy; 2024 LiveGuide. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}