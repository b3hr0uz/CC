import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '../components/providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ContextCleanse',
  description: 'Advanced email classification using machine learning models with comprehensive statistical analysis',
  keywords: 'email classification, machine learning, context cleanse, statistical analysis, FastAPI, NextJS',
  authors: [{ name: 'Development Team' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <SessionProvider>
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}