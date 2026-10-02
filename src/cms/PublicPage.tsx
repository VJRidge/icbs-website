import RenderDocument from './render/RenderDocument'
import type { BuilderDocument } from './document'

export default function PublicPage({ title, document }: { title: string; document: BuilderDocument }) {
  return <RenderDocument title={title} document={document} />
}
