import type { BuilderNode } from '../document'

export type FieldKind = 'text' | 'textarea' | 'select' | 'url'

export type ModuleField = {
  key: string
  label: string
  kind: FieldKind
  options?: { value: string; label: string }[]
}

export type ModuleDef = {
  type: string
  label: string
  hint: string
  category: 'Layout' | 'Content' | 'Media' | 'Lead gen'
  canHaveChildren?: boolean
  defaults: Record<string, unknown>
  fields: ModuleField[]
}

export const MODULES: ModuleDef[] = [
  {
    type: 'section',
    label: 'Section',
    hint: 'Full-width band. Drop modules inside it.',
    category: 'Layout',
    canHaveChildren: true,
    defaults: { tone: 'cream' },
    fields: [
      {
        key: 'tone',
        label: 'Background',
        kind: 'select',
        options: [
          { value: 'cream', label: 'Cream' },
          { value: 'green', label: 'Cover green' },
          { value: 'white', label: 'White' },
        ],
      },
    ],
  },
  {
    type: 'heading',
    label: 'Heading',
    hint: 'Page title or section title.',
    category: 'Content',
    defaults: { eyebrow: 'Section', text: 'New heading', level: 'h2' },
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
      { key: 'text', label: 'Heading', kind: 'text' },
      {
        key: 'level',
        label: 'Level',
        kind: 'select',
        options: [
          { value: 'h1', label: 'H1' },
          { value: 'h2', label: 'H2' },
        ],
      },
    ],
  },
  {
    type: 'text',
    label: 'Text',
    hint: 'Paragraphs. Blank lines make new paragraphs.',
    category: 'Content',
    defaults: { text: 'Write the copy for this block.' },
    fields: [{ key: 'text', label: 'Body', kind: 'textarea' }],
  },
  {
    type: 'quote',
    label: 'Quote',
    hint: 'Pull quote with optional citation.',
    category: 'Content',
    defaults: { text: 'A line worth repeating.', cite: '' },
    fields: [
      { key: 'text', label: 'Quote', kind: 'textarea' },
      { key: 'cite', label: 'Citation', kind: 'text' },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    hint: 'Link styled as the kit button.',
    category: 'Content',
    defaults: { label: 'Get the kit', href: '/free' },
    fields: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'href', label: 'Link', kind: 'url' },
    ],
  },
  {
    type: 'cta',
    label: 'Call to action',
    hint: 'Heading, short copy, and a button.',
    category: 'Content',
    defaults: {
      heading: 'Ready when you are.',
      text: 'Get the free starter kit. No fairy tales.',
      buttonLabel: 'Send me the kit',
      buttonHref: '/free',
    },
    fields: [
      { key: 'heading', label: 'Heading', kind: 'text' },
      { key: 'text', label: 'Copy', kind: 'textarea' },
      { key: 'buttonLabel', label: 'Button label', kind: 'text' },
      { key: 'buttonHref', label: 'Button link', kind: 'url' },
    ],
  },
  {
    type: 'image',
    label: 'Image',
    hint: 'Paste a public image URL. Media library comes next.',
    category: 'Media',
    defaults: { src: '/img/kit-cover.png', alt: 'I Call BS kit cover' },
    fields: [
      { key: 'src', label: 'Image URL', kind: 'url' },
      { key: 'alt', label: 'Alt text', kind: 'text' },
    ],
  },
  {
    type: 'divider',
    label: 'Divider',
    hint: 'Horizontal rule.',
    category: 'Layout',
    defaults: {},
    fields: [],
  },
  {
    type: 'spacer',
    label: 'Spacer',
    hint: 'Vertical gap.',
    category: 'Layout',
    defaults: { height: '48' },
    fields: [
      {
        key: 'height',
        label: 'Height (px)',
        kind: 'select',
        options: [
          { value: '24', label: '24' },
          { value: '48', label: '48' },
          { value: '88', label: '88' },
        ],
      },
    ],
  },
  {
    type: 'kitSignup',
    label: 'Kit signup',
    hint: 'The live lead form. Submissions still go to the kit email.',
    category: 'Lead gen',
    defaults: {},
    fields: [],
  },
]

export function getModule(type: string) {
  return MODULES.find((m) => m.type === type)
}

export function createModuleNode(type: string): BuilderNode {
  const def = getModule(type)
  if (!def) throw new Error(`Unknown module: ${type}`)
  return {
    id: crypto.randomUUID(),
    type: def.type,
    moduleVersion: 1,
    props: { ...def.defaults },
    children: def.canHaveChildren ? [] : undefined,
  }
}
