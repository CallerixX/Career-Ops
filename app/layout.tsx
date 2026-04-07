import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/components/query-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Career-Ops — Профессиональная OS для поиска работы',
  description: 'Автоматизация поиска работы: AI-скоринг вакансий, ATS-оптимизация резюме, трекинг откликов.',
  keywords: ['поиск работы', 'резюме', 'AI', 'карьера', 'вакансии'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}

