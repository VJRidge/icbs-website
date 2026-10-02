import SignupForm from '../components/SignupForm'
import Footer from '../components/Footer'

// All wording on this page comes from the Free Starter Kit.
const CONTENTS: [string, string, string][] = [
  ['01', 'Myth vs Reality', 'Part 01'],
  ['02', 'AI Is Not Smarter Than You', 'Part 02'],
  ['03', 'Three Lessons from the Receipts', 'Part 03'],
  ['04', 'The Literacy Gate', 'Part 04'],
  ['05', 'The Toolkit', 'Part 05'],
  ['—', 'Where to Go from Here', 'Next step'],
  ['—', 'The Pocket Glossary', 'Glossary'],
  ['—', 'Proof Your Work', 'Checklist'],
  ['—', 'The Smoke Test', 'Checklist'],
  ['—', 'Before You Ship', 'Checklist'],
]

const RECEIPTS: [string, string][] = [
  ['221', 'Chat sessions'],
  ['3,302', 'Prompts I typed'],
  ['16,612', 'File edits by the AI'],
  ['4,338', 'Terminal commands'],
]

export default function Free() {
  return (
    <main>
      <div className="green">
        <div className="wrap">
          <div className="nav">
            <span className="k tag">Free Starter Kit</span>
            <span className="k">Practical. Honest. Receipts-driven.</span>
          </div>
          <div className="hero">
            <div className="cov">
              <img src="/img/kit-cover.png" alt="Cover of the I Call BS Free Starter Kit" width={640} height={828} />
            </div>
            <div>
              <h1 className="an">
                The <span className="y">honest</span> version of “build an app with AI.”
              </h1>
              <p className="sub">
                No fairy tales. No thirty-minute miracles. The myth-busting, the mindset, and just enough of the toolkit to prove it’s real.
              </p>
              <SignupForm id="top" />
            </div>
          </div>
          <div className="strip">
            {RECEIPTS.map(([n, label]) => (
              <div key={label}>
                <b>{n}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="sec cream">
        <div className="wrap">
          <div className="k o">Inside the kit</div>
          <h2>What this free kit is</h2>
          <p className="lede">
            The myth-busting, the mindset, and just enough of the toolkit to prove it’s real.{' '}
            <mark>Everything here is yours to copy, edit, and keep.</mark>
          </p>
          <ul className="toc">
            {CONTENTS.map(([n, title, kind]) => (
              <li key={title}>
                <b>{n}</b>
                <span>{title}</span>
                <i>{kind}</i>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sec white">
        <div className="wrap">
          <div className="k o center">Look inside</div>
          <h2 className="center">Real pages from the kit.</h2>
          <div className="pv">
            <img src="/img/preview-receipts.jpg" alt="Kit page: My Receipts" loading="lazy" />
            <img src="/img/preview-gap.jpg" alt="Kit page: That’s not a knowledge gap. That’s an experience gap." loading="lazy" />
            <img src="/img/preview-smoke.jpg" alt="Kit page: The Smoke Test" loading="lazy" />
          </div>
          <div className="cap">My receipts · Not a knowledge gap · The smoke test</div>
        </div>
      </section>

      <section className="sec green">
        <div className="wrap close">
          <h2>
            You bring the depth. It brings the breadth. <span className="y">Neither one ships alone.</span>
          </h2>
          <div>
            <div className="k">Get the free starter kit</div>
            <SignupForm id="bottom" />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
