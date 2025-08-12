import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for edge function calls
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.userId || !body.query) {
      return NextResponse.json(
        { error: 'userId and query are required' },
        { status: 400 }
      );
    }

    // Get current user session for validation
    const authHeader = request.headers.get('authorization');
    if (!authHeader && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Call the agent-rag edge function
    const { data, error } = await supabase.functions.invoke('agent-rag', {
      body: {
        userId: body.userId,
        query: body.query,
        agentId: body.agentId,
        conversationId: body.conversationId,
        maxTokens: body.maxTokens || 12000,
        includeKnowledgeBase: body.includeKnowledgeBase !== false,
        includeSimilarPatterns: body.includeSimilarPatterns !== false
      }
    });

    if (error) {
      console.error('Agent RAG function error:', error);
      
      // Provide a fallback response when edge function fails
      const fallbackResponse = {
        context: "Welcome to LiveGuide! I'm Maya, your AI coach. While I'm having trouble accessing your full context right now, I'm here to help you explore your goals and insights. What would you like to work on today?",
        userSummary: "New user or context temporarily unavailable",
        relevantGoals: [],
        relevantInsights: [],
        knowledgeChunks: [],
        similarPatterns: null,
        tokenCount: 100,
        truncated: false
      };
      
      // Log the error but return a usable response
      console.error('Falling back to default context due to error:', error.message);
      return NextResponse.json(fallbackResponse);
    }

    // Return the RAG context data
    return NextResponse.json(data);

  } catch (error) {
    console.error('API route error:', error);
    
    // Even on complete failure, return a basic response
    const fallbackResponse = {
      context: "Welcome to LiveGuide! I'm Maya, your AI coach. I'm here to help you articulate and achieve your goals. What brings you here today?",
      userSummary: "Unable to load user context",
      relevantGoals: [],
      relevantInsights: [],
      knowledgeChunks: [],
      similarPatterns: null,
      tokenCount: 50,
      truncated: false
    };
    
    return NextResponse.json(fallbackResponse);
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to request RAG context.' },
    { status: 405 }
  );
}