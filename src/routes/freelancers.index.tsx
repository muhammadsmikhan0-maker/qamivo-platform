import { createFileRoute } from '@tanstack/react-router'
import { Directory } from '@/components/marketplace/directory'
export const Route = createFileRoute('/freelancers/')({
  head: () => ({
    links: [
      {
        rel: 'canonical',
        href: 'https://qamivo-platform.netlify.app/freelancers',
      },
    ],
    meta: [{ title: 'Independent talent | Qamivo' }],
  }),
  component: Directory,
})
