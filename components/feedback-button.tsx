"use client"

import { useState } from "react"
import { MessageCircle, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!feedback.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback: feedback.trim(),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFeedback("")
        setTimeout(() => {
          setIsOpen(false)
          setIsSubmitted(false)
        }, 2000)
      } else {
        throw new Error("Failed to send feedback")
      }
    } catch {
      setError("Failed to send feedback. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setFeedback("")
    setIsSubmitted(false)
    setError(null)
  }

  return (
    <>
      {/* Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full p-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
        title="Send Feedback"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal Content */}
          <div className="relative bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-6 w-full max-w-md shadow-2xl">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white mb-2">Send Feedback</h3>
              <p className="text-white/70 text-sm">
                Help us improve ManifestChain with your thoughts and suggestions.
              </p>
            </div>

              {isSubmitted ? (
              /* Success Message */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-green-400 font-medium mb-2">Feedback Sent!</p>
                <p className="text-white/70 text-sm">Thank you for helping us improve.</p>
              </div>
            ) : (
              /* Feedback Form */
              <>
                {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

                {/* Textarea */}
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or report issues..."
                  className="mb-4 min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 resize-none"
                  disabled={isSubmitting}
                />

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!feedback.trim() || isSubmitting}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
