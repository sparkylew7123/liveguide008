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
      return NextResponse.json(
        { error: 'RAG context generation failed', details: error.message },
        { status: 500 }
      );
    }

    // Return the RAG context data
    return NextResponse.json(data);

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to request RAG context.' },
    { status: 405 }
  );
}