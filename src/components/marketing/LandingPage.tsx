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
import type { LandingContent } from '@/lib/content'

interface LandingPageProps {
  content: LandingContent
}

export default function LandingPage({ content }: LandingPageProps) {
  const videoRef = useRef<HTMLDivElement>(null)
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [isPaused, setIsPaused] = useState(true)
  const [hasEnded, setHasEnded] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [showButtonPulse, setShowButtonPulse] = useState(false)

  useEffect(() => {
    // Parallax scroll effect
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    // Start button pulse animation after 8 seconds
    const timer = setTimeout(() => {
      setShowButtonPulse(true)
    }, 8000)
    
    return () => clearTimeout(timer)
  }, [])

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
  const featureIcons = {
    "Voice-First AI Coaching": <Mic className="h-6 w-6" />,
    "12 Expert AI Coaches": <Users className="h-6 w-6" />,
    "Secure Broker Architecture": <Zap className="h-6 w-6" />,
    "Goal-Focused Sessions": <Target className="h-6 w-6" />,
    "Privacy First": <Shield className="h-6 w-6" />,
    "Always Available": <Clock className="h-6 w-6" />
  }
  
  const features = content.whyChoose.features.map(feature => ({
    icon: featureIcons[feature.title as keyof typeof featureIcons] || <Brain className="h-6 w-6" />,
    title: feature.title,
    description: feature.description
  }))

  // Updated testimonials to reflect streamlined voice-first approach
  const testimonials = content.testimonials.items

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Spacer for fixed navbar */}
      <div className="h-16" />
      

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-2 pb-7 sm:pt-4 sm:pb-11">
        {/* Hero Backdrop Image */}
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            y: scrollY * 0.3 
          }}
          transition={{ 
            scale: { duration: 1.5, ease: "easeOut" },
            opacity: { duration: 1 }
          }}
        >
          <Image
            src="https://res.cloudinary.com/dlq71ih0t/image/upload/v1753786361/Screenshot_2025-07-29_at_11.45.49_o6h11t.jpg"
            alt="Hero backdrop"
            fill
            priority
            quality={90}
            className="object-cover object-center opacity-65 scale-110"
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJalwtBu1FQaE6ooBEiUUwUURQD//Z"
          />
        </motion.div>
        
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col justify-center order-1 lg:order-1"
            >
              <Badge className="mb-6 w-fit bg-blue-600/20 text-blue-300 border-blue-500/30">
                {content.hero.badge}
              </Badge>
              
              <div data-sb-object-id="landing-hero-title">
                <h1 data-sb-field-path="title" className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                  {content.hero.title.split('Voice 1st')[0]}
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Voice 1st <span style={{ fontSize: '115%' }}>AI Coach</span>
                  </span>
                </h1>
              </div>
              
              {/* Description text in gradient box */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-slate-900/95 via-blue-900/90 to-purple-900/95 backdrop-blur-sm border border-white/10 shadow-2xl"
              >
                <div data-sb-object-id="landing-hero-description">
                  <p data-sb-field-path="description" className="text-lg leading-relaxed sm:text-xl" style={{ color: 'white' }}>
                    {content.hero.description}
                  </p>
                </div>
              </motion.div>
              
              {/* Talk to Agent button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-6 flex justify-end"
              >
                <Button 
                  size="lg" 
                  className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-4 text-lg transition-transform ${showButtonPulse ? 'button-pulse' : ''}`}
                  onClick={handleTalkToAgent}
                >
                  <Mic className="mr-2 h-5 w-5" />
                  {content.hero.ctaText}
                </Button>
              </motion.div>
            </motion.div>

            {/* Video Section - Appears after title on mobile, side-by-side on desktop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative order-2 lg:order-2 mt-8 lg:mt-0"
            >
              <div className={`relative overflow-hidden rounded-2xl bg-gray-900 shadow-2xl max-w-sm mx-auto lg:max-w-lg transition-opacity duration-500 ${!isPaused && !hasEnded ? 'opacity-100' : 'opacity-75'}`}>
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
                          className="bg-white/20 border-white/50 text-white hover:bg-white/30 backdrop-blur-md px-8 py-4 text-lg font-medium shadow-lg"
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
                          className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-4 text-lg transition-transform ${showButtonPulse ? 'button-pulse' : ''}`}
                        >
                          <Mic className="mr-2 h-5 w-5" />
                          {content.hero.ctaText}
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

            {/* Features checkmarks - Appears after video on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="order-3 lg:col-span-2 mt-8 lg:mt-6"
            >              
              <div className="flex items-center gap-6 text-sm text-gray-400">
                {content.hero.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    {feature}
                  </div>
                ))}
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
            <div data-sb-object-id="features-section">
              <h2 data-sb-field-path="title" className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {content.whyChoose.title}
              </h2>
              <p data-sb-field-path="subtitle" className="mt-4 text-lg text-gray-300 max-w-3xl mx-auto">
                {content.whyChoose.subtitle}
              </p>
            </div>
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
            <div data-sb-object-id="testimonials-section">
              <h2 data-sb-field-path="title" className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {content.testimonials.title}
              </h2>
              <p data-sb-field-path="subtitle" className="mt-4 text-lg text-gray-300">
                {content.testimonials.subtitle}
              </p>
            </div>
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
            <div data-sb-object-id="cta-section">
              <h2 data-sb-field-path="title" className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl mb-6">
                {content.cta.title}
              </h2>
              <p data-sb-field-path="subtitle" className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                {content.cta.subtitle}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder={content.cta.emailPlaceholder}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-400"
              />
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                onClick={handleTalkToAgent}
              >
                <Mic className="mr-2 h-4 w-4" />
                {content.cta.buttonText}
              </Button>
            </div>
            
            <p className="text-sm text-gray-400 mt-4">
              {content.cta.disclaimer}
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
                {content.footer.tagline}
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
            <p>{content.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}