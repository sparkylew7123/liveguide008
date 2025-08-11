import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Forward the request to the actual MCP server with the required apikey
    const url = new URL(req.url);
    const targetUrl = `${SUPABASE_URL}/functions/v1/mcp-server${url.search}`;
    
    console.log(`Proxying ${req.method} request to: ${targetUrl}`);
    
    // Clone headers and add the required apikey
    const headers = new Headers(req.headers);
    headers.set("apikey", SUPABASE_ANON_KEY);
    
    // Get body if present
    let body = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.text();
      console.log("Request body:", body);
    }
    
    // Forward the request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });
    
    // Get response text
    const responseText = await response.text();
    console.log("Response:", responseText);
    
    // Forward the response with CORS headers
    const responseHeaders = new Headers();
    // Copy content-type from original response
    const contentType = response.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("Content-Type", contentType);
    }
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    
    return new Response(responseText, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});