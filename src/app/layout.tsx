import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://liveguide.ai'),
  title: 'LiveGuide - Voice-First AI Life Coaching',
  description: 'Experience the future of personal development with AI coaches powered by ElevenLabs. Choose from 12 specialized coaches for career, wellness, mindfulness, and emotional growth.',
  keywords: 'AI coaching, voice coaching, personal development, ElevenLabs, life coaching, career guidance, mindfulness',
  openGraph: {
    title: 'LiveGuide - Voice-First AI Life Coaching',
    description: 'Experience the future of personal development with AI coaches powered by ElevenLabs.',
    url: 'https://liveguide.ai',
    siteName: 'LiveGuide',
    images: [
      {
        url: 'https://res.cloudinary.com/dlq71ih0t/image/upload/v1750020672/liveguide-logo-clear.png',
        width: 1200,
        height: 630,
        alt: 'LiveGuide - Voice-First AI Life Coaching'
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LiveGuide - Voice-First AI Life Coaching',
    description: 'Experience the future of personal development with AI coaches powered by ElevenLabs.',
    images: ['https://res.cloudinary.com/dlq71ih0t/image/upload/v1750020672/liveguide-logo-clear.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}