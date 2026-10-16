import { useEffect } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'
import { COPYRIGHT_SECTIONS } from './copyrightPolicy'
import { LEGAL_EFFECTIVE, type LegalSection } from './legalOperator'
import { PRIVACY_SECTIONS } from './privacyPolicy'
import { REFUND_SECTIONS } from './refundPolicy'
import { TERMS_SECTIONS } from './termsOfUse'
import './legalPage.css'

type LegalPage = {
  title: string
  lede: string
  sections: LegalSection[]
}

const PAGES: Record<string, LegalPage> = {
  privacy: {
    title: 'Privacy',
    lede: 'What this site collects, why, who sees it, and how to ask us to change or delete it.',
    sections: PRIVACY_SECTIONS,
  },
  terms: {
    title: 'Terms',
    lede: 'How you may use this site, the free kit, and the $17 digital book.',
    sections: TERMS_SECTIONS,
  },
  refunds: {
    title: 'Refunds',
    lede: 'The book is a digital file. You get it as soon as payment goes through. All sales are final. A broken download will be replaced.',
    sections: REFUND_SECTIONS,
  },
  copyright: {
    title: 'Copyright',
    lede: 'Who owns the writing and files on this site, what you may do with them, and how to send a takedown notice.',
    sections: COPYRIGHT_SECTIONS,
  },
}

function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </section>
      ))}
    </>
  )
}

export default function Legal({ page }: { page: string }) {
  const spec = PAGES[page]

  useEffect(() => {
    document.title = `${spec?.title ?? 'Legal'} · I Call BS`
  }, [spec?.title])

  return (
    <main>
      <SiteHeader />
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <a className="k o" href="/">
            ← Home
          </a>
          <h2>{spec?.title ?? 'Legal'}</h2>
          {spec ? (
            <div className="legal-body">
              <p className="legal-meta">Effective {LEGAL_EFFECTIVE}</p>
              <p className="lede">{spec.lede}</p>
              <LegalSections sections={spec.sections} />
            </div>
          ) : (
            <p className="lede">This page is being written.</p>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}
