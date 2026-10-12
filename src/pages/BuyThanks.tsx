import Footer from '../components/Footer'
import { BOOK_PRICE, BOOK_SALES_PATH } from '../lib/bookOffer'

/** Success return from Stripe Checkout. Fulfillment is webhook-driven, not this page. */
export default function BuyThanks() {
  return (
    <main>
      <div className="green">
        <div className="wrap">
          <div className="nav">
            <span className="k tag">I Call BS</span>
            <span className="k">Digital PDF · {BOOK_PRICE}</span>
          </div>
          <div className="ty">
            <h1 className="an">
              Payment <span className="y">received.</span>
            </h1>
            <p className="sub">
              Your book PDF is on its way to the email you used at checkout. Check inbox (and spam) in a few minutes.
            </p>
            <p className="inbox">
              This page is only a receipt confirmation. Delivery is completed by our payment webhook so you still get
              the file even if you close the browser early.
            </p>
            <p className="inbox" style={{ marginTop: '1.25rem' }}>
              <a href={BOOK_SALES_PATH}>Back to the book page</a>
              {' · '}
              <a href="/resources">Resources</a>
              {' · '}
              <a href="/contact">Contact</a>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
