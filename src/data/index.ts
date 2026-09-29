import { sortVerbs } from '../lib/verbs'
import type { Chapter, ChapterData, Level, Verb } from './types'
import verbsData from './verbs.json'

const modules = import.meta.glob<ChapterData>('./*/k*.json', { eager: true, import: 'default' })

export interface LevelInfo {
  id: Level
  titleFr: string
  book: string
  chapters: Chapter[]
}

export const chapters: Chapter[] = Object.entries(modules)
  .map(([path, data]) => {
    const level = path.split('/')[1].toUpperCase() as Level
    return { ...data, level, key: `${level.toLowerCase()}-${data.id}` }
  })
  .sort((a, b) => a.level.localeCompare(b.level) || a.id - b.id)

const LEVELS: Omit<LevelInfo, 'chapters'>[] = [
  { id: 'A1', titleFr: 'Débutant', book: 'Schwätzt Dir Lëtzebuergesch? A1' },
  { id: 'A2', titleFr: 'Élémentaire', book: 'Schwätzt Dir Lëtzebuergesch? A2' },
]

export const levels: LevelInfo[] = LEVELS.map((level) => ({
  ...level,
  chapters: chapters.filter((c) => c.level === level.id),
})).filter((level) => level.chapters.length > 0)

export function getChapter(key: string): Chapter | undefined {
  return chapters.find((c) => c.key === key)
}

/** Verb lists of both books, merged and sorted alphabetically */
export const verbs: Verb[] = sortVerbs(verbsData as Verb[])
