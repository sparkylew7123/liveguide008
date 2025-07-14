import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
);

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

Deno.serve(async (req) => {
  console.log('=== EDGE FUNCTION INVOKED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  const url = new URL(req.url);
  const upgrade = req.headers.get('upgrade') || '';
  const isWebSocketParam = url.searchParams.get('is_websocket');
  
  // Check for either the standard header OR our workaround query parameter
  const isWebSocketRequest = upgrade.toLowerCase() === 'websocket' || isWebSocketParam === 'true';
  
  if (!isWebSocketRequest) {
    return new Response("request isn't trying to upgrade to websocket.");
  }

  // WebSocket browser clients does not support sending custom headers.
  // We have to use the URL query params to provide user's JWT.
  // Please be aware query params may be logged in some logging systems.
  const jwt = url.searchParams.get('jwt');
  if (!jwt) {
    console.error('Auth token not provided');
    return new Response('Auth token not provided', { status: 403 });
  }

  const { error, data } = await supabase.auth.getUser(jwt);
  if (error) {
    console.error(error);
    return new Response('Invalid token provided', { status: 403 });
  }
  if (!data.user) {
    console.error('user is not authenticated');
    return new Response('User is not authenticated', { status: 403 });
  }

  // Extract required parameters
  const agentId = url.searchParams.get("agent_id");
  const sessionId = url.searchParams.get("session_id"); // Optional, for internal tracking only

  if (!agentId) {
    return new Response("Missing required parameter: agent_id", { status: 400 });
  }

  if (!ELEVENLABS_API_KEY) {
    console.error('ElevenLabs API key not configured');
    return new Response('ElevenLabs API key not configured', { status: 500 });
  }

  console.log(`User ${data.user.id} authenticated, getting signed URL...`);

  // Get signed URL from ElevenLabs API BEFORE upgrading WebSocket
  let signedUrl: string;
  try {
    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      console.error(`Failed to get signed URL: ${signedUrlResponse.status} - ${errorText}`);
      return new Response('ElevenLabs authentication failed', { status: 500 });
    }

    const signedUrlData = await signedUrlResponse.json();
    signedUrl = signedUrlData.signed_url;
    console.log('Got signed URL from ElevenLabs:', signedUrl ? 'URL_RECEIVED' : 'NO_URL');
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return new Response('ElevenLabs connection failed', { status: 500 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    console.log(`Client connected for user ${data.user.id}. Connecting to ElevenLabs...`);
    console.log(`Using signed URL for connection`);
    
    // Connect using the pre-obtained signed URL
    const elevenlabsWS = new WebSocket(signedUrl);

    elevenlabsWS.onopen = () => {
      console.log(`Successfully connected to ElevenLabs for user ${data.user.id}`);
      
      // Send confirmation to client
      socket.send(JSON.stringify({
        type: 'connection_established',
        status: 'ready'
      }));

      socket.onmessage = (e) => {
        console.log('Client message:', e.data);
        // Only send the message if ElevenLabs ws is open
        if (elevenlabsWS.readyState === 1) {
          elevenlabsWS.send(e.data);
        } else {
          socket.send(
            JSON.stringify({
              type: 'error',
              message: 'ElevenLabs connection not ready',
            })
          );
        }
      };
    };

    elevenlabsWS.onmessage = (e) => {
      console.log('ElevenLabs message received, relaying to client');
      socket.send(e.data);
    };

    elevenlabsWS.onerror = (e) => {
      console.error('ElevenLabs WebSocket error:', e);
      console.error('ElevenLabs WebSocket error type:', typeof e);
      console.error('ElevenLabs WebSocket error message:', e?.message || 'No message');
      socket.send(
        JSON.stringify({
          type: 'error',
          message: 'ElevenLabs connection error',
        })
      );
    };

    elevenlabsWS.onclose = (e) => {
      console.log(`ElevenLabs session closed for user ${data.user.id}, code: ${e.code}, reason: ${e.reason}`);
      socket.close(e.code, e.reason);
    };
  };

  socket.onerror = (e) => console.error(`Client socket error for user ${data.user.id}:`, e);
  socket.onclose = () => console.log(`Client socket closed for user ${data.user.id}`);

  return response; // 101 (Switching Protocols)
});