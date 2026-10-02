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

export function newId() {
  return crypto.randomUUID()
}

export function cloneNode(node: BuilderNode): BuilderNode {
  return {
    ...node,
    id: newId(),
    props: { ...node.props },
    children: node.children?.map(cloneNode),
  }
}

export function findNode(nodes: BuilderNode[], id: string): BuilderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

export function findParent(nodes: BuilderNode[], id: string): BuilderNode | null {
  for (const node of nodes) {
    if (node.children?.some((c) => c.id === id)) return node
    if (node.children) {
      const found = findParent(node.children, id)
      if (found) return found
    }
  }
  return null
}

function mapTree(nodes: BuilderNode[], fn: (node: BuilderNode) => BuilderNode): BuilderNode[] {
  return nodes.map((node) => {
    const next = fn(node)
    return next.children ? { ...next, children: mapTree(next.children, fn) } : next
  })
}

export function updateNodeProps(nodes: BuilderNode[], id: string, props: Record<string, unknown>): BuilderNode[] {
  return mapTree(nodes, (node) => (node.id === id ? { ...node, props: { ...node.props, ...props } } : node))
}

export function removeNode(nodes: BuilderNode[], id: string): BuilderNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n))
}

export function insertNode(nodes: BuilderNode[], parentId: string | null, node: BuilderNode, afterId?: string | null): BuilderNode[] {
  if (!parentId) {
    if (!afterId) return [...nodes, node]
    const i = nodes.findIndex((n) => n.id === afterId)
    if (i < 0) return [...nodes, node]
    const next = nodes.slice()
    next.splice(i + 1, 0, node)
    return next
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      const kids = n.children ? n.children.slice() : []
      if (!afterId) kids.push(node)
      else {
        const i = kids.findIndex((c) => c.id === afterId)
        if (i < 0) kids.push(node)
        else kids.splice(i + 1, 0, node)
      }
      return { ...n, children: kids }
    }
    if (n.children) return { ...n, children: insertNode(n.children, parentId, node, afterId) }
    return n
  })
}

export function moveNode(nodes: BuilderNode[], id: string, dir: -1 | 1): BuilderNode[] {
  const i = nodes.findIndex((n) => n.id === id)
  if (i >= 0) {
    const j = i + dir
    if (j < 0 || j >= nodes.length) return nodes
    const next = nodes.slice()
    const [item] = next.splice(i, 1)
    next.splice(j, 0, item)
    return next
  }
  return nodes.map((n) => (n.children ? { ...n, children: moveNode(n.children, id, dir) } : n))
}

export function duplicateNode(nodes: BuilderNode[], id: string): BuilderNode[] {
  const i = nodes.findIndex((n) => n.id === id)
  if (i >= 0) {
    const next = nodes.slice()
    next.splice(i + 1, 0, cloneNode(nodes[i]))
    return next
  }
  return nodes.map((n) => (n.children ? { ...n, children: duplicateNode(n.children, id) } : n))
}

function collectText(nodes: BuilderNode[]): string[] {
  const out: string[] = []
  for (const node of nodes) {
    for (const key of ['text', 'heading', 'label', 'eyebrow', 'cite', 'html']) {
      const v = node.props[key]
      if (typeof v === 'string' && v.trim()) out.push(v.replace(/<[^>]+>/g, ' ').trim())
    }
    if (node.children) out.push(...collectText(node.children))
  }
  return out
}

export function flattenBlocks(nodes: BuilderNode[]): BuilderNode[] {
  const out: BuilderNode[] = []
  for (const node of nodes) {
    if (node.type === 'section') {
      out.push(...flattenBlocks(node.children ?? []))
      continue
    }
    if (node.type === 'richText' || node.type === 'text') {
      const raw = String(node.props.html ?? node.props.text ?? '')
      out.push({
        ...node,
        type: 'paragraph',
        props: { html: raw.includes('<') ? raw : raw.replace(/\n/g, '<br>') },
        children: undefined,
      })
      continue
    }
    out.push({ ...node, children: undefined })
  }
  return out
}

export function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
}

export function excerptFromDocument(doc: BuilderDocument): string {
  return collectText(doc.nodes).join(' ').slice(0, 280)
}

export function normalizeDocument(doc: BuilderDocument | null | undefined, title = ''): BuilderDocument {
  const base = doc && Array.isArray(doc.nodes) ? doc : emptyDocument(title)
  return {
    schemaVersion: 1,
    title: base.title || title,
    nodes: flattenBlocks(base.nodes),
  }
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80) || 'page'
  )
}
