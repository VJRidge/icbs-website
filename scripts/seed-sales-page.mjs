/** Prints SQL to insert the / sales landing. Run: node scripts/seed-sales-page.mjs */

const author = '49e714a9-62ca-41f0-a832-da390c2e8d3a'
const id = 'a8c41d2e-6b0f-4c3a-9d11-2f7e0b8c4a10'

const blocks = [
  {
    id: 'sale-hero',
    type: 'kit_hero',
    data: {
      tag: 'The book',
      tagline: 'Practical. Honest. Receipts-driven.',
      coverUrl: '/img/book-cover.png',
      coverAlt: 'Cover of I Call BS: AI Vibe Coding Myths Dispelled',
      headlineBefore: 'The ',
      highlight: 'how',
      headlineAfter: ' lives in the full edition.',
      subhead:
        'The kit busts the myths. This is the receipts, the process, and the toolkit you ship with. One author. One stack. Seventeen dollars.',
      showForm: false,
      showNav: false,
      buttonLabel: 'Get the full guide — $17',
      buttonHref: '#buy',
      receipts: [
        { value: '221', label: 'Chat sessions' },
        { value: '3,302', label: 'Prompts I typed' },
        { value: '16,612', label: 'File edits by the AI' },
        { value: '4,338', label: 'Terminal commands' },
      ],
    },
  },
  {
    id: 'sale-who',
    type: 'kit_text',
    data: {
      tone: 'cream',
      label: 'Who this is for',
      heading: 'You already know your work. You need an honest process.',
      body: 'This is for people who bring domain depth and are tired of being told an app ships in thirty minutes.\n\nIt is not a prompt pack, a community, or a course. If you want someone else to think for you, this is the wrong book.',
      highlight: '',
      centered: false,
      buttonLabel: '',
      buttonHref: '',
      anchor: '',
    },
  },
  {
    id: 'sale-problem',
    type: 'kit_text',
    data: {
      tone: 'white',
      label: 'The problem',
      heading: 'AI is not smarter than you.',
      body: 'The gap is experience, not intelligence. The myths sell a shortcut. The receipts show a chair, a keyboard, and a long paper trail.',
      highlight: '',
      centered: false,
      buttonLabel: '',
      buttonHref: '',
      anchor: '',
    },
  },
  {
    id: 'sale-receipts',
    type: 'kit_text',
    data: {
      tone: 'cream',
      label: 'The receipts',
      heading: 'I sat in the chair.',
      body: 'I typed the prompts, broke the build, and kept the logs. Hundreds of chat sessions. Thousands of file edits. That paper trail, edited so you can use it, is the book.',
      highlight: '',
      centered: false,
      buttonLabel: '',
      buttonHref: '',
      anchor: '',
    },
  },
  {
    id: 'sale-contents',
    type: 'kit_contents',
    data: {
      tone: 'cream',
      label: 'Inside the book',
      heading: 'What you get for $17',
      lede: 'The myth-busting you already saw in the kit, plus the how.',
      ledeHighlight: 'No composite case study. No ghostwriter.',
      items: [
        { number: '01', title: 'All thirteen chapters', kind: 'The book' },
        { number: '02', title: 'The daily prompting process', kind: 'The how' },
        { number: '03', title: 'The proof gates', kind: 'The how' },
        { number: '04', title: 'Life after launch', kind: 'The how' },
        { number: '05', title: 'The Toolkit', kind: 'Checklists' },
        { number: '—', title: 'Smoke test, Before I Accept Done, pre-flight', kind: 'Checklists' },
        { number: '—', title: 'Three glossaries and the prompt swipe file', kind: 'Add-ons' },
        { number: '—', title: 'Five add-ons', kind: 'Add-ons' },
      ],
    },
  },
  {
    id: 'sale-kit',
    type: 'kit_text',
    data: {
      tone: 'white',
      label: 'Kit or book',
      heading: 'Start free. Buy when you want the how.',
      body: 'The free starter kit is the myth-busting and the mindset. The full edition is the how.\n\nTake the kit either way.',
      highlight: '',
      centered: false,
      buttonLabel: 'Get the free starter kit',
      buttonHref: '/free',
      anchor: '',
    },
  },
  {
    id: 'sale-author',
    type: 'kit_text',
    data: {
      tone: 'cream',
      label: 'The author',
      heading: 'One author. One stack.',
      body: 'I Call BS is V. Jimale Ridgeway\'s paper trail. Read the about page if you want the longer version.',
      highlight: '',
      centered: false,
      buttonLabel: 'About the author',
      buttonHref: '/about',
      anchor: '',
    },
  },
  {
    id: 'sale-offer',
    type: 'kit_text',
    data: {
      tone: 'green',
      label: 'The offer',
      heading: 'The full edition is $17.',
      body: 'No upsell maze. No fake countdown. The book, the toolkit, and the receipts.',
      highlight: 'The free kit is ready today if you want to hear the voice first.',
      centered: true,
      buttonLabel: 'Get the full guide — $17',
      buttonHref: '#buy',
      anchor: 'buy',
    },
  },
]

const doc = { format: 'blocks', blocks, html: '', layout: 'landing' }
const json = JSON.stringify(doc).replace(/'/g, "''")

const sql = `
insert into public.contents (
  id, kind, slug, title, status, author_id, body, content_blocks, published_document,
  layout, seo_title, seo_description, published_at
)
select
  '${id}',
  'page',
  'book',
  'I Call BS',
  'published',
  '${author}',
  '',
  '${json}'::jsonb -> 'blocks',
  '${json}'::jsonb,
  'landing',
  'I Call BS: AI Vibe Coding Myths Dispelled',
  'The honest version of build an app with AI. The full edition is $17.',
  now()
where not exists (select 1 from public.contents where kind = 'page' and slug = 'book');

update public.contents
set
  title = 'I Call BS',
  status = 'published',
  content_blocks = '${json}'::jsonb -> 'blocks',
  published_document = '${json}'::jsonb,
  layout = 'landing',
  seo_title = 'I Call BS: AI Vibe Coding Myths Dispelled',
  seo_description = 'The honest version of build an app with AI. The full edition is $17.',
  published_at = coalesce(published_at, now())
where kind = 'page' and slug = 'book';

update public.settings
set homepage_content_id = (select id from public.contents where kind = 'page' and slug = 'book' limit 1)
where id = 1;

update public.menus
set items = (
  select jsonb_agg(elem)
  from (
    select jsonb_build_object('id','book','label','The book','href','/') as elem
    union all
    select e
    from jsonb_array_elements(items) e
    where e->>'href' is distinct from '/'
  ) s
),
updated_at = now()
where location = 'header'
  and not exists (
    select 1 from jsonb_array_elements(items) e where e->>'href' = '/'
  );
`

import { writeFileSync } from 'node:fs'

writeFileSync(new URL('../supabase/migrations/20261006_sales_homepage.sql', import.meta.url), sql.trimStart(), 'utf8')
console.log('wrote supabase/migrations/20261006_sales_homepage.sql')
