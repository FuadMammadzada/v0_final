import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/lib/auth-context"
import { GeolocationProvider } from "@/components/geolocation-provider"
import CookieConsent from "@/components/cookie-consent"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Manifestchain",
  description: "Manifest your dreams with blockchain technology",
  generator: "v0.dev",
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <GeolocationProvider>
            {children}
            <CookieConsent />
          </GeolocationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
