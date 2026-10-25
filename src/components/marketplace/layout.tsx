import { useState } from 'react'
import { ArrowUpRight, Menu, X, Globe2 } from 'lucide-react'
export function Logo() {
  return (
    <a className="logo" href="/" aria-label="Qamivo home">
      <img src="/brand/qamivo-icon.svg" width="35" height="35" alt="" />
      qamivo<span className="logo-period">.</span>
    </a>
  )
}
export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Logo />
        <nav
          className={open ? 'main-nav open' : 'main-nav'}
          aria-label="Main navigation"
        >
          <a href="/services">
            Find talent <span>⌄</span>
          </a>
          <a href="/jobs">
            Find work <span>⌄</span>
          </a>
          <a href="/how-it-works">How it works</a>
          <a href="/about">Why Qamivo</a>
        </nav>
        <div className="header-actions">
          <a className="login-link" href="/login">
            Log in
          </a>
          <a className="button small" href="/register">
            Get started <ArrowUpRight size={16} />
          </a>
          <button
            className="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-top">
        <div>
          <Logo />
          <p>Global Skills. Real Opportunities.</p>
          <span>Built in Pakistan. Connected to the world.</span>
        </div>
        <div>
          <h4>Discover</h4>
          <a href="/services">Professional services</a>
          <a href="/freelancers">Independent talent</a>
          <a href="/jobs">Project opportunities</a>
        </div>
        <div>
          <h4>Qamivo</h4>
          <a href="/about">Our beginning</a>
          <a href="/how-it-works">How it works</a>
          <a href="/help">Help & safety</a>
        </div>
        <div>
          <h4>Get started</h4>
          <a href="/jobs/new">Post a project</a>
          <a href="/account">Create your profile</a>
          <a href="/roadmap">Platform roadmap</a>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>
          © {new Date().getFullYear()} Qamivo. Provisional brand · Early access
        </span>
        <div>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <span>
            <Globe2 size={14} /> English · International
          </span>
        </div>
      </div>
    </footer>
  )
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="page-intro">
      <div className="eyebrow blue">{eyebrow}</div>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  )
}
