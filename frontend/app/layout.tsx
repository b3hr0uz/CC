import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '../components/providers/SessionProvider'
import { NotificationProvider } from './contexts/NotificationContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { Toaster } from 'react-hot-toast'
import PagePreloader from './components/PagePreloader'
import ServerWarmup from './components/ServerWarmup'

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
        <NotificationProvider>
          <SessionProvider>
            <SidebarProvider>
              <main>{children}</main>
              <PagePreloader />
              <ServerWarmup />
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
            </SidebarProvider>
          </SessionProvider>
        </NotificationProvider>
      </body>
    </html>
  )
}