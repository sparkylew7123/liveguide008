import './globals.css'
import { UserProvider } from '@/contexts/UserContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ElevenLabsProvider } from '@/providers/ElevenLabsProvider'
import { Navbar } from '@/components/layout/Navbar'

export const metadata = {
  title: 'LiveGuide - Voice-First AI Coaching',
  description: 'Experience the future of personal development with AI coaches powered by ElevenLabs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <ElevenLabsProvider>
            <UserProvider>
              <Navbar />
              {children}
            </UserProvider>
          </ElevenLabsProvider>
        </ToastProvider>
      </body>
    </html>
  )
}