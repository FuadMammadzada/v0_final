import Link from "next/link"

export const metadata = {
  title: "Terms of Service | ManifestChain",
  description: "Terms of Service for ManifestChain platform",
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-gray-200 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link href="/" className="text-xs sm:text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 md:mb-8 inline-block">
            &larr; Back to ManifestChain
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white mt-4 mb-2">Terms of Service</h1>
          <p className="text-xs sm:text-sm text-gray-500">Last updated: March 7, 2026</p>
        </div>

        <div className="space-y-6 sm:space-y-8 md:space-y-10 text-sm sm:text-base text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ManifestChain ("the Platform"), operated by Fugazi Studios LLC ("Company", "we",
              "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these
              Terms, do not use the Platform. We reserve the right to modify these Terms at any time, and your
              continued use constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              ManifestChain is a web platform that allows registered users to submit personal intentions, wishes, and
              affirmations, which are visualized as energy arc animations on a 3D globe. The Platform offers both free
              monthly manifestations and optional paid features, including additional manifestation attempts and
              enhanced 108-arc visualization modes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Eligibility</h2>
            <p>
              You must be at least 13 years of age to use this Platform. By using the Platform, you represent and
              warrant that you meet this age requirement and that you have the legal capacity to enter into these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. User Accounts</h2>
            <p className="mb-3">
              To access certain features, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
            <p className="mt-3">
              We reserve the right to terminate accounts that violate these Terms or that have been inactive for an
              extended period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. User-Submitted Content</h2>
            <p className="mb-3">
              You retain ownership of the intentions and text you submit through the Platform. By submitting content,
              you grant Fugazi Studios LLC a non-exclusive, worldwide, royalty-free license to use, store, and display
              that content solely for the purpose of providing the service.
            </p>
            <p className="mb-3">You agree not to submit content that:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>Is unlawful, harmful, threatening, abusive, or harassing</li>
              <li>Infringes upon intellectual property rights of others</li>
              <li>Contains personal information of third parties without consent</li>
              <li>Constitutes spam or unsolicited advertising</li>
              <li>Promotes violence, discrimination, or illegal activity</li>
            </ul>
            <p className="mt-3">
              We reserve the right to remove any content that violates these Terms without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Payments and Refunds</h2>
            <p className="mb-3">
              Certain features of the Platform require payment. All payments are processed securely via Stripe.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>
                All purchases are final. Due to the digital and immediately consumed nature of the service, we do not
                offer refunds except where required by applicable law.
              </li>
              <li>
                Prices are displayed in USD and are subject to change with reasonable notice.
              </li>
              <li>
                You are responsible for any taxes applicable to your purchases.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Usage Limits</h2>
            <p>
              Free accounts are limited to one (1) manifestation per calendar month. Additional manifestations may be
              purchased via the Platform's paid features. We reserve the right to adjust usage limits at any time with
              reasonable notice to users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Intellectual Property</h2>
            <p>
              All content, design, code, branding, and other materials on the Platform — excluding user-submitted
              content — are the exclusive property of Fugazi Studios LLC and are protected by applicable intellectual
              property laws. You may not reproduce, distribute, or create derivative works without our express written
              permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Disclaimer of Warranties</h2>
            <p>
              The Platform is provided on an "as is" and "as available" basis without warranties of any kind, either
              express or implied, including but not limited to implied warranties of merchantability, fitness for a
              particular purpose, or non-infringement. We do not warrant that the Platform will be uninterrupted,
              error-free, or free of harmful components. ManifestChain is an entertainment and visualization platform
              and makes no claims regarding any metaphysical, spiritual, or real-world outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Fugazi Studios LLC shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of or inability to use the
              Platform, even if we have been advised of the possibility of such damages. Our total liability to you for
              any claims arising under these Terms shall not exceed the amount you paid us in the twelve (12) months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the United States, without
              regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved
              exclusively in the courts of competent jurisdiction in the United States.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Platform at our sole discretion, with or
              without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or
              third parties, or for any other reason. Upon termination, your right to use the Platform immediately
              ceases.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Contact</h2>
            <p>For questions about these Terms of Service, please contact:</p>
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
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors text-gray-500">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
