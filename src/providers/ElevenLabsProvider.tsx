'use client';

import { ElevenLabsProvider as ElevenLabsProviderBase } from '@elevenlabs/react';

interface ElevenLabsProviderProps {
  children: React.ReactNode;
}

export function ElevenLabsProvider({ children }: ElevenLabsProviderProps) {
  // The API key should be provided from environment variables
  // Note: This is a public API key that will be exposed to the client
  // Make sure it has appropriate restrictions set in the ElevenLabs dashboard
  const publicApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_PUBLIC_API_KEY;

  if (!publicApiKey) {
    console.warn('NEXT_PUBLIC_ELEVENLABS_PUBLIC_API_KEY is not set. Voice features will not work.');
    // Return children without provider if no API key
    return <>{children}</>;
  }

  return (
    <ElevenLabsProviderBase
      apiKey={publicApiKey}
      // Optional: Configure additional settings
      options={{
        // You can add custom options here if needed
      }}
    >
      {children}
    </ElevenLabsProviderBase>
  );
}