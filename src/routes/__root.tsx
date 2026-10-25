import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'

import '../styles.css'
import { AuthCallback } from '@/components/marketplace/auth'
import { SiteHeader, SiteFooter } from '@/components/marketplace/layout'

const siteName = 'Qamivo — Global Skills. Real Opportunities.'
const siteDescription =
  'Connect independent talent with meaningful projects. Qamivo brings Pakistani skills and international opportunities together through a growing professional marketplace.'

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/brand/qamivo-icon.svg' },
    ],
    meta: [
      { name: 'robots', content: 'noindex,follow' },
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider>
          <SiteHeader />
          <AuthCallback />
          {children}
          <SiteFooter />
        </TooltipProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
