import Link from 'next/link'
import Image from 'next/image'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Logo Header */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="block">
          <Image 
            src="https://res.cloudinary.com/dlq71ih0t/image/upload/v1750020672/liveguide-logo-clear.png" 
            alt="LiveGuide" 
            width={232} 
            height={66} 
            className="h-14 w-auto"
            priority
            unoptimized
          />
        </Link>
      </div>

      {/* Verification Message */}
      <div className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-800 text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
        </div>
        
        <div data-sb-object-id="verify-email-content">
          <h2 data-sb-field-path="title" className="mb-4 text-2xl font-bold text-white">Check Your Email</h2>
          
          <p data-sb-field-path="message" className="mb-6 text-gray-300">
            We've sent you a verification email. Please check your inbox and click the link to verify your account.
          </p>
          
          <p data-sb-field-path="help-text" className="mb-8 text-sm text-gray-400">
            Didn't receive the email? Check your spam folder or wait a few moments and try again.
          </p>
        </div>
        
        <Link 
          href="/login" 
          className="inline-block px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all"
        >
          Return to Login
        </Link>
      </div>
    </div>
  )
}