'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null)

type PaymentAction = 'complete_108' | 'one_more_try'

interface PaymentModalProps {
  isOpen: boolean
  productId: string
  onClose: () => void
  onSuccess: (action: PaymentAction) => void | Promise<void>
}

async function getAccessToken() {
  if (!supabase) {
    throw new Error('Authentication is unavailable')
  }

  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    throw new Error('Please sign in again before paying')
  }

  return data.session.access_token
}

export function PaymentModal({
  isOpen,
  productId,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null)
  const [hasProcessed, setHasProcessed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetCheckout = useCallback(() => {
    setClientSecret(null)
    setCheckoutToken(null)
    setHasProcessed(false)
    setError(null)
  }, [])

  const startCheckout = useCallback(async () => {
    try {
      setError(null)
      if (!stripePublishableKey) {
        throw new Error('Payment is not configured')
      }

      const token = await getAccessToken()
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      })

      const data = await response.json()
      if (!response.ok || !data.clientSecret) {
        throw new Error(data.error || 'Unable to start checkout')
      }

      setCheckoutToken(token)
      setClientSecret(data.clientSecret)
      setHasProcessed(false)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to start checkout')
    }
  }, [productId])

  useEffect(() => {
    if (isOpen && productId && !clientSecret && !error) {
      startCheckout()
    }
  }, [isOpen, productId, clientSecret, error, startCheckout])

  useEffect(() => {
    if (!isOpen) {
      resetCheckout()
    }
  }, [isOpen, resetCheckout])

  useEffect(() => {
    if (!isOpen || !clientSecret || !checkoutToken || hasProcessed) return

    const checkPaymentStatus = async () => {
      if (hasProcessed) return

      try {
        const response = await fetch('/api/check-payment', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${checkoutToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clientSecret }),
        })
        const data = await response.json()

        if (response.ok && data.status === 'paid' && data.fulfilled && data.action) {
          setHasProcessed(true)
          await onSuccess(data.action === 'complete_108' ? 'complete_108' : 'one_more_try')
          onClose()
          resetCheckout()
        }
      } catch {
        setError('Unable to confirm payment yet. Please wait a moment.')
      }
    }

    const initialTimeout = setTimeout(checkPaymentStatus, 2000)
    const interval = setInterval(checkPaymentStatus, 2000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [isOpen, clientSecret, checkoutToken, hasProcessed, onSuccess, onClose, resetCheckout])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto border border-gray-800 bg-gray-950 p-0"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        <div className="p-4">
          {error && (
            <div className="mb-3 rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}
          {clientSecret && (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
