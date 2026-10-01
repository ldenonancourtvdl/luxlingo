import type { Verb } from '../data/types'
import { type Rng, shuffle } from './random'
import { normalizeAnswer, stripAccents } from './exercises'
import { searchKey } from './verbs'

export type DrillMode = 'qcm' | 'write'

export interface QcmQuestion {
  mode: 'qcm'
  id: string
  verb: Verb
  /** French translation to recognize */
  prompt: string
  /** Correct Luxembourgish infinitive */
  answer: string
  options: string[]
}

export interface WriteQuestion {
  mode: 'write'
  id: string
  verb: Verb
  prompt: string
  answer: string
  /** Accepted spellings, normalized (with and without the reflexive pronoun) */
  accepted: string[]
  /** Normalized infinitives of the other verbs: never accepted as a typo */
  others: string[]
}

export type DrillQuestion = QcmQuestion | WriteQuestion

export const OPTION_COUNT = 4
/** Distractors are drawn at random from the most similar verbs */
const SIMILAR_POOL = 12

/** Levenshtein distance, giving up as soon as it exceeds `max` */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      best = Math.min(best, row[j])
    }
    if (best > max) return max + 1
    prev = row
  }
  return prev[b.length]
}

/** Infinitive without the reflexive pronoun, accents or case */
function bareKey(lb: string): string {
  return searchKey(lb.replace(/^\(?sech\)?\s+/, ''))
}

/** 0 = nothing in common, 1 = identical */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length)
  return longest === 0 ? 1 : 1 - editDistance(a, b) / longest
}

/** Typos tolerated in the answer, depending on its length */
export function typoBudget(answer: string): number {
  if (answer.length <= 4) return 0
  return answer.length <= 8 ? 1 : 2
}

const accepted = (verb: Verb): string[] => {
  const forms = [verb.lb, verb.lb.replace(/^\((sech)\)\s*/, '$1 '), verb.lb.replace(/^\(?sech\)?\s+/, '')]
  return [...new Set(forms.map(normalizeAnswer).filter(Boolean))]
}

export function makeQcmQuestion(id: string, verb: Verb, pool: readonly Verb[], rng: Rng = Math.random): QcmQuestion {
  const key = bareKey(verb.lb)
  const candidates = pool
    .filter((other) => other.lb !== verb.lb && other.fr !== verb.fr)
    .map((other) => ({ other, score: similarity(key, bareKey(other.lb)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SIMILAR_POOL)
    .map(({ other }) => other.lb)
  const distractors = shuffle(candidates, rng).slice(0, OPTION_COUNT - 1)
  return {
    mode: 'qcm',
    id,
    verb,
    prompt: verb.fr,
    answer: verb.lb,
    options: shuffle([verb.lb, ...distractors], rng),
  }
}

export function makeWriteQuestion(id: string, verb: Verb, pool: readonly Verb[]): WriteQuestion {
  // Verbs sharing the French translation are accepted too (e.g. "(sech) undinn" / "(sech) undoen")
  const synonyms = pool.filter((other) => other.fr === verb.fr)
  const forms = [...new Set([verb, ...synonyms].flatMap(accepted))]
  return {
    mode: 'write',
    id,
    verb,
    prompt: verb.fr,
    answer: verb.lb,
    accepted: forms,
    others: pool.filter((other) => other.fr !== verb.fr).flatMap(accepted),
  }
}

/** "correct", "accents" or "typo" (both accepted, with a remark), or "wrong" */
export type DrillVerdict = 'correct' | 'accents' | 'typo' | 'wrong'

export function checkWritten(question: WriteQuestion, input: string): DrillVerdict {
  const given = normalizeAnswer(input)
  if (!given) return 'wrong'
  if (question.accepted.includes(given)) return 'correct'
  const bare = stripAccents(given)
  if (question.accepted.some((form) => stripAccents(form) === bare)) return 'accents'
  // Another verb of the list is a wrong answer, never a typo
  if (question.others.some((form) => stripAccents(form) === bare)) return 'wrong'
  const close = question.accepted.some((form) => {
    const budget = typoBudget(form)
    return budget > 0 && editDistance(bare, stripAccents(form), budget) <= budget
  })
  return close ? 'typo' : 'wrong'
}

export function isQcmCorrect(question: QcmQuestion, choice: string | null): boolean {
  return choice !== null && choice === question.answer
}

/**
 * Endless question stream: every verb of the pool is asked once before any repeat,
 * and the same verb is never asked twice in a row when the pool shrinks.
 */
export class DrillDeck {
  private readonly pool: readonly Verb[]
  private readonly mode: DrillMode
  private readonly rng: Rng
  private bag: Verb[] = []
  private counter = 0
  private last: string | null = null

  constructor(pool: readonly Verb[], mode: DrillMode, rng: Rng = Math.random) {
    this.pool = pool
    this.mode = mode
    this.rng = rng
  }

  next(): DrillQuestion | null {
    if (this.pool.length === 0) return null
    if (this.bag.length === 0) this.bag = shuffle(this.pool, this.rng)
    let verb = this.bag.pop() as Verb
    if (this.pool.length > 1 && verb.lb + verb.fr === this.last && this.bag.length > 0) {
      const other = this.bag.pop() as Verb
      this.bag.push(verb)
      verb = other
    }
    this.last = verb.lb + verb.fr
    const id = `drill-${this.mode}-${this.counter++}`
    return this.mode === 'qcm'
      ? makeQcmQuestion(id, verb, this.pool, this.rng)
      : makeWriteQuestion(id, verb, this.pool)
  }
}
