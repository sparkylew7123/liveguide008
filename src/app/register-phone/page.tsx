import Image from 'next/image'
import Link from 'next/link'
import PhoneRegisterForm from '@/components/auth/PhoneRegisterForm'

export default function RegisterPhonePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Logo Header */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="block">
          <Image 
            src="https://res.cloudinary.com/dlq71ih0t/image/upload/v1750020672/liveguide-logo-clear.png" 
            alt="LiveGuide" 
            width={140} 
            height={40} 
            className="h-8 w-auto"
            priority
            unoptimized
          />
        </Link>
      </div>

      <PhoneRegisterForm />
    </div>
  )
}