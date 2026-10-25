import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Check,
  Globe2,
  ShieldCheck,
  Layers,
  Code2,
  PenTool,
  ChartNoAxesCombined,
  Sparkles,
  Play,
  Terminal,
  CheckCheck,
} from 'lucide-react'
import { useState } from 'react'
import { categories } from '@/lib/catalog'
export const Route = createFileRoute('/')({
  head: () => ({
    links: [{ rel: 'canonical', href: 'https://qamivo-platform.netlify.app/' }],
  }),
  component: Home,
})
function Home() {
  const [query, setQuery] = useState('')
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" /> BUILT IN PAKISTAN. OPEN TO THE
              WORLD.
            </div>
            <h1>
              Great work starts
              <br />
              with the <span>right people.</span>
            </h1>
            <p>
              Connect with independent talent. Bring your next big idea to life.
              <br className="desktop" /> Build something that goes beyond
              borders.
            </p>
            <form className="hero-search" action="/services">
              <Search size={21} />
              <input
                aria-label="Search professional services"
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you need help with?"
              />
              <button type="submit">
                Find talent <ArrowRight size={17} />
              </button>
            </form>
            <div className="popular">
              <span>Popular:</span>
              {['Web development', 'Brand identity', 'Digital marketing'].map(
                (x) => (
                  <a key={x} href={'/services?q=' + encodeURIComponent(x)}>
                    {x}
                  </a>
                ),
              )}
            </div>
            <div className="hero-values">
              <span>
                <Check size={15} /> Free to join
              </span>
              <span>
                <Check size={15} /> Clear project scope
              </span>
              <span>
                <Check size={15} /> Global opportunities
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustration of connected global opportunities"
          >
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="globe">
              <svg viewBox="0 0 400 400" fill="none" aria-hidden="true">
                <circle cx="200" cy="200" r="170" />
                <ellipse cx="200" cy="200" rx="90" ry="170" />
                <ellipse cx="200" cy="200" rx="145" ry="170" />
                <path d="M30 200h340M48 125h304M48 275h304M95 65h210M95 335h210M200 30v340" />
                <path
                  className="land"
                  d="m100 98 35-19 35 9 17 37-30 22-7 45-32 1-7-32-29-24Zm65 122 39 10 19 41-22 60-20-18-5-43-24-24Zm58-116 33-30 40 25 21 35-37 9-5 35-30 11-12-33-31-14Zm34 99 40-4 19 38-23 32-30-12-17-31Zm48 89 27 7 6 19-36 5-14-15Z"
                />
              </svg>
              <span className="globe-node n1" />
              <span className="globe-node n2" />
              <span className="globe-node n3" />
            </div>
            <div className="float-note opportunity">
              <span className="note-icon">
                <Globe2 size={21} />
              </span>
              <div>
                <small>NO BORDERS. JUST POSSIBILITIES.</small>
                <strong>Your skills. A world of opportunity.</strong>
              </div>
            </div>
            <div className="work-card">
              <div className="work-top">
                <span className="code-icon">
                  <Code2 size={22} />
                </span>
                <span className="mini-label">THE NEXT BIG THING</span>
                <ArrowUpRight size={17} />
              </div>
              <h3>
                From an idea
                <br />
                to something real.
              </h3>
              <div className="work-tags">
                <span>Design</span>
                <span>Development</span>
                <span>Growth</span>
              </div>
              <div className="work-bottom">
                <span className="tiny-squares">
                  <i />
                  <i />
                  <i />
                </span>
                <span>Made possible, together.</span>
              </div>
            </div>
            <div className="float-note made">
              <span className="green-check">
                <CheckCheck size={18} />
              </span>{' '}
              Independent talent. Shared ambition.
            </div>
            <span className="art-coordinate">
              24.8607° N · 67.0011° E <span>↗ WORLDWIDE</span>
            </span>
          </div>
        </div>
      </section>
      <section className="principles">
        <div className="wrap">
          <span>A better foundation for working together</span>
          <p>
            <ShieldCheck /> Trust by design
          </p>
          <p>
            <Globe2 /> Opportunity without borders
          </p>
          <p>
            <Layers /> Clear scope. Better collaboration.
          </p>
        </div>
      </section>
      <section className="section wrap">
        <div className="section-heading">
          <div>
            <div className="eyebrow blue">FIND YOUR NEXT POSSIBILITY</div>
            <h2>Big ideas. The right expertise.</h2>
            <p>Explore the skills that move your business forward.</p>
          </div>
          <a className="text-link" href="/categories">
            Explore all categories <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="category-grid">
          {categories.slice(0, 4).map((c, i) => {
            const Icon = [Code2, PenTool, ChartNoAxesCombined, Sparkles][i]
            return (
              <a
                className={'category-card cat-' + i}
                href={'/services?category=' + c.slug}
                key={c.slug}
              >
                <div className="category-art">
                  <Icon size={48} strokeWidth={1.1} />
                  <div className="art-lines" />
                  {i === 0 ? (
                    <span className="code-sample">
                      &lt;build something
                      <br />
                      &nbsp; extraordinary /&gt;
                    </span>
                  ) : i === 1 ? (
                    <span className="type-sample">
                      Aa<span>↗</span>
                    </span>
                  ) : i === 2 ? (
                    <div className="chart-bars">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  ) : (
                    <span className="ai-sample">✧</span>
                  )}
                </div>
                <div className="category-info">
                  <div>
                    <h3>{c.name}</h3>
                    <p>{c.short}</p>
                  </div>
                  <ArrowUpRight size={20} />
                </div>
              </a>
            )
          })}
        </div>
      </section>
      <section className="path-section wrap">
        <div className="path-copy">
          <div className="eyebrow blue">GOOD WORK IS A TWO-WAY STREET</div>
          <h2>
            Your next chapter
            <br />
            starts here.
          </h2>
          <p>
            Whether you have a vision or the skills to bring one to life,
            there’s a place for you at Qamivo.
          </p>
          <a className="text-link" href="/how-it-works">
            See how it works <ArrowRight size={18} />
          </a>
        </div>
        <a className="path-card client-path" href="/jobs/new">
          <span className="path-icon">
            <Layers size={25} />
          </span>
          <span className="mini-label">FOR CLIENTS</span>
          <h3>
            Bring your vision.
            <br />
            Find your people.
          </h3>
          <p>
            Outline your project and connect with talent who understand your
            goals.
          </p>
          <span className="path-action">
            Post a project <ArrowUpRight size={20} />
          </span>
        </a>
        <a className="path-card talent-path" href="/account">
          <span className="path-icon">
            <Terminal size={25} />
          </span>
          <span className="mini-label">FOR FREELANCERS</span>
          <h3>
            Do what you love.
            <br />
            Go further.
          </h3>
          <p>
            Create your professional profile and discover work that fits your
            skills.
          </p>
          <span className="path-action">
            Start your journey <ArrowUpRight size={20} />
          </span>
        </a>
      </section>
      <section className="early-banner wrap">
        <span className="early-icon">
          <Play size={21} />
        </span>
        <div>
          <h3>A new marketplace. A shared beginning.</h3>
          <p>
            We’re opening the foundation of Qamivo. Create a profile, explore
            opportunities and help shape what comes next.
          </p>
        </div>
        <a href="/about">
          Meet Qamivo <ArrowUpRight size={18} />
        </a>
      </section>
    </>
  )
}
