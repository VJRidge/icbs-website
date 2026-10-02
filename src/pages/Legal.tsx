import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'

const TITLES: Record<string, string> = { privacy: 'Privacy', terms: 'Terms', refunds: 'Refunds' }

export default function Legal({ page }: { page: string }) {
  return (
    <main>
      <SiteHeader />
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <a className="k o" href="/">← The book</a>
          <h2>{TITLES[page] ?? 'Legal'}</h2>
          {page === 'refunds' ? (
            <>
              <p className="lede">The book is a digital file. You get it as soon as payment goes through.</p>
              <p className="lede">All sales are final. There are no refunds.</p>
              <p className="lede">The starter kit is free, so there is nothing to refund.</p>
            </>
          ) : (
            <p className="lede">This page is being written.</p>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}
