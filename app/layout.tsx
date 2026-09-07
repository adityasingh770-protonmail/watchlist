import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'Frame — Your watchlist', description: 'A calmer way to decide what to watch next.' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html> }
