import { createFileRoute } from '@tanstack/react-router'
import { Directory } from '@/components/marketplace/directory'
export const Route = createFileRoute('/services')({
  head: () => ({
    links: [
      {
        rel: 'canonical',
        href: 'https://qamivo-platform.netlify.app/services',
      },
    ],
    meta: [{ title: 'Find expertise | Qamivo' }],
  }),
  component: () => <Directory services />,
})
