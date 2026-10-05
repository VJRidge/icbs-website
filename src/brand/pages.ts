import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { publishedKitCompareData } from './publishedKitCompare'

export type BrandPageId =
  | 'home'
  | 'resources'
  | 'about'
  | 'contact'
  | 'products'
  | 'kit'
  | 'thanks'
  | 'sample'
  | 'topicAi'
  | 'topicCreative'
  | 'topicWork'
  | 'book'

export type BrandPageDoc = {
  title: string
  seo: string
  cta: { label: string; href: string }
  blocks: BlogBlock[]
}

function block(id: string, type: string, data: Record<string, unknown>): BlogBlock {
  return { id, type, data }
}

const book = {
  label: 'My first book',
  title: 'I Call BS: AI Vibe Coding Myths Dispelled',
  text: 'A practical guide for building real apps with Claude Code and Cursor. Digital PDF. $17.',
  price: '$17',
  coverUrl: '/img/book-cover.png',
  coverAlt: 'Cover of I Call BS: AI Vibe Coding Myths Dispelled',
  primaryLabel: 'Explore the book',
  primaryHref: '/products/i-call-bs',
  secondaryLabel: 'Get the free kit',
  secondaryHref: '/free-kit',
  note: '',
}

/** Static book section used when the published book document cannot be loaded. */
export const staticBookBlock = block('static-book', 'brand_product', { ...book })

/** Short summary. The expandable table is the existing published comparison, counts unchanged. */
const shortCompare = {
  heading: 'Start free. Go deeper when you want the how.',
  kitHeading: 'Free kit',
  bookHeading: 'Complete book',
  rows: [
    { label: 'Chapters', kit: 'Previews from 3 chapters', book: '13 complete chapters' },
    { label: 'Prompts', kit: '6 copy-and-paste prompts', book: '15 prompts' },
    { label: 'Lessons', kit: '3 selected lessons', book: '10 selected lessons' },
    { label: 'Reference', kit: 'Pocket glossary', book: 'Expanded reference' },
    { label: 'Price', kit: 'Free', book: '$17 digital PDF' },
  ],
}

function fullCompare(id: string, kitHref: string, bookHref: string): BlogBlock {
  const data = structuredClone(publishedKitCompareData)
  const columns = Array.isArray(data.columns)
    ? data.columns.map((col) => (col && typeof col === 'object' ? { ...(col as Record<string, unknown>) } : col))
    : []
  if (columns[0] && typeof columns[0] === 'object') (columns[0] as Record<string, unknown>).ctaHref = kitHref
  if (columns[1] && typeof columns[1] === 'object') (columns[1] as Record<string, unknown>).ctaHref = bookHref
  const legend = typeof data.lede === 'string' ? data.lede : ''
  return block(id, 'kit_contents', {
    ...data,
    columns,
    lede: `${legend} Row counts are the current table, not regrouped.`.trim(),
  })
}

const pagePreviews = [
  { title: 'The receipts', text: '', href: '/img/preview-receipts.jpg', meta: 'Kit page: My Receipts' },
  { title: 'The experience gap', text: '', href: '/img/preview-gap.jpg', meta: 'Kit page: the experience gap' },
  { title: 'The smoke test', text: '', href: '/img/preview-smoke.jpg', meta: 'Kit page: The Smoke Test' },
]

const realPost = {
  title: 'AI is not smarter than you',
  text: 'The gap is experience, not intelligence.',
  meta: 'Article',
  href: '/blog/ai-is-not-smarter-than-you-iecg',
  format: 'Article',
  topic: 'AI & Technology',
  sample: false,
  featured: true,
}

