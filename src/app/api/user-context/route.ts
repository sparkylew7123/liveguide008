import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UserContextService } from '@/services/user-context.service';
import { 
  UserContextResponse, 
  UserContextQueryParams, 
  UserContextError 
} from '@/types/agent-context';

// In-memory cache for user context (5-minute TTL)
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

const contextCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: string, params: UserContextQueryParams): string {
  return `${userId}:${JSON.stringify(params)}`;
}

function getCachedContext(cacheKey: string): { data: any; cacheAgeSeconds: number } | null {
  const entry = contextCache.get(cacheKey);
  
  if (!entry) return null;
  
  const now = Date.now();
  if (now > entry.expiresAt) {
    contextCache.delete(cacheKey);
    return null;
  }
  
  const cacheAgeSeconds = Math.floor((now - entry.timestamp) / 1000);
  return { data: entry.data, cacheAgeSeconds };
}

function setCachedContext(cacheKey: string, data: any): void {
  const now = Date.now();
  contextCache.set(cacheKey, {
    data,
    timestamp: now,
    expiresAt: now + CACHE_TTL_MS
  });
  
  // Clean up expired entries (simple cleanup, runs on each set)
  const expiredKeys = Array.from(contextCache.entries())
    .filter(([, entry]) => Date.now() > entry.expiresAt)
    .map(([key]) => key);
    
  expiredKeys.forEach(key => contextCache.delete(key));
}

async function validateUser(supabase: any): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new Error(`Authentication error: ${error.message}`);
  }
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user.id;
}

function parseQueryParams(searchParams: URLSearchParams): UserContextQueryParams {
  return {
    include_detailed_insights: searchParams.get('include_detailed_insights') === 'true',
    include_session_summaries: searchParams.get('include_session_summaries') === 'true',
    insights_limit: searchParams.get('insights_limit') ? 
      Math.max(1, Math.min(50, parseInt(searchParams.get('insights_limit')!))) : 10,
    sessions_limit: searchParams.get('sessions_limit') ? 
      Math.max(1, Math.min(20, parseInt(searchParams.get('sessions_limit')!))) : 5,
    time_range_days: searchParams.get('time_range_days') ? 
      Math.max(1, Math.min(365, parseInt(searchParams.get('time_range_days')!))) : 30
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Validate user authentication
    const userId = await validateUser(supabase);
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = parseQueryParams(searchParams);
    
    // Check cache first
    const cacheKey = getCacheKey(userId, queryParams);
    const cachedResult = getCachedContext(cacheKey);
    
    if (cachedResult) {
      console.log(`[UserContext] Cache hit for user ${userId}, age: ${cachedResult.cacheAgeSeconds}s`);
      
      const response: UserContextResponse = {
        success: true,
        data: cachedResult.data,
        cached: true,
        cache_age_seconds: cachedResult.cacheAgeSeconds
      };
      
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'private, max-age=300', // 5 minutes
          'X-Cache-Status': 'HIT',
          'X-Cache-Age': cachedResult.cacheAgeSeconds.toString()
        }
      });
    }
    
    // Cache miss - fetch fresh data
    console.log(`[UserContext] Cache miss for user ${userId}, fetching fresh data...`);
    
    const contextService = new UserContextService(supabase, userId);
    const userContext = await contextService.getUserContext(queryParams);
    
    // Cache the result
    setCachedContext(cacheKey, userContext);
    
    const processingTimeMs = Date.now() - startTime;
    console.log(`[UserContext] Fresh data fetched for user ${userId} in ${processingTimeMs}ms`);
    
    const response: UserContextResponse = {
      success: true,
      data: userContext,
      cached: false
    };
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'X-Cache-Status': 'MISS',
        'X-Processing-Time': processingTimeMs.toString()
      }
    });
    
  } catch (error) {
    console.error('[UserContext] Error fetching user context:', error);
    
    const processingTimeMs = Date.now() - startTime;
    
    // Determine error type and appropriate status code
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'Failed to fetch user context';
    
    if (error instanceof Error) {
      if (error.message.includes('not authenticated') || error.message.includes('Authentication error')) {
        statusCode = 401;
        errorCode = 'AUTHENTICATION_REQUIRED';
        errorMessage = 'User authentication required';
      } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
        statusCode = 404;
        errorCode = 'USER_NOT_FOUND';
        errorMessage = 'User profile not found';
      } else if (error.message.includes('permission') || error.message.includes('access denied')) {
        statusCode = 403;
        errorCode = 'ACCESS_DENIED';
        errorMessage = 'Access denied to user context';
      }
    }
    
    const contextError: UserContextError = {
      code: errorCode,
      message: errorMessage,
      details: {
        originalError: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        processingTimeMs
      }
    };
    
    const response: UserContextResponse = {
      success: false,
      error: contextError,
      cached: false
    };
    
    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'X-Error-Code': errorCode,
        'X-Processing-Time': processingTimeMs.toString()
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await validateUser(supabase);
    
    // Parse request body for query parameters
    const body = await request.json();
    const queryParams: UserContextQueryParams = {
      include_detailed_insights: body.include_detailed_insights,
      include_session_summaries: body.include_session_summaries,
      insights_limit: body.insights_limit,
      sessions_limit: body.sessions_limit,
      time_range_days: body.time_range_days
    };
    
    // Force cache refresh by clearing cache entry
    const cacheKey = getCacheKey(userId, queryParams);
    contextCache.delete(cacheKey);
    console.log(`[UserContext] Cache cleared for user ${userId}`);
    
    // Fetch fresh data
    const contextService = new UserContextService(supabase, userId);
    const userContext = await contextService.getUserContext(queryParams);
    
    // Cache the result
    setCachedContext(cacheKey, userContext);
    
    const response: UserContextResponse = {
      success: true,
      data: userContext,
      cached: false
    };
    
    return NextResponse.json(response, {
      headers: {
        'X-Cache-Status': 'REFRESHED'
      }
    });
    
  } catch (error) {
    console.error('[UserContext] Error in POST request:', error);
    
    const contextError: UserContextError = {
      code: 'REFRESH_FAILED',
      message: 'Failed to refresh user context',
      details: {
        originalError: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
    
    const response: UserContextResponse = {
      success: false,
      error: contextError,
      cached: false
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Clear cache endpoint (for development/testing)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await validateUser(supabase);
    
    // Clear all cache entries for this user
    const userCacheKeys = Array.from(contextCache.keys())
      .filter(key => key.startsWith(`${userId}:`));
    
    userCacheKeys.forEach(key => contextCache.delete(key));
    
    console.log(`[UserContext] Cleared ${userCacheKeys.length} cache entries for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${userCacheKeys.length} cache entries`,
      cached: false
    });
    
  } catch (error) {
    console.error('[UserContext] Error clearing cache:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'CACHE_CLEAR_FAILED',
        message: 'Failed to clear cache'
      },
      cached: false
    }, { status: 500 });
  }
}