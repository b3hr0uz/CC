import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '../components/providers/SessionProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ContextCleanse',
  description: 'Advanced email classification using machine learning models with comprehensive statistical analysis',
  keywords: 'email classification, machine learning, context cleanse, statistical analysis, FastAPI, NextJS',
  authors: [{ name: 'Development Team' }],
  icons: {
    icon: '/ContextCleanse-no-padding-transparent-dark-mode.png',
    apple: '/ContextCleanse-no-padding-transparent-dark-mode.png',
  },
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
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}