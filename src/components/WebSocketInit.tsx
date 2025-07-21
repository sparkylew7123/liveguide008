'use client';

import { useEffect } from 'react';

/**
 * Client-side WebSocket initialization component
 * This ensures WebSocket wrapper is loaded on the client side
 */
export function WebSocketInit() {
  useEffect(() => {
    // Import the WebSocket wrapper on the client side
    import('@/lib/websocket-wrapper').then(() => {
      console.log('✅ WebSocket wrapper initialized');
    }).catch((error) => {
      console.warn('⚠️ Failed to initialize WebSocket wrapper:', error);
    });
  }, []);

  return null; // This component doesn't render anything
}