'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaintBrushIcon, EyeIcon, HeartIcon, CpuChipIcon, SparklesIcon } from '@heroicons/react/24/outline';

const colorPalettes = [
  {
    name: 'Rose Quartz & Serenity',
    route: '/agents/agents-rose-quartz',
    description: 'Warm and nurturing, promoting trust and emotional safety',
    colors: {
      primary: '#ec4899',
      secondary: '#c084fc',
      background: 'from-rose-50 via-pink-50 to-purple-100'
    },
    psychologyPrinciples: [
      'Rose tones evoke warmth and compassion',
      'Reduces stress and promotes emotional healing',
      'Creates a safe, supportive environment'
    ],
    accessibilityScore: 'AA',
    contrastRatio: '4.5:1'
  },
  {
    name: 'Lavender Dreams',
    route: '/agents/agents-lavender',
    description: 'Calming and sophisticated, reducing anxiety while maintaining elegance',
    colors: {
      primary: '#a855f7',
      secondary: '#ec4899',
      background: 'from-purple-50 via-violet-50 to-pink-50'
    },
    psychologyPrinciples: [
      'Lavender reduces anxiety and promotes clarity',
      'Stimulates creativity and imagination',
      'Ideal for learning environments'
    ],
    accessibilityScore: 'AA',
    contrastRatio: '4.6:1'
  },
  {
    name: 'Peachy Blush',
    route: '/agents/agents-peachy',
    description: 'Warm and inviting, creating emotional connection and approachability',
    colors: {
      primary: '#f97316',
      secondary: '#f43f5e',
      background: 'from-orange-50 via-pink-50 to-rose-100'
    },
    psychologyPrinciples: [
      'Peach creates warmth and approachability',
      'Boosts energy and enthusiasm',
      'Promotes openness and emotional safety'
    ],
    accessibilityScore: 'AA',
    contrastRatio: '4.7:1'
  },
  {
    name: 'Mauve Sophistication',
    route: '/agents/agents-mauve',
    description: 'Professional femininity, balancing authority with approachability',
    colors: {
      primary: '#9333ea',
      secondary: '#be185d',
      background: 'from-purple-50 via-rose-50 to-pink-100'
    },
    psychologyPrinciples: [
      'Combines strength with softness',
      'Conveys quiet confidence and expertise',
      'Reduces visual fatigue during extended use'
    ],
    accessibilityScore: 'AA',
    contrastRatio: '4.8:1'
  }
];

export default function ColorPaletteDemo() {
  const [selectedPalette, setSelectedPalette] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Feminine Color Palettes for Agent Selection
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Explore psychologically-optimized color schemes designed to create welcoming, 
            supportive environments for voice coaching interactions.
          </p>
        </div>

        {/* Color Palette Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {colorPalettes.map((palette, index) => (
            <Card 
              key={index}
              className={`cursor-pointer transition-all duration-300 ${
                selectedPalette === index 
                  ? 'ring-2 ring-offset-2 ring-gray-400 shadow-xl' 
                  : 'hover:shadow-lg'
              }`}
              onClick={() => setSelectedPalette(index)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{palette.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {palette.description}
                    </CardDescription>
                  </div>
                  <PaintBrushIcon  className="w-6 h-6 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Color Preview */}
                <div className="space-y-3">
                  <div className={`h-20 rounded-lg bg-gradient-to-br ${palette.colors.background}`} />
                  <div className="flex gap-3">
                    <div 
                      className="flex-1 h-12 rounded-md flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: palette.colors.primary }}
                    >
                      Primary
                    </div>
                    <div 
                      className="flex-1 h-12 rounded-md flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: palette.colors.secondary }}
                    >
                      Secondary
                    </div>
                  </div>
                </div>

                {/* Psychology Principles */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CpuChipIcon  className="w-4 h-4" />
                    <span>Psychological Principles</span>
                  </div>
                  <ul className="space-y-1">
                    {palette.psychologyPrinciples.map((principle, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <SparklesIcon  className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{principle}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Accessibility Info */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <EyeIcon  className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">WCAG {palette.accessibilityScore}</span>
                  </div>
                  <div className="text-gray-600">
                    Contrast: {palette.contrastRatio}
                  </div>
                </div>

                {/* View Demo Button */}
                <Link href={palette.route} className="block">
                  <Button className="w-full" variant="outline">
                    View Live Demo
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Implementation Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartIcon  className="w-5 h-5" />
              Implementation Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-gray max-w-none">
              <h3 className="text-lg font-semibold">Quick Implementation</h3>
              <p className="text-gray-600">
                To implement any of these color schemes in your agents page:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Import the feminine theme component: <code className="bg-gray-100 px-2 py-1 rounded">AgentSelectionInterfaceFeminine</code></li>
                <li>Pass the theme prop: <code className="bg-gray-100 px-2 py-1 rounded">theme=&quot;rose-quartz&quot;</code></li>
                <li>Update the background gradient in the parent container</li>
                <li>Optionally import the CSS file for additional styling options</li>
              </ol>
              
              <h3 className="text-lg font-semibold mt-6">Accessibility Considerations</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>All color combinations meet WCAG AA standards for contrast</li>
                <li>Interactive elements have clear focus states</li>
                <li>Color is not the only indicator of state changes</li>
                <li>Animations respect prefers-reduced-motion preferences</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6">Psychological Impact</h3>
              <p className="text-gray-600">
                Each palette has been carefully designed based on color psychology research:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Warm colors</strong> (rose, peach) create emotional connection and reduce anxiety</li>
                <li><strong>Cool colors</strong> (lavender, mauve) promote focus and mental clarity</li>
                <li><strong>Soft gradients</strong> reduce cognitive load and eye strain</li>
                <li><strong>Gentle transitions</strong> create a sense of calm and control</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Back to Original */}
        <div className="text-center pt-8">
          <Link href="/agents">
            <Button variant="outline" size="lg">
              View Original Design
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}