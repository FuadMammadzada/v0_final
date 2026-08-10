'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { getAccessToken } from '@/lib/supabase'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null)

type PaymentAction = 'complete_108' | 'one_more_try'

interface PaymentModalProps {
  isOpen: boolean
  productId: string
  onClose: () => void
  onSuccess: (action: PaymentAction) => void | Promise<void>
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
  const paymentCheckInFlightRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    onCloseRef.current = onClose
    onSuccessRef.current = onSuccess
  }, [onClose, onSuccess])

  const resetCheckout = useCallback(() => {
    setClientSecret(null)
    setCheckoutToken(null)
    setHasProcessed(false)
    setError(null)
    paymentCheckInFlightRef.current = false
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

    let cancelled = false

    const checkPaymentStatus = async () => {
      if (cancelled || paymentCheckInFlightRef.current) return
      paymentCheckInFlightRef.current = true

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

        if (!response.ok) {
          throw new Error(data.error || 'Unable to confirm payment')
        }

        if (!cancelled && data.status === 'paid' && data.fulfilled && data.action) {
          setHasProcessed(true)
          await onSuccessRef.current(data.action === 'complete_108' ? 'complete_108' : 'one_more_try')
          onCloseRef.current()
          resetCheckout()
        }
      } catch (paymentError) {
        if (!cancelled) {
          setError(paymentError instanceof Error ? paymentError.message : 'Unable to confirm payment yet.')
        }
      } finally {
        paymentCheckInFlightRef.current = false
      }
    }

    void checkPaymentStatus()
    const interval = setInterval(checkPaymentStatus, 2500)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isOpen, clientSecret, checkoutToken, hasProcessed, resetCheckout])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto border border-gray-800 bg-gray-950 p-0"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        <DialogTitle className="sr-only">Secure checkout</DialogTitle>
        <DialogDescription className="sr-only">
          Complete your payment securely to continue your manifestation journey.
        </DialogDescription>
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
