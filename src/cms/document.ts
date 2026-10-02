export type BuilderNode = {
  id: string
  type: string
  moduleVersion: number
  props: Record<string, unknown>
  children?: BuilderNode[]
}

export type BuilderDocument = {
  schemaVersion: 1
  title: string
  nodes: BuilderNode[]
}

export function emptyDocument(title = ''): BuilderDocument {
  return { schemaVersion: 1, title, nodes: [] }
}

export function documentFromBody(title: string, body: string): BuilderDocument {
  const text = body.trim()
  return {
    schemaVersion: 1,
    title,
    nodes: text
      ? [
          {
            id: crypto.randomUUID(),
            type: 'richText',
            moduleVersion: 1,
            props: { text },
          },
        ]
      : [],
  }
}

export function bodyFromDocument(doc: BuilderDocument | null | undefined): string {
  if (!doc?.nodes?.length) return ''
  return doc.nodes
    .filter((n) => n.type === 'richText')
    .map((n) => String(n.props.text ?? n.props.html ?? ''))
    .join('\n\n')
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'page'
}
