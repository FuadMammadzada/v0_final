export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-semibold text-white">Refund Policy</h1>
        <p>
          Paid features are delivered as one-time digital entitlements. Refund requests are reviewed for duplicate
          charges, failed fulfillment, unauthorized payments, or material service failure.
        </p>
        <h2 className="text-xl font-semibold text-white">Eligibility</h2>
        <p>
          Contact support within 14 days of purchase. Include the account email, payment date, and reason. Consumed
          entitlements may be refunded when the underlying workflow failed or the charge was unauthorized.
        </p>
        <h2 className="text-xl font-semibold text-white">Processing</h2>
        <p>
          Approved refunds are issued through Stripe to the original payment method. Bank processing times may vary.
        </p>
      </article>
    </main>
  )
}
