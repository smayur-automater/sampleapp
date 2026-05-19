import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KidExpense',
  description: 'Shared Expenses. Shared Responsibility.',
  icons: {
    icon:  [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'KidExpense',
    description: 'Shared Expenses. Shared Responsibility.',
    images: ['/logo.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
