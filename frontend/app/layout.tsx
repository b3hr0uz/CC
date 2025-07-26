import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
      <body className={inter.className}>
        <main>{children}</main>
      </body>
    </html>
  )
}