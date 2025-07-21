'use client'

import { createClient } from '@/utils/supabase/client'
import { v4 as uuidv4 } from 'uuid'

export interface AnonymousUserData {
  id: string
  goals: any[]
  preferences: any
  progress: any[]
  sessions: any[]
  created_at: string
  last_activity: string
}

export class AnonymousUserService {
  private static readonly STORAGE_KEY = 'liveguide_anonymous_user'
  private static readonly COOKIE_NAME = 'liveguide_anonymous_id'
  private supabase = createClient()

  // Generate a new anonymous user ID
  generateAnonymousId(): string {
    return `anon_${uuidv4()}`
  }

  // Get or create anonymous user ID from cookie
  getAnonymousId(): string {
    if (typeof window === 'undefined') return ''
    
    // Check cookie first
    const cookies = document.cookie.split(';')
    const anonymousCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${AnonymousUserService.COOKIE_NAME}=`)
    )
    
    if (anonymousCookie) {
      return anonymousCookie.split('=')[1].trim()
    }
    
    // Generate new ID if not found
    const newId = this.generateAnonymousId()
    this.setAnonymousId(newId)
    return newId
  }

  // Set anonymous user ID in cookie
  setAnonymousId(id: string): void {
    if (typeof window === 'undefined') return
    
    const expires = new Date()
    expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days
    
    document.cookie = `${AnonymousUserService.COOKIE_NAME}=${id}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
  }

  // Get anonymous user data from localStorage
  getAnonymousUserData(): AnonymousUserData | null {
    if (typeof window === 'undefined') return null
    
    const data = localStorage.getItem(AnonymousUserService.STORAGE_KEY)
    if (!data) return null
    
    try {
      return JSON.parse(data)
    } catch (error) {
      console.error('Error parsing anonymous user data:', error)
      return null
    }
  }

  // Save anonymous user data to localStorage
  saveAnonymousUserData(data: AnonymousUserData): void {
    if (typeof window === 'undefined') return
    
    data.last_activity = new Date().toISOString()
    localStorage.setItem(AnonymousUserService.STORAGE_KEY, JSON.stringify(data))
  }

  // Initialize anonymous user data
  initializeAnonymousUser(): AnonymousUserData {
    const anonymousId = this.getAnonymousId()
    const now = new Date().toISOString()
    
    const userData: AnonymousUserData = {
      id: anonymousId,
      goals: [],
      preferences: {},
      progress: [],
      sessions: [],
      created_at: now,
      last_activity: now
    }
    
    this.saveAnonymousUserData(userData)
    return userData
  }

  // Get or create anonymous user data
  getOrCreateAnonymousUser(): AnonymousUserData {
    let userData = this.getAnonymousUserData()
    
    if (!userData) {
      userData = this.initializeAnonymousUser()
    }
    
    return userData
  }

  // Add goal to anonymous user
  addGoalToAnonymousUser(goal: any): void {
    const userData = this.getOrCreateAnonymousUser()
    userData.goals.push({
      ...goal,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      user_id: userData.id
    })
    this.saveAnonymousUserData(userData)
  }

  // Update anonymous user preferences
  updateAnonymousUserPreferences(preferences: any): void {
    const userData = this.getOrCreateAnonymousUser()
    userData.preferences = { ...userData.preferences, ...preferences }
    this.saveAnonymousUserData(userData)
  }

  // Add session to anonymous user
  addSessionToAnonymousUser(session: any): void {
    const userData = this.getOrCreateAnonymousUser()
    userData.sessions.push({
      ...session,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      user_id: userData.id
    })
    this.saveAnonymousUserData(userData)
  }

  // Check if user is anonymous
  isAnonymousUser(): boolean {
    const anonymousId = this.getAnonymousId()
    return anonymousId.startsWith('anon_')
  }

  // Sign in with anonymous user for Supabase
  async signInAnonymously(): Promise<string | null> {
    try {
      // Temporarily disable anonymous sign-in to fix 500 error
      console.log('Skipping anonymous sign-in due to server error')
      return this.getAnonymousId()
      
      // const { data, error } = await this.supabase.auth.signInAnonymously()
      
      // if (error) {
      //   console.error('Error signing in anonymously:', error)
      //   return null
      // }
      
      // // Store mapping between anonymous ID and Supabase user ID
      // const anonymousId = this.getAnonymousId()
      // const supabaseUserId = data.user?.id
      
      // if (supabaseUserId) {
      //   this.mapAnonymousToSupabase(anonymousId, supabaseUserId)
      //   return supabaseUserId
      // }
      
      // return null
    } catch (error) {
      console.error('Error with anonymous sign in:', error)
      return this.getAnonymousId()
    }
  }

  // Map anonymous ID to Supabase user ID
  private mapAnonymousToSupabase(anonymousId: string, supabaseUserId: string): void {
    if (typeof window === 'undefined') return
    
    const mapping = {
      anonymousId,
      supabaseUserId,
      created_at: new Date().toISOString()
    }
    
    localStorage.setItem('liveguide_user_mapping', JSON.stringify(mapping))
  }

  // Get Supabase user ID from anonymous ID
  getSupabaseUserId(): string | null {
    if (typeof window === 'undefined') return null
    
    const mapping = localStorage.getItem('liveguide_user_mapping')
    if (!mapping) return null
    
    try {
      const data = JSON.parse(mapping)
      return data.supabaseUserId
    } catch (error) {
      console.error('Error parsing user mapping:', error)
      return null
    }
  }

  // Migrate anonymous user data to authenticated user
  async migrateToAuthenticatedUser(authenticatedUserId: string): Promise<boolean> {
    try {
      const anonymousData = this.getAnonymousUserData()
      if (!anonymousData) return false

      // Migrate goals
      for (const goal of anonymousData.goals) {
        await this.supabase
          .from('user_goals')
          .insert({
            ...goal,
            user_id: authenticatedUserId,
            profile_id: authenticatedUserId,
            metadata: {
              ...goal.metadata,
              migrated_from_anonymous: true,
              original_anonymous_id: anonymousData.id
            }
          })
      }

      // Clear anonymous data after successful migration
      this.clearAnonymousData()
      return true
    } catch (error) {
      console.error('Error migrating anonymous user data:', error)
      return false
    }
  }

  // Clear anonymous user data
  clearAnonymousData(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(AnonymousUserService.STORAGE_KEY)
    localStorage.removeItem('liveguide_user_mapping')
    
    // Clear cookie
    document.cookie = `${AnonymousUserService.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  }

  // Get effective user ID (authenticated or anonymous)
  getEffectiveUserId(): string {
    const supabaseUserId = this.getSupabaseUserId()
    return supabaseUserId || this.getAnonymousId()
  }
}

export const anonymousUserService = new AnonymousUserService()