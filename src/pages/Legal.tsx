import Footer from '../components/Footer'

// Placeholder. The privacy, terms and refund pages still need to be written
// before launch (see README, "Before launch").
const TITLES: Record<string, string> = { privacy: 'Privacy', terms: 'Terms', refunds: 'Refunds' }

export default function Legal({ page }: { page: string }) {
  return (
    <main>
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap">
          <a className="k o" href="/free">← Free Starter Kit</a>
          <h2>{TITLES[page] ?? 'Legal'}</h2>
          <p className="lede">This page is being written.</p>
        </div>
      </section>
      <Footer />
    </main>
  )
}
