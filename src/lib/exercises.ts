import type { Reading, ReadingStatement, Sentence, Theme, VocabItem } from '../data/types'
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

export interface WriteExercise {
  kind: 'write'
  id: string
  /** French word or expression */
  prompt: string
  /** Expected Luxembourgish answer, as displayed in feedback */
  answer: string
  /** Every accepted answer, normalized with normalizeAnswer */
  accepted: string[]
  /** True when the answer starts with a definite article the learner must type */
  withArticle: boolean
}

export interface ReadingExercise {
  kind: 'reading'
  id: string
  title: string
  text: string
  textFr: string
  statements: ReadingStatement[]
}

export type Exercise = OrderExercise | TranslateExercise | WriteExercise | ReadingExercise

export const SESSION_LENGTH = 10
const OPTION_COUNT = 4
/** Longest vocabulary item (in words) asked in a writing exercise */
const MAX_WRITE_WORDS = 3

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

/** Normalizes a typed answer: case, apostrophes, punctuation and spacing don't matter. */
export function normalizeAnswer(text: string): string {
  return normalizeToken(text.normalize('NFC'))
    .replace(/[.,!?;:…«»"“”„()¿¡]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/' /g, "'")
    .trim()
}

export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
}

export function isOrderCorrect(exercise: OrderExercise, words: string[]): boolean {
  const given = words.map(normalizeToken).join(' ')
  return exercise.accepted.some((tokens) => tokens.join(' ') === given)
}

export function isTranslateCorrect(exercise: TranslateExercise, choice: string | null): boolean {
  return choice !== null && normalizeText(choice) === normalizeText(exercise.answer)
}

/** "correct", "accents" (right apart from missing/wrong accents, counted as correct) or "wrong". */
export type WriteVerdict = 'correct' | 'accents' | 'wrong'

export function checkWrite(exercise: WriteExercise, input: string): WriteVerdict {
  const given = normalizeAnswer(input)
  if (!given) return 'wrong'
  if (exercise.accepted.includes(given)) return 'correct'
  const bare = stripAccents(given)
  if (exercise.accepted.some((a) => stripAccents(a) === bare)) return 'accents'
  return 'wrong'
}

export function isReadingCorrect(exercise: ReadingExercise, answers: (boolean | null)[]): boolean {
  return exercise.statements.every((s, i) => answers[i] === s.answer)
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

const ARTICLE = /^(d['’]|(de|den|dat|déi)\s)/i

/** Alternatives are written "oft / dacks". */
const variants = (lb: string) => lb.split(/\s+\/\s+/).map((v) => v.trim()).filter(Boolean)

/**
 * `synonyms` are other Luxembourgish words with the same French translation: they are accepted too.
 */
export function makeWriteExercise(id: string, item: VocabItem, synonyms: string[] = []): WriteExercise {
  const accepted = [...new Set([item.lb, ...synonyms].flatMap(variants).map(normalizeAnswer))]
  return {
    kind: 'write',
    id,
    prompt: item.fr,
    answer: item.lb,
    accepted,
    withArticle: variants(item.lb).every((v) => ARTICLE.test(v)),
  }
}

export function makeReadingExercise(id: string, reading: Reading): ReadingExercise {
  return { kind: 'reading', id, ...reading, statements: reading.questions }
}

export function canWrite(item: VocabItem): boolean {
  return variants(item.lb).every((v) => tokenize(v).length <= MAX_WRITE_WORDS) && !/[()[\]…]/.test(item.lb)
}

/** Returns a copy of the exercise with tiles / options shuffled again (used to retry mistakes). */
export function reshuffle(exercise: Exercise, rng: Rng = Math.random): Exercise {
  switch (exercise.kind) {
    case 'order':
      return { ...exercise, tiles: shuffleTiles(exercise.tiles, exercise.accepted, rng) }
    case 'translate':
      return { ...exercise, options: shuffle(exercise.options, rng) }
    default:
      return exercise
  }
}

interface Candidate {
  type: 'vocab' | 'sentence'
  theme: Theme
  index: number
  item: VocabItem | Sentence
}

const between = (min: number, max: number, rng: Rng) => min + Math.floor(rng() * (max - min + 1))

/**
 * Builds a session of random exercises. For 10 exercises: 1 reading text (when the themes have some),
 * 3-4 word-order, 2-3 writing and the rest multiple-choice translation.
 * `themes` are the selected themes; `contextThemes` (usually the whole chapter)
 * provide extra distractors and accepted synonyms when a theme is too small.
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
  const readings = themes.flatMap((theme) => (theme.readings ?? []).map((reading, index) => ({ theme, index, reading })))

  // The same Luxembourgish text can exist several times (vocab, sentence, other theme): never ask it twice.
  const promptKey = (c: Candidate) => normalizeText(c.item.lb)
  const used = new Set<string>()
  const take = (list: Candidate[], n: number) => {
    const picked: Candidate[] = []
    for (const c of shuffle(list, rng)) {
      if (picked.length >= n) break
      const key = promptKey(c)
      if (used.has(key)) continue
      used.add(key)
      picked.push(c)
    }
    return picked
  }

  const readingPicks = count >= 5 ? sample(readings, 1, rng) : []
  const orderPicks = take(sentences, between(3, 4, rng))
  const writePicks = take(
    vocab.filter((c) => canWrite(c.item)),
    between(2, 3, rng),
  )
  const translateTarget = count - readingPicks.length - orderPicks.length - writePicks.length
  const translatePicks = take([...vocab, ...sample(sentences, 2, rng)], translateTarget)

  // Not enough material: top up with whatever is left.
  const missing = () => count - readingPicks.length - orderPicks.length - writePicks.length - translatePicks.length
  if (missing() > 0) orderPicks.push(...take(sentences, missing()))
  if (missing() > 0) writePicks.push(...take(vocab.filter((c) => canWrite(c.item)), missing()))
  if (missing() > 0) translatePicks.push(...take([...vocab, ...sentences], missing()))

  const frOf = (type: Candidate['type'], list: Theme[]) =>
    list.flatMap((t) => (type === 'vocab' ? t.vocab : t.sentences).map((i) => i.fr))

  const synonymsOf = (item: VocabItem) => {
    const fr = normalizeText(item.fr)
    return [...themes, ...contextThemes].flatMap((t) => t.vocab.filter((v) => normalizeText(v.fr) === fr).map((v) => v.lb))
  }

  const exercises: Exercise[] = [
    ...readingPicks.map(({ theme, index, reading }) => makeReadingExercise(`${theme.id}/r${index}/reading`, reading)),
    ...orderPicks.map(({ theme, index, item }) => makeOrderExercise(`${theme.id}/s${index}/order`, item, rng)),
    ...writePicks.map(({ theme, index, item }) =>
      makeWriteExercise(`${theme.id}/v${index}/write`, item, synonymsOf(item)),
    ),
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
