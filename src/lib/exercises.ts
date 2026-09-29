import type { Sentence, Theme, VocabItem } from '../data/types'
import { type Rng, sample, shuffle } from './random'

export interface Tile {
  id: string
  text: string
}

export interface OrderExercise {
  kind: 'order'
  id: string
  /** French sentence to translate */
  prompt: string
  /** Correct Luxembourgish sentence, as displayed in feedback */
  answer: string
  /** Every accepted word order, as normalized token lists */
  accepted: string[][]
  tiles: Tile[]
}

export interface TranslateExercise {
  kind: 'translate'
  id: string
  /** Luxembourgish word or sentence */
  prompt: string
  /** Correct French translation */
  answer: string
  options: string[]
}

export type Exercise = OrderExercise | TranslateExercise

export const SESSION_LENGTH = 10
const OPTION_COUNT = 4

const EDGE_PUNCTUATION = /^[.,!?;:…«»"“”„()]+|[.,!?;:…«»"“”„()]+$/g

export function tokenize(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((word) => word.replace(EDGE_PUNCTUATION, ''))
    .filter(Boolean)
}

export function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[’‘`´]/g, "'")
}

function normalizeText(text: string): string {
  return normalizeToken(text).replace(/\s+/g, ' ').trim()
}

export function isOrderCorrect(exercise: OrderExercise, words: string[]): boolean {
  const given = words.map(normalizeToken).join(' ')
  return exercise.accepted.some((tokens) => tokens.join(' ') === given)
}

export function isTranslateCorrect(exercise: TranslateExercise, choice: string | null): boolean {
  return choice !== null && normalizeText(choice) === normalizeText(exercise.answer)
}

function shuffleTiles(tiles: Tile[], accepted: string[][], rng: Rng): Tile[] {
  const canDiffer = new Set(tiles.map((t) => normalizeToken(t.text))).size > 1
  let result = shuffle(tiles, rng)
  for (let attempt = 0; canDiffer && attempt < 20; attempt++) {
    const order = result.map((t) => normalizeToken(t.text)).join(' ')
    if (!accepted.some((tokens) => tokens.join(' ') === order)) break
    result = shuffle(tiles, rng)
  }
  return result
}

export function makeOrderExercise(id: string, sentence: Sentence, rng: Rng = Math.random): OrderExercise {
  const accepted = [sentence.lb, ...(sentence.alt ?? [])].map((s) => tokenize(s).map(normalizeToken))
  const tiles = tokenize(sentence.lb).map((text, i) => ({ id: `${id}#${i}`, text }))
  return {
    kind: 'order',
    id,
    prompt: sentence.fr,
    answer: sentence.lb,
    accepted,
    tiles: shuffleTiles(tiles, accepted, rng),
  }
}

/** Picks distractors from the pools in priority order (e.g. same theme first, then same chapter). */
function pickDistractors(answer: string, pools: string[][], count: number, rng: Rng): string[] {
  const chosen: string[] = []
  const seen = new Set([normalizeText(answer)])
  for (const pool of pools) {
    for (const candidate of shuffle(pool, rng)) {
      if (chosen.length >= count) return chosen
      const key = normalizeText(candidate)
      if (seen.has(key)) continue
      seen.add(key)
      chosen.push(candidate)
    }
  }
  return chosen
}

export function makeTranslateExercise(
  id: string,
  item: VocabItem | Sentence,
  distractorPools: string[][],
  rng: Rng = Math.random,
): TranslateExercise {
  const distractors = pickDistractors(item.fr, distractorPools, OPTION_COUNT - 1, rng)
  return {
    kind: 'translate',
    id,
    prompt: item.lb,
    answer: item.fr,
    options: shuffle([item.fr, ...distractors], rng),
  }
}

/** Returns a copy of the exercise with tiles / options shuffled again (used to retry mistakes). */
export function reshuffle(exercise: Exercise, rng: Rng = Math.random): Exercise {
  if (exercise.kind === 'order') {
    return { ...exercise, tiles: shuffleTiles(exercise.tiles, exercise.accepted, rng) }
  }
  return { ...exercise, options: shuffle(exercise.options, rng) }
}

interface Candidate {
  type: 'vocab' | 'sentence'
  theme: Theme
  index: number
  item: VocabItem | Sentence
}

/**
 * Builds a session of random exercises mixing "word order" and "translation".
 * `themes` are the selected themes; `contextThemes` (usually the whole chapter)
 * provide extra distractors when a theme is too small.
 */
export function buildSession(
  themes: Theme[],
  contextThemes: Theme[] = themes,
  count: number = SESSION_LENGTH,
  rng: Rng = Math.random,
): Exercise[] {
  const sentences: Candidate[] = themes.flatMap((theme) =>
    theme.sentences.map((item, index) => ({ type: 'sentence' as const, theme, index, item })),
  )
  const vocab: Candidate[] = themes.flatMap((theme) =>
    theme.vocab.map((item, index) => ({ type: 'vocab' as const, theme, index, item })),
  )

  // The same Luxembourgish text can exist as vocab and as a sentence: never ask it twice.
  const promptKey = (c: Candidate) => normalizeText(c.item.lb)
  const unique = (list: Candidate[], used = new Set<string>()) =>
    shuffle(list, rng).filter((c) => {
      const key = promptKey(c)
      if (used.has(key)) return false
      used.add(key)
      return true
    })

  // Roughly half word-order exercises (4 to 6 out of 10).
  const targetOrder = Math.round(count / 2) + Math.floor(rng() * 3) - 1
  const orderPool = unique(sentences)
  const orderPicks = orderPool.slice(0, Math.min(orderPool.length, Math.max(0, targetOrder)))
  const leftoverSentences = orderPool.slice(orderPicks.length)

  // Translation: mostly vocabulary, plus a couple of whole sentences.
  const used = new Set(orderPicks.map(promptKey))
  const translatePool = unique([...vocab, ...sample(leftoverSentences, 2, rng)], used)
  const translatePicks = translatePool.slice(0, count - orderPicks.length)

  // Not enough vocabulary: top up with more word-order exercises.
  const missing = count - orderPicks.length - translatePicks.length
  if (missing > 0) {
    const taken = new Set([...orderPicks, ...translatePicks].map(promptKey))
    orderPicks.push(...leftoverSentences.filter((s) => !taken.has(promptKey(s))).slice(0, missing))
  }

  const frOf = (type: Candidate['type'], list: Theme[]) =>
    list.flatMap((t) => (type === 'vocab' ? t.vocab : t.sentences).map((i) => i.fr))

  const exercises: Exercise[] = [
    ...orderPicks.map(({ theme, index, item }) => makeOrderExercise(`${theme.id}/s${index}/order`, item, rng)),
    ...translatePicks.map(({ type, theme, index, item }) =>
      makeTranslateExercise(
        `${theme.id}/${type === 'vocab' ? 'v' : 's'}${index}/translate`,
        item,
        [frOf(type, [theme]), frOf(type, themes), frOf(type, contextThemes)],
        rng,
      ),
    ),
  ]
  return shuffle(exercises, rng)
}
