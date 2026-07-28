import Link from "next/link"

export const metadata = {
  title: "Privacy Policy | ManifestChain",
  description: "Privacy Policy for ManifestChain platform",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-gray-200 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link href="/" className="text-xs sm:text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 md:mb-8 inline-block">
            &larr; Back to ManifestChain
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white mt-4 mb-2">Privacy Policy</h1>
          <p className="text-xs sm:text-sm text-gray-500">Last updated: March 7, 2026</p>
        </div>

        <div className="space-y-6 sm:space-y-8 md:space-y-10 text-sm sm:text-base text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">1. Introduction</h2>
            <p>
              Fugazi Studios LLC ("we", "our", or "us") operates ManifestChain, accessible at manifestchain.space. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
              platform. Please read this policy carefully. If you disagree with its terms, please discontinue use of the
              platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We may collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>
                <span className="text-gray-300">Account information</span> — name, email address, and password when you
                register.
              </li>
              <li>
                <span className="text-gray-300">Location data</span> — approximate geographic coordinates, collected
                only with your explicit permission, used solely to generate your manifestation visualization.
              </li>
              <li>
                <span className="text-gray-300">User-submitted content</span> — intentions, wishes, and text you submit
                through the platform.
              </li>
              <li>
                <span className="text-gray-300">Payment information</span> — processed securely via Stripe. We do not
                store your full payment card details.
              </li>
              <li>
                <span className="text-gray-300">Usage data</span> — browser type, pages visited, timestamps, and
                referring URLs collected automatically via standard web logs.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>Provide, operate, and maintain the ManifestChain platform</li>
              <li>Generate personalized manifestation arc visualizations</li>
              <li>Process transactions and send related information</li>
              <li>Send you service-related communications</li>
              <li>Monitor and analyze usage to improve user experience</li>
              <li>Detect and prevent fraudulent or unauthorized activity</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Location Data</h2>
            <p>
              Location access is optional and requested solely to anchor your personal manifestation visualization on
              the globe. Location data is used only for this purpose and is not sold or shared with third parties for
              advertising. You may deny location permission; certain features of the platform may not function without
              it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Sharing of Information</h2>
            <p className="mb-3">We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>
                <span className="text-gray-300">Supabase</span> — database and authentication infrastructure provider
              </li>
              <li>
                <span className="text-gray-300">Stripe</span> — payment processing
              </li>
              <li>
                <span className="text-gray-300">Vercel</span> — hosting and deployment infrastructure
              </li>
              <li>Law enforcement or government authorities when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide services. You
              may request deletion of your account and associated data at any time by contacting us at the email address
              below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Security</h2>
            <p>
              We implement industry-standard security measures including encrypted data transmission (HTTPS), secure
              password hashing, and access controls. No method of transmission over the internet is 100% secure, and we
              cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Third-Party Authentication</h2>
            <p>
              You may sign in using your Google account. In this case, Google's own privacy practices apply to
              information shared with Google. We only receive the information necessary to create or link your account
              (name, email, profile photo).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Children's Privacy</h2>
            <p>
              ManifestChain is not directed to children under the age of 13. We do not knowingly collect personal
              information from children under 13. If you believe a child has provided us with personal information,
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Your Rights</h2>
            <p className="mb-3">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at the address below.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting
              the new policy on this page with an updated date. Continued use of the platform after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact:</p>
            <div className="mt-3 text-gray-400">
              <p className="font-medium text-gray-300">Fugazi Studios LLC</p>
              <p>manifestchain.space</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-gray-600">
          <p>&copy; 2026 Fugazi Studios LLC. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-400 transition-colors text-gray-500">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
