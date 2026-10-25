import { createFileRoute } from '@tanstack/react-router'
import { categories } from '@/lib/catalog'
import { PageIntro } from '@/components/marketplace/layout'
import { ArrowUpRight } from 'lucide-react'
export const Route = createFileRoute('/categories')({
  head: () => ({
    links: [
      {
        rel: 'canonical',
        href: 'https://qamivo-platform.netlify.app/categories',
      },
    ],
    meta: [{ title: 'Professional categories | Qamivo' }],
  }),
  component: () => (
    <main className="wrap page-main">
      <PageIntro
        eyebrow="A WORLD OF EXPERTISE"
        title="Find your field of possibility."
      >
        Start with a category, then explore the professionals who can help.
      </PageIntro>
      <div className="cards-grid">
        {categories.map((c) => (
          <a
            className="record"
            key={c.slug}
            href={'/services?category=' + c.slug}
          >
            <h3>
              {c.name} <ArrowUpRight size={17} style={{ display: 'inline' }} />
            </h3>
            <p>{c.description}</p>
            <span className="text-link">Explore talent →</span>
          </a>
        ))}
      </div>
    </main>
  ),
})
