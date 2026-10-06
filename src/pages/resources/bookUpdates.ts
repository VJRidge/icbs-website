/** Real published correction entries only. Do not seed fiction. */

export type BookUpdateEntry = {
  id: string
  type: 'Correction' | 'Link update' | 'Tool change'
  publishedAt: string
  title: string
  summary: string
  readerAction?: string
}

export const BOOK_UPDATE_ENTRIES: BookUpdateEntry[] = []
