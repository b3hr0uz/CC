'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck } from 'lucide-react'
import NotificationSidebar from '../components/NotificationSidebar'
import { NotificationProvider } from '../contexts/NotificationContext'

export default function PrivacyPolicy() {
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
                <Image 
                  src="/ContextCleanse-no-padding-transparent-dark-mode.png" 
                  alt="ContextCleanse Logo"
                  width={32}
                  height={32} 
                  className="h-8 w-8 object-contain mr-3"
                />
                <h1 className="text-xl font-bold text-white">Privacy Policy</h1>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="max-w-4xl mx-auto px-6 py-12">
            <div className="bg-gray-800 rounded-lg border border-gray-600 p-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-4">Privacy Policy</h1>
                <p className="text-white">
                  <strong>Effective Date:</strong> <span suppressHydrationWarning={true}>{new Date().toLocaleDateString()}</span>
                </p>
                <p className="text-white mt-2">
                  <strong>Last Updated:</strong> <span suppressHydrationWarning={true}>{new Date().toLocaleDateString()}</span>
                </p>
                <div className="mt-6 p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <div className="flex items-center">
                    <Shield className="h-6 w-6 text-white mr-3" />
                    <p className="text-white font-medium">
                      Your privacy is fundamental to how we operate ContextCleanse. This policy explains how we collect, use, and protect your information.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-8 text-white">
                <section>
                  <div className="flex items-center mb-4">
                    <Database className="h-6 w-6 text-white mr-3" />
                    <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
                  </div>
                  
                  <h3 className="text-lg font-medium mb-3">Authentication Information</h3>
                  <p className="leading-relaxed mb-4">
                    When you sign in to ContextCleanse using Google OAuth, we collect:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mb-6">
                    <li>Your email address</li>
                    <li>Basic profile information (name, profile picture)</li>
                    <li>OAuth tokens for secure API access</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">Email Data</h3>
                  <p className="leading-relaxed mb-4">
                    To provide email classification services, we access:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mb-6">
                    <li>Email headers (sender, subject, timestamp)</li>
                    <li>Email content for classification analysis</li>
                    <li>Email metadata (read status, labels)</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">Usage Data</h3>
                  <p className="leading-relaxed mb-4">
                    We collect information about how you use our service:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Classification accuracy feedback</li>
                    <li>Model interaction preferences</li>
                    <li>Service usage statistics</li>
                    <li>Technical logs for debugging and improvement</li>
                  </ul>
                </section>

                <section>
                  <div className="flex items-center mb-4">
                    <Eye className="h-6 w-6 text-white mr-3" />
                    <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
                  </div>
                  
                  <h3 className="text-lg font-medium mb-3">Service Delivery</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4 mb-6">
                    <li>Classify your emails as spam or legitimate messages</li>
                    <li>Provide personalized classification results</li>
                    <li>Maintain your service preferences and settings</li>
                    <li>Authenticate and authorize your access</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">Service Improvement</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4 mb-6">
                    <li>Train and improve our machine learning models</li>
                    <li>Analyze usage patterns to enhance functionality</li>
                    <li>Provide better classification accuracy over time</li>
                    <li>Debug issues and optimize performance</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">What We Don&apos;t Do</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>We don&apos;t sell your data</strong> to third parties</li>
                    <li><strong>We don&apos;t use your emails</strong> for advertising</li>
                    <li><strong>We don&apos;t share personal information</strong> without consent</li>
                    <li><strong>We don&apos;t access more data</strong> than necessary for classification</li>
                  </ul>
                </section>

                <section>
                  <div className="flex items-center mb-4">
                    <Lock className="h-6 w-6 text-white mr-3" />
                    <h2 className="text-2xl font-semibold">3. Data Security and Storage</h2>
                  </div>

                  <h3 className="text-lg font-medium mb-3">Security Measures</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4 mb-6">
                    <li>OAuth 2.0 secure authentication</li>
                    <li>Encrypted data transmission (HTTPS/TLS)</li>
                    <li>Secure data storage with access controls</li>
                    <li>Regular security audits and updates</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">Data Retention</h3>
                  <p className="leading-relaxed mb-4">
                    We retain your data only as long as necessary:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Email content:</strong> Processed in real-time, not permanently stored</li>
                    <li><strong>Classification results:</strong> Stored to improve your experience</li>
                    <li><strong>User feedback:</strong> Retained to enhance model accuracy</li>
                    <li><strong>Account information:</strong> Maintained while your account is active</li>
                  </ul>
                </section>

                <section>
                  <div className="flex items-center mb-4">
                    <UserCheck className="h-6 w-6 text-white mr-3" />
                    <h2 className="text-2xl font-semibold">4. Your Rights and Choices</h2>
                  </div>

                  <h3 className="text-lg font-medium mb-3">Access and Control</h3>
                  <p className="leading-relaxed mb-4">You have the right to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mb-6">
                    <li>Access your personal information</li>
                    <li>Correct inaccurate data</li>
                    <li>Delete your account and associated data</li>
                    <li>Withdraw consent for data processing</li>
                    <li>Export your data in a portable format</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">Opt-Out Options</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Disconnect your Google account at any time</li>
                    <li>Disable email classification features</li>
                    <li>Opt out of model training data usage</li>
                    <li>Request deletion of all stored data</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
                  
                  <h3 className="text-lg font-medium mb-3">Google Integration</h3>
                  <p className="leading-relaxed mb-4">
                    ContextCleanse integrates with Google services through official APIs:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mb-6">
                    <li>Google OAuth for secure authentication</li>
                    <li>Gmail API for email access (read-only)</li>
                    <li>Google&apos;s privacy policies also apply to this integration</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">Future Integrations</h3>
                  <p className="leading-relaxed">
                    We may add support for additional email providers (Apple, Microsoft) in the future. Each integration will follow the same privacy principles outlined in this policy.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">6. Data Sharing and Disclosure</h2>
                  <p className="leading-relaxed mb-4">
                    We do not sell, trade, or otherwise transfer your personal information to third parties. We may disclose information only in these limited circumstances:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>When required by law or legal process</li>
                    <li>To protect our rights, property, or safety</li>
                    <li>To prevent fraud or security threats</li>
                    <li>With your explicit consent</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">7. International Data Transfers</h2>
                  <p className="leading-relaxed">
                    Your information may be transferred to and processed in countries other than your own. We ensure that any international transfers comply with applicable data protection laws and include appropriate safeguards.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">8. Children&apos;s Privacy</h2>
                  <p className="leading-relaxed">
                    ContextCleanse is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will take steps to delete the information promptly.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
                  <p className="leading-relaxed">
                    We may update this Privacy Policy periodically. We will notify you of any material changes by posting the new policy on this page and updating the &ldquo;Last Updated&rdquo; date. Your continued use of the service after such changes constitutes acceptance of the updated policy.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
                  <p className="leading-relaxed mb-4">
                    If you have questions about this Privacy Policy or how we handle your data, please contact us:
                  </p>
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                    <p className="text-white">
                      <strong>Email:</strong> b3h@me.com<br />
                      <strong>Support:</strong> Through email with developers<br />
                      <strong>Response Time:</strong> We aim to respond within 48 hours
                    </p>
                  </div>
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
                    href="/terms" 
                    className="px-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-black transition-colors"
                  >
                    Terms of Service
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