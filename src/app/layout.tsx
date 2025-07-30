import './globals.css'
import '@/styles/feminine-themes.css'
import { UserProvider } from '@/contexts/UserContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { Navbar } from '@/components/layout/Navbar'
import { ThemeInitializer } from '@/components/layout/ThemeInitializer'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'system';
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const root = document.documentElement;
                
                root.classList.remove('light-theme', 'dark-theme');
                
                if (theme === 'system') {
                  root.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
                } else {
                  root.classList.add(theme + '-theme');
                }
                
                // Set initial background to prevent flash
                if (theme === 'dark' || (theme === 'system' && prefersDark)) {
                  root.style.backgroundColor = '#111827';
                } else {
                  root.style.backgroundColor = '#ffffff';
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeInitializer />
        <ToastProvider>
          <UserProvider>
            <Navbar />
            {children}
          </UserProvider>
        </ToastProvider>
      </body>
    </html>
  )
}