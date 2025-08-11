'use client';

import { initPlasmicLoader } from '@plasmicapp/loader-nextjs';
import dynamic from 'next/dynamic';

const projectId = process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID || '';
const projectToken = process.env.NEXT_PUBLIC_PLASMIC_PROJECT_TOKEN || '';

// Debug logging
if (typeof window !== 'undefined') {
  console.log('Plasmic Project ID:', projectId);
  console.log('Plasmic Token length:', projectToken.length);
}

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: projectId,
      token: projectToken,
    },
  ],
  // Enable preview mode in development to see unpublished changes
  preview: process.env.NODE_ENV === 'development',
});

// Register global context for theme integration
// Note: We'll register this in the component to avoid initialization issues

// Register custom components that Plasmic can use
// These are your existing components that you want to make available in Plasmic Studio
export function registerComponents() {
  // Example: Register your CTA button
  // PLASMIC.registerComponent(
  //   dynamic(() => import('@/components/ui/button')),
  //   {
  //     name: 'CallToActionButton',
  //     props: {
  //       children: 'string',
  //       variant: {
  //         type: 'choice',
  //         options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
  //       },
  //       size: {
  //         type: 'choice',
  //         options: ['default', 'sm', 'lg', 'icon'],
  //       },
  //       onClick: {
  //         type: 'eventHandler',
  //         argTypes: [],
  //       },
  //     },
  //   }
  // );

  // Register more components as needed
}

// Initialize component registration
if (typeof window !== 'undefined') {
  registerComponents();
}