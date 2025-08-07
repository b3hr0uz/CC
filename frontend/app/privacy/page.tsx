import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck } from 'lucide-react'
import NotificationSidebar from '../components/NotificationSidebar'
import { NotificationProvider } from '../contexts/NotificationContext'

// Static generation configuration for optimal performance
export const dynamic = 'force-static'
export const revalidate = 86400 // Revalidate once per day

// Metadata for SEO and performance 
export const metadata = {
  title: 'Privacy Policy - ContextCleanse',
  description: 'ContextCleanse Privacy Policy - Learn how we protect and handle your data with our machine learning email classification service.',
  keywords: 'privacy policy, data protection, email security, machine learning, ContextCleanse',
  robots: 'index, follow',
  alternates: {
    canonical: '/privacy'
  }
}

// Precompiled Client Wrapper Component
import dynamicImport from 'next/dynamic'

const ClientPrivacyWrapper = dynamicImport(() => import('./PrivacyClient'), {
  ssr: true,
  loading: () => (
    <div className="min-h-screen bg-gray-800 flex items-center justify-center">
      <div className="text-white">Loading Privacy Policy...</div>
      </div>
  )
})

export default function PrivacyPolicy() {
  return <ClientPrivacyWrapper />
}