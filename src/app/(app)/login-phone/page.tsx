import Image from 'next/image'
import Link from 'next/link'
import PhoneLoginForm from '@/components/auth/PhoneLoginForm'

export default function LoginPhonePage() {
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

      <PhoneLoginForm />
    </div>
  )
}