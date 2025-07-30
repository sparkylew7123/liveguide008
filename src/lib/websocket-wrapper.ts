/**
 * WebSocket wrapper to prevent "WebSocket is already in CLOSING or CLOSED state" errors
 * This is needed to fix issues with the ElevenLabs React SDK
 */

// Only run in browser environment
if (typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined') {
  // Store original WebSocket constructor
  const OriginalWebSocket = window.WebSocket;
  
  // Check if we've already wrapped it
  if (!(OriginalWebSocket as any).__isWrapped) {
    class SafeWebSocket extends OriginalWebSocket {
      private _isSending = false;

      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        
        // Store original methods to avoid infinite recursion
        const originalSend = super.send;
        const originalClose = super.close;
        
        // Override the send method to check state before sending
        this.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
          // Only send if WebSocket is in OPEN state
          if (this.readyState === WebSocket.OPEN && !this._isSending) {
            this._isSending = true;
            try {
              originalSend.call(this, data);
            } catch (error) {
              console.warn('WebSocket send error (suppressed):', error);
            } finally {
              this._isSending = false;
            }
          } else {
            console.warn('Prevented send on non-open WebSocket. State:', this.readyState);
          }
        };

        // Override close method to prevent multiple close calls
        this.close = (code?: number, reason?: string) => {
          if (this.readyState === WebSocket.OPEN || this.readyState === WebSocket.CONNECTING) {
            try {
              originalClose.call(this, code, reason);
            } catch (error) {
              console.warn('WebSocket close error (suppressed):', error);
            }
          }
        };
      }
    }

    // Mark as wrapped to prevent double-wrapping
    (SafeWebSocket as any).__isWrapped = true;
    
    // Replace global WebSocket
    window.WebSocket = SafeWebSocket as any;
    
    console.log('✅ WebSocket wrapper initialized');
  }
}

export {};