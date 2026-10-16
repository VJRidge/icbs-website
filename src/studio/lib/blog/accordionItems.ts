export type AccordionItem = {
  title: string;
  intro: string;
  bullets: string[];
  html: string;
  open: boolean;
};

function asRecord(row: unknown): Record<string, unknown> {
  return row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export const HOW_I_USE_AI_ITEMS: AccordionItem[] = [
  {
    title: 'Websites',
    intro:
      'Design and ship a site in days, not months. I use AI to go from a rough idea in my head to a working landing page without reaching for a template.',
    bullets: [
      'Wireframe straight from a conversation — describe the vibe, get a layout',
      'Generate copy that doesn’t read like every other SaaS homepage',
      'Rework hero sections and CTAs on the fly when something isn’t landing',
      'Debug CSS and responsive issues without losing a weekend to Stack Overflow',
    ],
    html: '',
    open: true,
  },
  {
    title: 'Web-Based & Mobile Applications',
    intro:
      'This is where AI pulls its real weight. I built Muster and HBCU Clubhouse mostly through AI-assisted development — scoping, building, debugging, shipping.',
    bullets: [
      'Prototype a feature end-to-end before deciding if it’s worth building for real',
      'Pair with Claude Code and Cursor to move through architecture decisions fast',
      'Catch bugs by having AI read my code like a second set of eyes',
      'Translate napkin ideas into working React Native or Next.js scaffolds',
    ],
    html: '',
    open: false,
  },
  {
    title: 'Workflow Automation',
    intro:
      'I’m a solo founder. Automation is how I compete with teams of ten. AI helps me build the pipes between tools so nothing lives in my head.',
    bullets: [
      'Build scrapers and outreach pipelines without needing a no-code platform',
      'Chain tools together with scripts that would’ve taken a developer a week',
      'Turn repeat tasks into one-shot prompts, then into scheduled jobs',
      'Clean, sort, and summarize data dumps that would otherwise sit in a folder',
    ],
    html: '',
    open: false,
  },
  {
    title: 'Images',
    intro:
      'Visuals move faster than words, especially on social. AI lets me produce brand-consistent imagery without a designer in the loop.',
    bullets: [
      'Generate thumbnails, hero images, and social graphics for CultureTech and Muster',
      'Mock up product shots and lifestyle imagery before anything exists in real life',
      'Rework photos — background swaps, lighting fixes, upscaling',
      'Hold a consistent visual tone across platforms without digging through stock sites',
    ],
    html: '',
    open: false,
  },
  {
    title: 'Video',
    intro:
      'Short-form video runs my personal brand. AI handles the parts that used to kill momentum — scripts, cuts, captions, voiceovers.',
    bullets: [
      'Draft scripts that keep my voice without sounding like a teleprompter',
      'Auto-cut long demos into tight 60-second posts',
      'Generate captions, chapter markers, and hooks tuned to each platform',
      'Try B-roll and transitions I’d never have time to shoot myself',
    ],
    html: '',
    open: false,
  },
  {
    title: 'Brainstorming',
    intro:
      'Honestly, this is where AI changed how I work the most. I don’t use it to think for me — I use it to think out loud with something that doesn’t get tired.',
    bullets: [
      'Pressure-test ideas before wasting a week building the wrong thing',
      'Get the dumb questions out of the way so I can ask the smart ones',
      'Pull references across fields I don’t personally live in',
      'Argue a decision from three angles before committing to one',
    ],
    html: '',
    open: false,
  },
];

export function accordionRowNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function readAccordionItems(data: Record<string, unknown>): AccordionItem[] {
  const raw = Array.isArray(data.items) ? data.items : [];
  const items = raw.map((row) => {
    const o = asRecord(row);
    const html = typeof o.html === 'string' ? o.html : '';
    const intro = String(o.intro ?? '').trim() || stripHtml(html);
    const bullets = Array.isArray(o.bullets)
      ? o.bullets.map((b) => String(b ?? '').trim()).filter(Boolean)
      : [];
    return {
      title: String(o.title ?? '').trim() || 'Section',
      intro,
      bullets,
      html,
      open: Boolean(o.open),
    };
  });
  return items.length ? items : HOW_I_USE_AI_ITEMS.map((item) => ({ ...item, bullets: [...item.bullets] }));
}

export const ACCORDION_COLOR_DEFAULTS = {
  toggleColor: '#e8d44d',
  toggleTextColor: '#1d3328',
  chipColor: '#bccbbd',
  chipTextColor: '#1d3328',
};

export function readAccordionColors(data: Record<string, unknown>) {
  return {
    toggleColor: String(data.toggleColor ?? '').trim() || ACCORDION_COLOR_DEFAULTS.toggleColor,
    toggleTextColor: String(data.toggleTextColor ?? '').trim() || ACCORDION_COLOR_DEFAULTS.toggleTextColor,
    chipColor: String(data.chipColor ?? '').trim() || ACCORDION_COLOR_DEFAULTS.chipColor,
    chipTextColor: String(data.chipTextColor ?? '').trim() || ACCORDION_COLOR_DEFAULTS.chipTextColor,
  };
}

export const HOW_I_USE_AI_ACCORDION = {
  heading: 'How I Use AI',
  allowMultiple: false,
  backgroundColor: '#f3f1e6',
  marginTop: 0,
  marginBottom: 0,
  ...ACCORDION_COLOR_DEFAULTS,
  items: HOW_I_USE_AI_ITEMS,
};
