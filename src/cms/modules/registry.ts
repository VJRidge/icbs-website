import type { BuilderNode } from '../document'

export type FieldKind = 'text' | 'textarea' | 'select' | 'url' | 'html'

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
  category: 'Text' | 'Media' | 'Layout' | 'Marketing'
  defaults: Record<string, unknown>
  fields: ModuleField[]
}

export const MODULES: ModuleDef[] = [
  {
    type: 'paragraph',
    label: 'Paragraph',
    hint: 'Write in the canvas. Format with the toolbar.',
    category: 'Text',
    defaults: { html: '', align: 'left', color: '' },
    fields: [
      {
        key: 'align',
        label: 'Align',
        kind: 'select',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
      },
      { key: 'color', label: 'Text color', kind: 'text' },
    ],
  },
  {
    type: 'heading',
    label: 'Heading',
    hint: 'Section heading in the article.',
    category: 'Text',
    defaults: { text: '', level: 'h2' },
    fields: [
      {
        key: 'level',
        label: 'Level',
        kind: 'select',
        options: [
          { value: 'h2', label: 'Heading 2' },
          { value: 'h3', label: 'Heading 3' },
        ],
      },
    ],
  },
  {
    type: 'quote',
    label: 'Quote',
    hint: 'Pull quote.',
    category: 'Text',
    defaults: { text: '', cite: '' },
    fields: [
      { key: 'text', label: 'Quote', kind: 'textarea' },
      { key: 'cite', label: 'Citation', kind: 'text' },
    ],
  },
  {
    type: 'callout',
    label: 'Callout',
    hint: 'Highlighted note.',
    category: 'Text',
    defaults: { text: '' },
    fields: [{ key: 'text', label: 'Note', kind: 'textarea' }],
  },
  {
    type: 'image',
    label: 'Image',
    hint: 'From the media library or a URL.',
    category: 'Media',
    defaults: { src: '', alt: '' },
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
    defaults: { height: '32' },
    fields: [
      {
        key: 'height',
        label: 'Height',
        kind: 'select',
        options: [
          { value: '16', label: 'Small' },
          { value: '32', label: 'Medium' },
          { value: '64', label: 'Large' },
        ],
      },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    hint: 'A link styled as a button.',
    category: 'Marketing',
    defaults: { label: 'Get the kit', href: '/free' },
    fields: [
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'href', label: 'Link', kind: 'url' },
    ],
  },
  {
    type: 'cta',
    label: 'Call to action',
    hint: 'Heading, copy, and a button.',
    category: 'Marketing',
    defaults: {
      heading: '',
      text: '',
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
    type: 'kitSignup',
    label: 'Kit signup',
    hint: 'The live lead form.',
    category: 'Marketing',
    defaults: {},
    fields: [],
  },
]

export const PICKER_CATEGORIES: Record<ModuleDef['category'], string[]> = {
  Text: ['paragraph', 'heading', 'quote', 'callout'],
  Media: ['image'],
  Layout: ['divider', 'spacer'],
  Marketing: ['button', 'cta', 'kitSignup'],
}

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
  }
}
