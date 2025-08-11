import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { agentId, userId, customCallId, metadata, ragContext } = await request.json();
    
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Get a signed URL from ElevenLabs with all user details
    const url = new URL('https://api.elevenlabs.io/v1/convai/conversation/get_signed_url');
    url.searchParams.append('agent_id', agentId);
    
    // Add user_id for tracking and webhook association
    if (userId) {
      url.searchParams.append('user_id', userId);
    }
    
    // Add custom_call_id for tracking
    if (customCallId) {
      url.searchParams.append('custom_call_id', customCallId);
    }
    
    // Add metadata (user name, session type, etc.)
    if (metadata) {
      // Include RAG context in metadata if available
      const enrichedMetadata = { ...metadata };
      if (ragContext) {
        enrichedMetadata.ragContext = ragContext;
      }
      url.searchParams.append('metadata', JSON.stringify(enrichedMetadata));
    } else if (ragContext) {
      // If no metadata but we have RAG context, create metadata object
      url.searchParams.append('metadata', JSON.stringify({ ragContext }));
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to get signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to get signed URL' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      signedUrl: data.signed_url,
      agentId: agentId
    });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}