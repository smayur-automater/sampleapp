import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CoParent',
  description: 'Shared expense tracker for your kids',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
