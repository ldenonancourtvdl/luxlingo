import type { Level, Verb } from '../data/types'

export const PERSONS = ['ech', 'du', 'hien/si/et', 'mir', 'dir/Dir', 'si'] as const

export type LevelFilter = Level | 'all'

/** Lowercase, without accents, punctuation or "…", single spaces */
export function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Infinitive without the reflexive "sech" / "(sech)" prefix */
function infinitiveKey(verb: Verb): string {
  return searchKey(verb.lb.replace(/^\(?sech\)?\s+/, ''))
}

export function sortVerbs(verbs: readonly Verb[]): Verb[] {
  return [...verbs].sort(
    (a, b) => infinitiveKey(a).localeCompare(infinitiveKey(b)) || Number(!!a.modal) - Number(!!b.modal),
  )
}

const startsWord = (text: string, query: string) => ` ${text}`.includes(` ${query}`)

/** Lower = better match; null = no match */
function matchRank(verb: Verb, query: string): number | null {
  const infinitive = infinitiveKey(verb)
  if (infinitive === query) return 0
  if (infinitive.startsWith(query)) return 1
  const fr = searchKey(verb.fr)
  const senses = verb.fr.replace(/\([^)]*\)/g, '').split(/[,;/]/).map(searchKey)
  if (senses.includes(query)) return 2
  if (startsWord(fr, query)) return 3
  const forms = [...verb.forms, verb.pc ?? ''].map(searchKey)
  if (forms.includes(query)) return 4
  if (forms.some((form) => startsWord(form, query))) return 5
  if (infinitive.includes(query)) return 6
  if (fr.includes(query) || forms.some((form) => form.includes(query))) return 7
  return null
}

/**
 * Filters by level, then by a query matched (accent-insensitive) against the infinitive,
 * the French translation and every conjugated form. Best matches first, alphabetical otherwise.
 */
export function filterVerbs(verbs: readonly Verb[], query: string, level: LevelFilter = 'all'): Verb[] {
  const pool = level === 'all' ? [...verbs] : verbs.filter((v) => v.levels.includes(level))
  const q = searchKey(query)
  if (!q) return pool
  return pool
    .map((verb) => ({ verb, rank: matchRank(verb, q) }))
    .filter((m): m is { verb: Verb; rank: number } => m.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((m) => m.verb)
}
