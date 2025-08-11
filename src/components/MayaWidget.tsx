'use client';

import { useEffect, useRef } from 'react';

interface MayaWidgetProps {
  agentId?: string;
  className?: string;
}

export default function MayaWidget({ 
  agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8',
  className = ''
}: MayaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create the ElevenLabs widget script
    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.defer = true;
    
    // Configure the widget
    (window as any).elevenlabsWidgetConfig = {
      agentId: agentId,
      // Optional configuration
      startOpen: false,
      position: 'bottom-right',
      backgroundColor: '#9333ea',
      primaryColor: '#ec4899',
      assistantImage: '/placeholder-avatar.png',
      assistantName: 'Maya',
      assistantDescription: 'Career Re-entry Coach',
      // Callback functions
      onReady: () => {
        console.log('Maya widget ready');
      },
      onOpen: () => {
        console.log('Maya widget opened');
      },
      onClose: () => {
        console.log('Maya widget closed');
      },
      onMessage: (message: any) => {
        console.log('Maya message:', message);
      },
      onError: (error: any) => {
        console.error('Maya widget error:', error);
      }
    };

    // Append script to body
    document.body.appendChild(script);

    // Cleanup
    return () => {
      // Remove script
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      
      // Clean up global config
      delete (window as any).elevenlabsWidgetConfig;
      
      // Remove any widget elements
      const widgetElements = document.querySelectorAll('[class*="elevenlabs-widget"]');
      widgetElements.forEach(el => el.remove());
    };
  }, [agentId]);

  return (
    <div ref={containerRef} className={className}>
      {/* The widget will be injected here by the script */}
    </div>
  );
}