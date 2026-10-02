import { useState } from 'react'
import Footer from '../components/Footer'

const KIT_PDF = '/downloads/I-Call-BS-Free-Starter-Kit.pdf'
// Set this to the Stripe Checkout link (or the sales page) once it exists.
const BOOK_URL = '/'

// Wording from the kit's "Where to Go from Here" page.
const INCLUDES = [
  'All thirteen chapters — from the myths and the literacy gate to the daily prompting process, the proof gates, and life after launch.',
  'The Toolkit — smoke test, Before I Accept “Done,” pre-flight, sacred files, the BETA tester and pre-test-audience checklists, and the full “Proof Your Work” list.',
  'Three glossaries, the full prompt swipe file, and five add-ons.',
]

export default function FreeThanks() {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${window.location.origin}/free`
  const shareText = 'The honest version of “build an app with AI.” Free starter kit:'

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard can be blocked; the link is still visible in the address bar */
    }
  }

  return (
    <main>
      <div className="green">
        <div className="wrap">
          <div className="nav">
            <span className="k tag">Free Starter Kit</span>
            <span className="k">Practical. Honest. Receipts-driven.</span>
          </div>
          <div className="ty">
            <h1 className="an">
              Your kit is <span className="y">on its way.</span>
            </h1>
            <p className="sub">It’s also right here, so you don’t have to wait for the email.</p>
            <a className="btn" href={KIT_PDF} download>
              Download the free kit
            </a>
            <p className="inbox">
              Check your inbox for an email from V. Jimale Ridgeway. If it’s not there in a few minutes, look in spam or promotions and mark it as “not spam.”
            </p>
          </div>
        </div>
      </div>

      <section className="sec cream">
        <div className="wrap offer">
          <img src="/img/book-cover.png" alt="Cover of I Call BS: AI Vibe Coding Myths Dispelled" loading="lazy" />
          <div>
            <div className="k o">Where to go from here</div>
            <h2>The full edition is where the how lives.</h2>
            <ul>
              {INCLUDES.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <a className="btn" href={BOOK_URL}>
              Get the full guide — $17
            </a>
          </div>
        </div>
      </section>

      <section className="sec white">
        <div className="wrap center">
          <div className="k o">Share the kit</div>
          <h2>Know someone building with AI?</h2>
          <div className="share">
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
              Share on X
            </a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
              Share on LinkedIn
            </a>
            <button type="button" onClick={copy}>
              {copied ? 'Link copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
