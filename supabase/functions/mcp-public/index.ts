import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Use hardcoded values since env vars might not be available
const SUPABASE_URL = "https://hlwxmfwrksflvcacjafg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

// This is a public proxy that adds authentication to the MCP server
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Remove /mcp-public from path and forward to /mcp-server
    const targetPath = url.pathname.replace(/^\/functions\/v1\/mcp-public/, '/functions/v1/mcp-server');
    const targetUrl = `${SUPABASE_URL}${targetPath}${url.search}`;
    
    console.log(`Proxying ${req.method} request to: ${targetUrl}`);
    
    // Clone headers and add the required authorization
    const headers = new Headers(req.headers);
    headers.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
    
    // Handle SSE requests
    if (req.headers.get("accept")?.includes("text/event-stream")) {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: headers,
      });
      
      // For SSE, we need to modify the endpoint path in the response
      if (response.ok && response.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        const stream = new ReadableStream({
          async start(controller) {
            if (!reader) return;
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Decode and modify the SSE data
                let text = decoder.decode(value);
                // Replace /mcp-server with /mcp-public in the endpoint event
                text = text.replace(/\/functions\/v1\/mcp-server/g, '/functions/v1/mcp-public');
                
                controller.enqueue(encoder.encode(text));
              }
            } catch (error) {
              console.error("Stream error:", error);
            } finally {
              controller.close();
            }
          }
        });
        
        return new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          }
        });
      }
    }
    
    // Handle regular requests
    let body = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.text();
    }
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });
    
    const responseText = await response.text();
    
    return new Response(responseText, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
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