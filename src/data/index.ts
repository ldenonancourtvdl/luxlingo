import type { Chapter } from './types'

const modules = import.meta.glob<Chapter>('./chapters/k*.json', { eager: true, import: 'default' })

export const chapters: Chapter[] = Object.values(modules).sort((a, b) => a.id - b.id)

export function getChapter(id: number): Chapter | undefined {
  return chapters.find((c) => c.id === id)
}
