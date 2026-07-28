export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-semibold text-white">Cookie Policy</h1>
        <p>
          ManifestChain uses essential browser storage for authentication state, preferences, and consent choices.
          Optional analytics is used only after consent.
        </p>
        <h2 className="text-xl font-semibold text-white">Essential Storage</h2>
        <p>Essential storage supports sign-in, app preferences, and fraud prevention. It cannot be disabled in-app.</p>
        <h2 className="text-xl font-semibold text-white">Analytics</h2>
        <p>
          Analytics helps measure reliability and usage patterns. You may decline analytics and still use core product
          features.
        </p>
      </article>
    </main>
  )
}
