import { useEffect } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'
import { FAQ_ITEMS } from '../lib/site/faqItems'
import './faqPage.css'

function rowNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export default function FaqPage() {
  useEffect(() => {
    document.title = 'FAQ · I Call BS'
  }, [])

  return (
    <main>
      <SiteHeader />
      <section className="sec cream faq-page">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <p className="k o">Starter kit and book</p>
          <h2>Frequently asked questions</h2>
          <p className="lede">
            Straight answers about the free kit, the complete book, downloads, and email. Open a
            question to read it.
          </p>
          <ul className="faq-list">
            {FAQ_ITEMS.map((item, index) => (
              <li key={item.id} className="faq-item">
                <details>
                  <summary>
                    <span className="faq-num">{rowNumber(index)}</span>
                    <span className="faq-q">{item.question}</span>
                    <span className="faq-toggle" aria-hidden />
                  </summary>
                  <div className="faq-a">
                    <p>{item.answer}</p>
                    {item.links?.length ? (
                      <p>
                        {item.links.map((link, i) => (
                          <span key={link.href}>
                            {i > 0 ? ' · ' : null}
                            <a href={link.href}>{link.label}</a>
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Footer />
    </main>
  )
}
