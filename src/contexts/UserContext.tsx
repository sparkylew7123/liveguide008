'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import { anonymousUserService, AnonymousUserData } from '@/lib/anonymous-user'

interface UserContextType {
  user: User | null
  anonymousUser: AnonymousUserData | null
  isAnonymous: boolean
  isLoading: boolean
  effectiveUserId: string
  signOut: () => Promise<void>
  migrateToAuthenticated: (authenticatedUser: User) => Promise<boolean>
  refreshAnonymousUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [anonymousUser, setAnonymousUser] = useState<AnonymousUserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
      } else {
        // Initialize anonymous user if no authenticated user
        const anonUser = anonymousUserService.getOrCreateAnonymousUser()
        setAnonymousUser(anonUser)
        
        // Sign in anonymously with Supabase
        await anonymousUserService.signInAnonymously()
      }
      
      setIsLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setAnonymousUser(null)
        } else {
          setUser(null)
          const anonUser = anonymousUserService.getOrCreateAnonymousUser()
          setAnonymousUser(anonUser)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    
    // Clear anonymous user data
    anonymousUserService.clearAnonymousData()
    
    // Reinitialize anonymous user
    const newAnonUser = anonymousUserService.getOrCreateAnonymousUser()
    setAnonymousUser(newAnonUser)
    setIsLoading(false)
  }

  const migrateToAuthenticated = async (authenticatedUser: User): Promise<boolean> => {
    if (!anonymousUser) return false
    
    const success = await anonymousUserService.migrateToAuthenticatedUser(authenticatedUser.id)
    if (success) {
      setUser(authenticatedUser)
      setAnonymousUser(null)
    }
    return success
  }

  const refreshAnonymousUser = () => {
    if (!user) {
      const anonUser = anonymousUserService.getOrCreateAnonymousUser()
      setAnonymousUser(anonUser)
    }
  }

  const effectiveUserId = user?.id || anonymousUser?.id || ''
  const isAnonymous = !user && !!anonymousUser

  return (
    <UserContext.Provider
      value={{
        user,
        anonymousUser,
        isAnonymous,
        isLoading,
        effectiveUserId,
        signOut,
        migrateToAuthenticated,
        refreshAnonymousUser
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}