export const brandPages: Record<BrandPageId, BrandPageDoc> = {
  home: {
    title: 'VettaJimale.Tech',
    seo: 'VettaJimale.Tech',
    cta: { label: 'Explore Resources', href: '/resources' },
    blocks: [
      block('home-hero', 'brand_hero', {
        eyebrow: 'VettaJimale.Tech',
        headline: 'Tech is moving. Let’s make sense of it.',
        highlight: 'make sense of it',
        statement:
          'I’m VJ — a writer, marketer, creator, and hands-on AI builder. I explore technology, test ideas, and share what I learn so you can put it to work.',
        mediaLabel: 'Your photo or welcome video',
        primaryLabel: 'Explore Resources',
        primaryHref: '/resources',
        secondaryLabel: 'Meet VJ',
        secondaryHref: '/about',
        showForm: false,
        headerLabel: 'Explore Resources',
        headerHref: '/resources',
        bookTitle: 'I Call BS: AI Vibe Coding Myths Dispelled',
        bookText: 'A practical guide for building real apps with Claude Code and Cursor.',
        bookPrice: '$17',
        bookCover: '/img/book-cover.png',
        bookAlt: 'Cover of I Call BS: AI Vibe Coding Myths Dispelled',
        bookHref: '/products/i-call-bs',
        bookLabel: 'Explore the book',
        kitHref: '/free-kit',
        kitLabel: 'Get the free kit',
      }),
      block('home-topics', 'brand_topics', {
        label: 'Start here',
        heading: 'What I am exploring',
        items: [
          { title: 'AI & Technology', text: 'What the tools actually do, and where the claims fall apart.', meta: 'Ideas', href: '/resources/ai-and-technology' },
          { title: 'Creative Tools', text: 'Writing, design, and the workflows around them.', meta: 'Practice', href: '/resources/creative-tools' },
          { title: 'Building in Public', text: 'Receipts from real projects. Wins, dead ends, and what changed.', meta: 'Work', href: '/resources/building-in-public' },
        ],
      }),
      block('home-projects', 'brand_projects', {
        label: 'From idea to reality',
        heading: 'Explore the tools',
        note: '',
        items: [
          { title: 'Project placeholder', text: 'A short description of a real build goes here.' },
          { title: 'Project placeholder', text: 'A short description of a real build goes here.' },
          { title: 'Project placeholder', text: 'A short description of a real build goes here.' },
        ],
      }),
      block('home-explore', 'brand_columns', {
        label: 'What I’m exploring',
        heading: 'Useful, not theoretical',
        items: [
          { title: 'The practical side of AI', text: 'Prompts, checks, and the habits that keep a build honest.' },
          { title: 'Creative workflows', text: 'How writing and making change when a model is in the loop.' },
          { title: 'Documenting the journey', text: 'Notes from the work, kept so the next attempt starts clearer.' },
        ],
      }),
      block('home-resources', 'brand_cards', {
        label: 'Watch. Read. Try.',
        heading: 'From the library',
        linkLabel: 'View all resources',
        linkHref: '/resources',
        items: [
          realPost,
          {
            title: 'Before you accept done',
            text: 'Name the claim, try the path yourself, and keep what you saw.',
            meta: 'Tutorial',
            href: '/resources/before-you-accept-done',
            format: 'Tutorial',
            sample: true,
          },
          {
            title: 'A welcome video',
            text: 'A short welcome.',
            meta: 'Video',
            href: '',
            format: 'Video',
            sample: true,
          },
        ],
      }),
      block('home-book', 'brand_product', book),
      block('home-news', 'brand_newsletter', {
        heading: 'Stay curious.',
        text: 'Occasional notes on what VJ is testing. Unsubscribe anytime. This list is separate from the free kit.',
        buttonLabel: 'Subscribe',
      }),
    ],
  },
  resources: {
    title: 'Resources',
    seo: 'Resources · VettaJimale.Tech',
    cta: { label: 'Explore Resources', href: '/resources' },
    blocks: [
      block('res-library', 'brand_library', {
        headerLabel: 'Explore Resources',
        headerHref: '/resources',
        heading: 'Useful ideas. Real exploration.',
        lede: 'Ideas, experiments, and practical guides from VJ. Samples are labeled.',
        items: [
          realPost,
          {
            title: 'Before You Accept Done',
            text: 'Name the claim, try the path yourself, and keep what you saw.',
            meta: 'Tutorial',
            href: '/resources/before-you-accept-done',
            format: 'Tutorial',
            topic: 'Building in Public',
            sample: true,
          },
          {
            title: 'Welcome video',
            text: 'Sample slot. No video file is published yet.',
            meta: 'Video',
            href: '',
            format: 'Video',
            topic: 'AI & Technology',
            sample: true,
          },
          {
            title: 'Free starter kit',
            text: 'Prompts, checklists, and previews from three chapters.',
            meta: 'Download',
            href: '/free-kit',
            format: 'Download',
            topic: 'Building in Public',
            sample: false,
          },
        ],
      }),
      block('res-topics', 'brand_topics', {
        label: 'Explore topics',
        heading: 'Three shelves',
        items: [
          { title: 'AI & Technology', text: 'The published essay lives here.', meta: 'Ideas', href: '/resources/ai-and-technology' },
          { title: 'Creative Tools', text: 'This shelf is not ready. No posts yet.', meta: 'Practice', href: '/resources/creative-tools' },
          { title: 'Building in Public', text: 'A labeled sample and the free kit.', meta: 'Work', href: '/resources/building-in-public' },
        ],
      }),
      block('res-news', 'brand_newsletter', {
        heading: 'Stay curious.',
        text: 'Occasional notes from VJ. This list is separate from the free kit, and it is not open yet.',
        buttonLabel: 'Subscribe',
      }),
    ],
  },
  about: {
    title: 'About VJ',
    seo: 'About · VettaJimale.Tech',
    cta: { label: 'Explore Resources', href: '/resources' },
    blocks: [
      block('about-hero', 'brand_hero', {
        eyebrow: 'About',
        headline: 'Curious about tech. Serious about making it useful.',
        highlight: 'making it useful',
        statement:
          'V. Jimale Ridgeway. Writer, marketer, creator, and AI builder. I test ideas, ask questions, and share the useful parts.',
        mediaLabel: 'Your photo',
        primaryLabel: 'Explore Resources',
        primaryHref: '/resources',
        secondaryLabel: 'Write to me',
        secondaryHref: '/contact',
        showForm: false,
        headerLabel: 'Explore Resources',
        headerHref: '/resources',
      }),
      block('about-quote', 'brand_quote', {
        heading: 'My approach',
        text: 'I test ideas, ask questions, and share the useful parts. Technology moves fast. I focus on what is real, what is practical, and what actually helps builders move forward.',
        mediaLabel: 'Your introduction video',
      }),
      block('about-find', 'brand_columns', {
        label: 'What you’ll find here',
        heading: 'Perspective, experiments, lessons',
        items: [
          { title: 'Practical technology insights', text: 'Notes you can use on a real project.' },
          { title: 'Creative experiments', text: 'Writing, tools, and workflows in progress.' },
          { title: 'Honest lessons', text: 'What worked, what failed, and what I would repeat.' },
        ],
      }),
      block('about-projects', 'brand_projects', {
        label: 'Selected projects',
        heading: 'Selected work',
        note: '',
        items: [
          { title: 'Project placeholder', text: 'Waiting on a real project photo and description.' },
          { title: 'Project placeholder', text: 'Waiting on a real project photo and description.' },
        ],
      }),
      block('about-book', 'brand_product', book),
    ],
  },
  contact: {
    title: 'Contact',
    seo: 'Contact · VettaJimale.Tech',
    cta: { label: 'Explore Resources', href: '/resources' },
    blocks: [
      block('contact-form', 'brand_contact', {
        headerLabel: 'Explore Resources',
        headerHref: '/resources',
        headline: 'Let’s connect.',
        highlight: 'connect',
        lede: 'Collaborations, interviews, or a question about the work. I read these.',
        items: [
          { title: 'Collaboration', text: 'A project or a partnership.' },
          { title: 'Media / interview', text: 'Podcasts, articles, and conversations.' },
          { title: 'Reader support', text: 'Questions about the kit or the book.' },
          { title: 'Other', text: 'Something that doesn’t fit the list.' },
        ],
      }),
      block('contact-news', 'brand_newsletter', {
        heading: 'Stay curious.',
        text: 'Notes from VJ. This is not the contact form, and it is not the free-kit list.',
        buttonLabel: 'Subscribe',
      }),
    ],
  },
  products: {
    title: 'Products',
    seo: 'Products · VettaJimale.Tech',
    cta: { label: 'Get the Free Kit', href: '/free-kit' },
    blocks: [
      block('products-catalog', 'brand_catalog', {
        headerLabel: 'Get the Free Kit',
        headerHref: '/free-kit',
        heading: 'Practical tools. Real-world use.',
        lede: 'The book and the free kit. Nothing else is for sale.',
        note: 'More on the way.',
        items: [
          {
            title: 'I Call BS: AI Vibe Coding Myths Dispelled',
            text: 'The complete digital book. 13 chapters, the process, and the toolkit.',
            meta: 'Paid',
            href: '/products/i-call-bs',
            format: 'Digital PDF',
          },
          {
            title: 'Free Starter Kit',
            text: 'Previews from three chapters, prompts, checklists, and a pocket glossary.',
            meta: 'Free',
            href: '/free-kit',
            format: 'PDF',
          },
        ],
      }),
    ],
  },
  kit: {
    title: 'Free Starter Kit',
    seo: 'Free Starter Kit · VettaJimale.Tech',
    cta: { label: 'Get the Free Kit', href: '#signup' },
    blocks: [
      block('kit-hero', 'brand_hero', {
        eyebrow: 'Free starter kit',
        headline: 'Start with clarity. Build with confidence.',
        highlight: 'clarity',
        statement:
          'Practical prompts, checklists, and honest lessons for building with Claude Code and Cursor. The PDF is free. The book is optional.',
        mediaLabel: '',
        primaryLabel: 'Send Me the Free Kit',
        primaryHref: '#signup',
        secondaryLabel: '',
        secondaryHref: '',
        showForm: true,
        headerLabel: 'Get the Free Kit',
        headerHref: '#signup',
      }),
      block('kit-inside', 'brand_topics', {
        label: 'What’s inside',
        heading: 'A useful kit, not a teaser',
        items: [
          { title: 'Previews from 3 chapters', text: 'Not three complete chapters.' },
          { title: '6 copy-and-paste prompts', text: 'Ready to use on a real project.' },
          { title: '3 checklist resources', text: 'Including shorter versions where the book goes further.' },
          { title: 'Pocket glossary', text: 'Plain-language notes for the terms that show up.' },
          { title: '3 lessons learned', text: 'From the builds, not from a composite case study.' },
          { title: 'Clickable contents', text: 'Jump to the page you need.' },
        ],
      }),
      block('kit-pages', 'brand_previews', {
        label: 'Look inside',
        heading: 'Real pages from the kit',
        items: pagePreviews,
      }),
      block('kit-vj', 'brand_quote', {
        heading: 'From VJ',
        text: 'I built, tested, made mistakes, and then wrote a practical place to start.',
        mediaLabel: 'Your photo or welcome video',
      }),
      block('kit-compare', 'brand_compare', shortCompare),
      fullCompare('kit-full-compare', '#signup', '/products/i-call-bs'),
      block('kit-faq', 'brand_faq', {
        heading: 'Frequent questions',
        items: [
          { title: 'Will I receive the PDF?', text: 'The next page has the download. The signup email includes the kit link.' },
          { title: 'Do I need to buy the book?', text: 'No. The kit stays free either way.' },
          { title: 'What if the file does not open?', text: 'Use the download button on the thank-you page, or write through the contact page.' },
        ],
      }),
      block('kit-again', 'brand_hero', {
        headline: 'The PDF is free.',
        highlight: 'free',
        statement: 'The book is optional. This button returns to the one signup form on this page.',
        mediaLabel: 'Cover of the I Call BS Free Starter Kit',
        mediaUrl: '/img/kit-cover.png',
        primaryLabel: 'Send Me the Free Kit',
        primaryHref: '#signup',
        secondaryLabel: '',
        secondaryHref: '',
        showForm: false,
      }),
    ],
  },
  thanks: {
    title: 'Your kit is ready',
    seo: 'Your kit is ready · VettaJimale.Tech',
    cta: { label: 'Get the Free Kit', href: '/free-kit' },
    blocks: [
      block('thanks-main', 'brand_thanks', {
        headerLabel: 'Get the Free Kit',
        headerHref: '/free-kit',
        heading: 'Your free kit is ready.',
        text: 'Download the PDF below. We’ll also email you a link to the same file.',
        downloadLabel: 'Download the Free Kit (PDF)',
        downloadHref: '/downloads/I-Call-BS-Free-Starter-Kit.pdf',
        steps: [
          { title: 'Open the PDF', text: 'Start with the contents.' },
          { title: 'Try one prompt', text: 'Copy it into the project you already have.' },
          { title: 'Use the smoke test', text: 'Check the work before you call it done.' },
        ],
        bookTitle: 'Want the complete picture?',
        bookText: 'I Call BS: AI Vibe Coding Myths Dispelled. 13 chapters, 15 prompts, 10 lessons. Digital PDF.',
        bookPrice: '$17',
        bookLabel: 'Get the Complete Book — $17',
        bookHref: '/products/i-call-bs',
        bookNote: 'Your kit is yours whether you buy or not.',
        resourcesLabel: '',
        resourcesHref: '',
      }),
      block('thanks-video', 'brand_quote', {
        heading: 'A quick note from VJ',
        text: 'A welcome video can go here when there is one. Nothing is uploaded yet.',
        mediaLabel: 'Your welcome video',
      }),
      block('thanks-resources', 'brand_cards', {
        label: 'More ideas',
        heading: 'Keep exploring',
        linkLabel: 'Browse Free Resources',
        linkHref: '/resources',
        items: [realPost],
      }),
    ],
  },
  sample: {
    title: 'Before You Accept Done',
    seo: 'Before You Accept Done · Sample · VettaJimale.Tech',
    cta: { label: 'Explore Resources', href: '/resources' },
    blocks: [
      block('sample-article', 'brand_article', {
        headerLabel: 'Explore Resources',
        headerHref: '/resources',
        eyebrow: 'Sample tutorial',
        heading: 'Before You Accept Done',
        lede: 'Name the claim, try the path yourself, and keep what you saw. The smoke-test checklist in the free kit is the longer version.',
        items: [
          { title: 'Name the claim', text: 'Write down what “done” is supposed to mean for this change.' },
          { title: 'Click it yourself', text: 'Run the path a stranger would use. Do not trust the model’s summary.' },
          { title: 'Keep the receipt', text: 'If it failed, the next prompt starts from what you saw, not from “fixed.”' },
        ],
        bookHref: '/products/i-call-bs',
        bookLabel: 'The how lives in the book',
      }),
    ],
  },
  topicAi: {
    title: 'AI & Technology',
    seo: 'AI & Technology · VettaJimale.Tech',
    cta: { label: 'Explore Resources', href: '/resources' },
    blocks: [
      block('topic-ai-hero', 'brand_hero', {
        headerLabel: 'Explore Resources',
        headerHref: '/resources',
        eyebrow: 'Ideas',
        headline: 'What the tools actually do, and where the claims fall apart.',
        highlight: 'claims fall apart',
        statement: 'Essays and checks from real use.',
        mediaLabel: '',
        primaryLabel: 'Read the essay',
        primaryHref: '/blog/ai-is-not-smarter-than-you-iecg',
        secondaryLabel: '',
        secondaryHref: '',
        showForm: false,
      }),
      block('topic-ai-library', 'brand_library', {
        heading: 'On this shelf',
        lede: 'Essays and checks from real use.',
        items: [realPost],
      }),
    ],
  },
  topicCreative: {
    title: 'Creative Tools',
    seo: 'Creative Tools · VettaJimale.Tech',
    cta: { label: 'Explore Resources', href: '/resources' },
    blocks: [
      block('topic-creative-hero', 'brand_hero', {
        headerLabel: 'Explore Resources',
        headerHref: '/resources',
        eyebrow: 'Practice',
        headline: 'Writing, design, and the workflows around them.',
        highlight: 'workflows',
        statement: 'This shelf is not ready. No posts are published here yet.',
        mediaLabel: 'Nothing published yet',
        primaryLabel: 'Back to resources',
        primaryHref: '/resources',
        secondaryLabel: '',
        secondaryHref: '',
        showForm: false,
      }),
    ],
  },
  topicWork: {
    title: 'Building in Public',
    seo: 'Building in Public · VettaJimale.Tech',
    cta: { label: 'Explore Resources', href: '/resources' },
    blocks: [
      block('topic-work-hero', 'brand_hero', {
        headerLabel: 'Explore Resources',
        headerHref: '/resources',
        eyebrow: 'Work',
        headline: 'Receipts from real projects. Wins, dead ends, and what changed.',
        highlight: 'real projects',
        statement: 'Wins, dead ends, and what changed.',
        mediaLabel: '',
        primaryLabel: 'Explore Resources',
        primaryHref: '/resources',
        secondaryLabel: '',
        secondaryHref: '',
        showForm: false,
      }),
      block('topic-work-cards', 'brand_cards', {
        label: 'Work log',
        heading: 'What is here so far',
        note: '',
        items: [
          {
            title: 'Before You Accept Done',
            text: 'Name the claim, try the path yourself, and keep what you saw.',
            meta: 'Sample · Tutorial',
            href: '/resources/before-you-accept-done',
            format: 'Tutorial',
            topic: 'Building in Public',
            sample: true,
          },
          {
            title: 'Free starter kit',
            text: 'Prompts, checklists, and previews from three chapters.',
            meta: 'Download',
            href: '/free-kit',
          },
        ],
      }),
    ],
  },
  book: {
    title: 'I Call BS',
    seo: 'I Call BS · VettaJimale.Tech',
    cta: { label: 'Get the Complete Book — $17', href: '#buy' },
    blocks: [
      block('book-hero', 'brand_product', {
        headerLabel: 'Get the Complete Book — $17',
        headerHref: '#buy',
        label: 'The book',
        title: 'I Call BS: AI Vibe Coding Myths Dispelled',
        text: 'A practical guide for building real apps with Claude Code and Cursor. One author. One stack.',
        price: '$17',
        coverUrl: '/img/book-cover.png',
        coverAlt: 'Cover of I Call BS: AI Vibe Coding Myths Dispelled',
        primaryLabel: 'Get the Complete Book — $17',
        primaryHref: '#buy',
        secondaryLabel: 'Get the free kit',
        secondaryHref: '/free-kit',
        note: 'Digital PDF. The free kit is a separate page, and buying is not required to use it.',
      }),
      block('book-benefits', 'brand_topics', {
        label: 'For the reader',
        heading: 'What the book is for',
        items: [
          { title: 'An honest process', text: 'For people who already know their work and are tired of being told an app ships in thirty minutes.' },
          { title: 'Not a course', text: 'It is not a prompt pack, a community, or a course.' },
          { title: 'A digital PDF', text: 'The full edition is $17. An EPUB is not part of this edition.' },
        ],
      }),
      block('book-evidence', 'brand_columns', {
        label: 'From two app builds',
        heading: '221 chats. 3,302 prompts.',
        items: [
          { title: '221 chat sessions', text: 'Counted from the author’s two app builds. Not an industry benchmark.' },
          { title: '3,302 prompts typed', text: 'Prompts she typed while building those apps. Not a target for the reader.' },
          { title: 'About one in six was a correction', text: 'From the same paper trail. The book is that trail, edited so you can use it.' },
        ],
      }),
      block('book-compare', 'brand_compare', shortCompare),
      fullCompare('book-full-compare', '/free-kit', '#buy'),
      block('book-pages', 'brand_previews', {
        label: 'Look inside',
        heading: 'Real pages you can open',
        items: pagePreviews,
      }),
      block('book-author', 'brand_hero', {
        eyebrow: 'The author',
        headline: 'V. Jimale Ridgeway',
        statement: 'I Call BS is V. Jimale Ridgeway’s paper trail. Writer, marketer, creator, and AI builder. The about page is the longer version.',
        mediaLabel: 'Your photo',
        primaryLabel: 'About VJ',
        primaryHref: '/about',
        secondaryLabel: '',
        secondaryHref: '',
        showForm: false,
      }),
      block('book-faq', 'brand_faq', {
        heading: 'Questions',
        items: [
          { title: 'What do I get?', text: 'A digital PDF: 13 chapters, 15 prompts, and 10 selected lessons, as the current comparison lists them. EPUB is not included.' },
          { title: 'Do I need this to use the free kit?', text: 'No. The kit stays free either way, and this page does not include the kit signup form.' },
          { title: 'Where did 221 and 3,302 come from?', text: 'They are counts from the author’s two app builds, not a promise about your project.' },
          { title: 'How do I pay?', text: 'Payment is not connected on this page. The button opens the existing sales offer and does not charge a card.' },
        ],
      }),
      block('book-buy', 'brand_product', {
        anchor: 'buy',
        label: 'The full edition',
        title: 'The full edition is $17.',
        text: 'Digital PDF. No upsell maze and no countdown. The book, the toolkit, and the receipts.',
        price: '$17',
        coverUrl: '/img/book-cover.png',
        coverAlt: 'Cover of I Call BS: AI Vibe Coding Myths Dispelled',
        primaryLabel: 'Get the Complete Book — $17',
        primaryHref: '/book#buy',
        secondaryLabel: '',
        secondaryHref: '',
        note: 'Payment is not connected here. This opens the existing sales offer. It does not charge a card.',
      }),
    ],
  },
}

export const brandDrafts: Array<{ slug: string; id: BrandPageId }> = [
  { slug: 'vj-home', id: 'home' },
  { slug: 'vj-resources', id: 'resources' },
  { slug: 'vj-about', id: 'about' },
  { slug: 'vj-contact', id: 'contact' },
  { slug: 'vj-products', id: 'products' },
  { slug: 'vj-free-kit', id: 'kit' },
  { slug: 'vj-kit-thanks', id: 'thanks' },
  { slug: 'vj-sample-tutorial', id: 'sample' },
  { slug: 'vj-topic-ai', id: 'topicAi' },
  { slug: 'vj-topic-creative', id: 'topicCreative' },
  { slug: 'vj-topic-work', id: 'topicWork' },
  { slug: 'vj-book', id: 'book' },
]
