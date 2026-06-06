import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, DM_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

const bebasNeue = Bebas_Neue({
  variable: '--font-bebas',
  weight: '400',
  subsets: ['latin'],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MeetDNA — Intelligence In Every Meeting',
  description:
    'Extract decisions. Store memory. Brief the future. MeetDNA is your AI meeting intelligence platform.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#060810',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${bebasNeue.variable} ${ibmPlexMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
