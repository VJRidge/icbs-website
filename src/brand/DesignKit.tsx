import { useEffect } from 'react'
import BrandChrome from './BrandChrome'

const COLORS = [
  { name: 'Forest', hex: '#1A5340', role: 'Panels, footer, headings, book card' },
  { name: 'Green accent', hex: '#1C6B48', role: 'Photo placeholder and small green hits' },
  { name: 'Button yellow', hex: '#F3D13D', role: 'Primary buttons' },
  { name: 'Highlighter', hex: '#FFF475', role: 'Short phrases inside headlines' },
  { name: 'Orange', hex: '#F25C19', role: 'Small marks' },
  { name: 'Dark orange', hex: '#B53D0D', role: 'Labels on white' },
  { name: 'Ink', hex: '#151412', role: 'Body text' },
  { name: 'Paper', hex: '#FFFFFF', role: 'Page background' },
  { name: 'Surface', hex: '#F7F7F2', role: 'Cards' },
  { name: 'Divider', hex: '#D4D8D3', role: 'Rules and borders' },
]

export default function DesignKit() {
  useEffect(() => {
    document.title = 'Design kit · VettaJimale.Tech'
  }, [])

  return (
    <BrandChrome cta={{ label: 'Explore Resources', href: '/resources' }}>
      <section className="vj-sec">
        <div className="vj-wrap">
          <p className="vj-k">VettaJimale.Tech</p>
          <h1>Design kit</h1>
          <p className="lede">
            The choices for this preview. Forest is the middle green. The brighter green is an accent. Purple was tried and set aside.
          </p>
          <h2>Color</h2>
          <div className="vj-grid">
            {COLORS.map((color) => (
              <article className="vj-card" key={color.hex}>
                <div style={{ background: color.hex, height: 72, border: '1px solid var(--line)', marginBottom: 12 }} />
                <h3>{color.name}</h3>
                <p>{color.hex}</p>
                <p className="meta">{color.role}</p>
              </article>
            ))}
          </div>
          <h2>Type</h2>
          <p className="vj-display" style={{ fontSize: 48 }}>Anton for headlines</p>
          <p className="lede">Newsreader for sentences you actually read.</p>
          <p className="vj-k">IBM Plex Mono for labels</p>
          <h2>Buttons</h2>
          <div className="vj-actions">
            <a className="vj-btn" href="/products/i-call-bs">Explore the book</a>
            <a className="vj-btn ghost" href="/about">Meet VJ</a>
          </div>
          <h2>The book</h2>
          <p>The book sits in the first screen. The free kit stays available and does not block the book.</p>
        </div>
      </section>
    </BrandChrome>
  )
}
