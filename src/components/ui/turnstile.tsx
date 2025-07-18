'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { useRef, useImperativeHandle, forwardRef } from 'react'

interface TurnstileProps {
  siteKey: string
  onSuccess?: (token: string) => void
  onError?: (error: string) => void
  onExpire?: () => void
  className?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
}

export interface TurnstileRef {
  reset: () => void
  getResponse: () => string | null
}

export const TurnstileComponent = forwardRef<TurnstileRef, TurnstileProps>(
  ({ siteKey, onSuccess, onError, onExpire, className, theme = 'auto', size = 'normal' }, ref) => {
    const turnstileRef = useRef<any>(null)

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset()
      },
      getResponse: () => {
        return turnstileRef.current?.getResponse() || null
      }
    }))

    return (
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        className={className}
        options={{
          theme,
          size,
        }}
      />
    )
  }
)

TurnstileComponent.displayName = 'TurnstileComponent'