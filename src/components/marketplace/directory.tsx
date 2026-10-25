import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { categories } from '@/lib/catalog'
import { useApi, type Profile } from '@/lib/marketplace'
import { PageIntro } from './layout'
import { Feedback, Empty } from './common'
export function Directory({ services = false }: { services?: boolean }) {
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState(''),
    [search, setSearch] = useState('')
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const q = p.get('q') || '',
      c = p.get('category') || ''
    setQuery(q)
    setCategory(c)
    setSearch(
      'q=' + encodeURIComponent(q) + '&category=' + encodeURIComponent(c),
    )
  }, [])
  const result = useApi<Profile[]>('profiles?' + search)
  return (
    <main className="wrap page-main">
      <PageIntro
        eyebrow={
          services
            ? 'EXPERTISE FOR YOUR NEXT IDEA'
            : 'INDEPENDENT TALENT. GLOBAL AMBITION.'
        }
        title={
          services
            ? 'Find the right expertise.'
            : 'Meet your next collaborator.'
        }
      >
        Discover public professional profiles by skill and category. Service
        packages and direct ordering are planned; this release connects you
        through project proposals.
      </PageIntro>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          const s =
            'q=' +
            encodeURIComponent(query) +
            '&category=' +
            encodeURIComponent(category)
          setSearch(s)
          window.history.replaceState(null, '', '?' + s)
        }}
      >
        <label className="sr-only" htmlFor="directory-query">
          Search skills or talent
        </label>
        <input
          id="directory-query"
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills, names or expertise"
        />
        <label className="sr-only" htmlFor="directory-category">
          Category
        </label>
        <select
          id="directory-category"
          className="field"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="button">Search talent</button>
      </form>
      <Feedback {...result} />
      {result.data &&
        !result.loading &&
        !result.error &&
        (result.data.length ? (
          <div className="cards-grid">
            {result.data.map((p) => (
              <a
                className="record"
                key={p.username}
                href={'/freelancers/' + p.username}
              >
                <span className="pill">
                  {categories.find((c) => c.slug === p.category)?.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  {p.avatarKey ? (
                    <img src={`/api/uploads/${p.avatarKey}`} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', objectPosition: p.avatarPosition || 'center', flexShrink: 0 }} />
                  ) : (
                    <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#e7eef5', color: '#34516b', fontWeight: 700, fontSize: 22, flexShrink: 0 }}>{p.name.slice(0, 1).toUpperCase()}</span>
                  )}
                  <div style={{ minWidth: 0 }}>
                <h3>
                  {p.name}{' '}
                  <ArrowUpRight size={16} style={{ display: 'inline' }} />
                </h3>
                <strong>{p.headline}</strong>
                <p>
                  {p.bio.slice(0, 180)}
                  {p.bio.length > 180 ? '…' : ''}
                </p>
                <div className="meta">
                  {p.country} · {p.skills}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <Empty
            title={
              search ? 'No matching profiles yet' : 'Be part of the beginning'
            }
            href="/account"
            label="Create your profile"
          >
            This is a new marketplace. No matching public profiles are available
            yet. Try another search, or introduce your own expertise.
          </Empty>
        ))}
    </main>
  )
}
