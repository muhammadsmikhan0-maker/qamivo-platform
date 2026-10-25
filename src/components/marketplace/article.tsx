import { PageIntro } from './layout'
export function Article({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <main className="wrap page-main">
      <PageIntro eyebrow={eyebrow} title={title}>
        {intro}
      </PageIntro>
      <article className="prose">{children}</article>
    </main>
  )
}
