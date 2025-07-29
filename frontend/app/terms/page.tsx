'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NotificationSidebar from '../components/NotificationSidebar'
import { NotificationProvider } from '../contexts/NotificationContext'

export default function TermsOfService() {
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-800 flex">
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <header className="bg-gray-800 border-b border-gray-600 px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-center">
              <Link href="/" className="flex items-center text-white hover:text-white transition-colors mr-6">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to ContextCleanse
              </Link>
              <div className="flex items-center">
                <img 
                  src="/ContextCleanse-no-padding-transparent-dark-mode.png" 
                  alt="ContextCleanse Logo" 
                  className="h-8 w-8 object-contain mr-3"
                />
                <h1 className="text-xl font-bold text-white">Terms of Service</h1>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="max-w-4xl mx-auto px-6 py-12">
            <div className="bg-gray-800 rounded-lg border border-gray-600 p-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-4">Terms of Service</h1>
                <p className="text-white">
                  <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
                </p>
                <p className="text-white mt-2">
                  <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-8 text-white">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                  <p className="leading-relaxed">
                    By accessing and using ContextCleanse (&ldquo;the Service&rdquo;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
                  <p className="leading-relaxed mb-4">
                    ContextCleanse is an AI-powered email classification service that helps users automatically categorize emails as spam or legitimate messages (ham). The service integrates with Gmail accounts through secure OAuth authentication and uses machine learning models to analyze email content.
                  </p>
                  <p className="leading-relaxed">
                    Key features include:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                    <li>Automated email classification using multiple ML models</li>
                    <li>User feedback system for continuous model improvement</li>
                    <li>Model comparison and performance analytics</li>
                    <li>Secure Gmail integration through OAuth 2.0</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Authentication</h2>
                  <p className="leading-relaxed mb-4">
                    To use ContextCleanse, you must authenticate using a supported third-party service (currently Google OAuth). By connecting your account, you grant us permission to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Access your email metadata and content for classification purposes</li>
                    <li>Store classification results and user feedback</li>
                    <li>Maintain session information for service functionality</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">4. Data Usage and Privacy</h2>
                  <p className="leading-relaxed mb-4">
                    Your privacy is important to us. Email data accessed through ContextCleanse is used solely for the purpose of email classification and service improvement. We do not:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Share your email content with third parties</li>
                    <li>Use your emails for advertising or marketing purposes</li>
                    <li>Store email content longer than necessary for service operation</li>
                    <li>Access emails beyond what&apos;s required for classification</li>
                  </ul>
                  <p className="leading-relaxed mt-4">
                    For detailed information about data handling, please review our <Link href="/privacy" className="text-white underline hover:no-underline">Privacy Policy</Link>.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
                  <p className="leading-relaxed mb-4">
                    You agree to use ContextCleanse only for lawful purposes and in accordance with these Terms. You must not:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Attempt to reverse engineer or compromise the service</li>
                    <li>Use the service to violate any applicable laws or regulations</li>
                    <li>Interfere with or disrupt the service or servers</li>
                    <li>Attempt to gain unauthorized access to other user accounts</li>
                    <li>Use automated systems to abuse the service or exceed rate limits</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">6. Service Availability</h2>
                  <p className="leading-relaxed">
                    While we strive to maintain high availability, ContextCleanse is provided &ldquo;as is&rdquo; without guarantees of uptime or performance. We reserve the right to modify, suspend, or discontinue the service at any time with or without notice.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
                  <p className="leading-relaxed">
                    ContextCleanse and its original content, features, and functionality are owned by the service providers and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
                  <p className="leading-relaxed">
                    In no event shall ContextCleanse, its directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
                  <p className="leading-relaxed">
                    We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms of Service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
                  <p className="leading-relaxed">
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
                  <p className="leading-relaxed">
                    If you have any questions about these Terms of Service, please contact us through the ContextCleanse application or our support channels.
                  </p>
                </section>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-600">
                <div className="flex items-center justify-between">
                  <Link 
                    href="/" 
                    className="flex items-center px-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-black transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to ContextCleanse
                  </Link>
                  <Link 
                    href="/privacy" 
                    className="px-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-black transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
        {/* Notification Sidebar */}
        <NotificationSidebar />
      </div>
    </NotificationProvider>
  )
}