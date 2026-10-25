import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '@/components/marketplace/auth-form'
export const Route = createFileRoute('/register')({
  head: () => ({
    meta: [
      { title: 'Account access | Qamivo' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: () => <AuthForm mode="register" />,
})
