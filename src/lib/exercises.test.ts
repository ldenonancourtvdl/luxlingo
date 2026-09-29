import { describe, expect, it } from 'vitest'
import type { Theme } from '../data/types'
import {
  buildSession,
  canWrite,
  checkWrite,
  type Exercise,
  isOrderCorrect,
  isReadingCorrect,
  isTranslateCorrect,
  makeOrderExercise,
  makeReadingExercise,
  makeTranslateExercise,
  makeWriteExercise,
  normalizeAnswer,
  reshuffle,
  tokenize,
} from './exercises'

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const theme = (id: string, vocab: number, sentences: number, readings = 0): Theme => ({
  id,
  title: id,
  titleFr: id,
  vocab: Array.from({ length: vocab }, (_, i) => ({ lb: `${id}-lb${i}`, fr: `${id}-fr${i}` })),
  sentences: Array.from({ length: sentences }, (_, i) => ({
    lb: `Ech ${id} wuert${i} haut.`,
    fr: `${id} phrase ${i}`,
  })),
  readings: Array.from({ length: readings }, (_, i) => ({
    title: `Text ${i}`,
    text: 'De Paul wunnt zu Esch.',
    textFr: 'Paul habite à Esch.',
    questions: [
      { lb: 'De Paul wunnt zu Esch.', fr: 'Paul habite à Esch.', answer: true },
      { lb: 'De Paul wunnt zu Diekrech.', fr: 'Paul habite à Diekirch.', answer: false },
    ],
  })),
})

/** The text that identifies what an exercise asks, to detect duplicates. */
const promptOf = (e: Exercise) => {
  switch (e.kind) {
    case 'order':
    case 'write':
      return e.answer.toLowerCase()
    case 'translate':
      return e.prompt.toLowerCase()
    case 'reading':
      return e.id
  }
}

const countKind = (session: Exercise[], kind: Exercise['kind']) => session.filter((e) => e.kind === kind).length

describe('tokenize', () => {
  it('splits on spaces and strips edge punctuation but keeps apostrophes', () => {
    expect(tokenize("Wéi fuert Dir op d'Aarbecht?")).toEqual(['Wéi', 'fuert', 'Dir', 'op', "d'Aarbecht"])
    expect(tokenize('Moien, ech sinn den Tom!')).toEqual(['Moien', 'ech', 'sinn', 'den', 'Tom'])
    expect(tokenize('Wéi ass Är E-Mail-Adress ?')).toEqual(['Wéi', 'ass', 'Är', 'E-Mail-Adress'])
  })
})

describe('order exercise', () => {
  const sentence = { lb: 'Ech schaffen haut.', fr: "Je travaille aujourd'hui.", alt: ['Haut schaffen ech.'] }

  it('creates one tile per word, shuffled away from a correct order', () => {
    for (let seed = 0; seed < 20; seed++) {
      const ex = makeOrderExercise('x', sentence, seeded(seed))
      expect(ex.tiles.map((t) => t.text).sort()).toEqual(['Ech', 'haut', 'schaffen'])
      expect(isOrderCorrect(ex, ex.tiles.map((t) => t.text))).toBe(false)
    }
  })

  it('accepts the main answer and alternatives, case-insensitively', () => {
    const ex = makeOrderExercise('x', sentence)
    expect(isOrderCorrect(ex, ['Ech', 'schaffen', 'haut'])).toBe(true)
    expect(isOrderCorrect(ex, ['haut', 'schaffen', 'Ech'])).toBe(true)
    expect(isOrderCorrect(ex, ['schaffen', 'Ech', 'haut'])).toBe(false)
    expect(isOrderCorrect(ex, ['Ech', 'schaffen'])).toBe(false)
  })

  it('treats typographic apostrophes like straight ones', () => {
    const ex = makeOrderExercise('x', { lb: "Ech ginn op d'Aarbecht.", fr: 'Je vais au travail.' })
    expect(isOrderCorrect(ex, ['Ech', 'ginn', 'op', 'd’Aarbecht'])).toBe(true)
  })
})

describe('translate exercise', () => {
  it('has 4 distinct options including the answer, preferring the first pool', () => {
    const ex = makeTranslateExercise(
      'x',
      { lb: 'de Bäcker', fr: 'le boulanger' },
      [['le boulanger', 'le pain', 'la boulangerie', 'le gâteau'], ['le chien', 'le chat']],
      seeded(3),
    )
    expect(ex.options).toHaveLength(4)
    expect(new Set(ex.options).size).toBe(4)
    expect(ex.options).toContain('le boulanger')
    expect(ex.options).not.toContain('le chien')
    expect(isTranslateCorrect(ex, 'le boulanger')).toBe(true)
    expect(isTranslateCorrect(ex, 'le pain')).toBe(false)
    expect(isTranslateCorrect(ex, null)).toBe(false)
  })

  it('falls back to wider pools when the theme is too small', () => {
    const ex = makeTranslateExercise('x', { lb: 'a', fr: 'A' }, [['A', 'B'], ['C', 'D', 'E']], seeded(1))
    expect(ex.options).toHaveLength(4)
    expect(ex.options).toContain('B')
  })
})

describe('write exercise', () => {
  it('normalizes case, punctuation, apostrophes and spacing', () => {
    expect(normalizeAnswer("  D’ Stad ! ")).toBe("d'stad")
    expect(normalizeAnswer('Moien, wéi geet et?')).toBe('moien wéi geet et')
  })

  it('accepts the answer with tolerant formatting and flags missing accents', () => {
    const ex = makeWriteExercise('x', { lb: "d'Bréck", fr: 'le pont' })
    expect(ex.withArticle).toBe(true)
    expect(checkWrite(ex, "d'Bréck")).toBe('correct')
    expect(checkWrite(ex, 'D’bréck.')).toBe('correct')
    expect(checkWrite(ex, "d' Bréck")).toBe('correct')
    expect(checkWrite(ex, "d'Breck")).toBe('accents')
    expect(checkWrite(ex, 'Bréck')).toBe('wrong')
    expect(checkWrite(ex, '')).toBe('wrong')
  })

  it('respects the n-rule: the article must be exact', () => {
    const ex = makeWriteExercise('x', { lb: 'den Owend', fr: 'le soir' })
    expect(checkWrite(ex, 'den Owend')).toBe('correct')
    expect(checkWrite(ex, 'de Owend')).toBe('wrong')
  })

  it('accepts "a / b" variants and synonyms', () => {
    const ex = makeWriteExercise('x', { lb: 'oft / dacks', fr: 'souvent' }, ['heefeg'])
    expect(ex.withArticle).toBe(false)
    for (const answer of ['oft', 'dacks', 'Heefeg']) expect(checkWrite(ex, answer), answer).toBe('correct')
    expect(checkWrite(ex, 'oft / dacks')).toBe('wrong')
  })

  it('only asks short, typeable vocabulary', () => {
    expect(canWrite({ lb: 'de Bäcker', fr: 'le boulanger' })).toBe(true)
    expect(canWrite({ lb: 'Ech hunn haut keng Zäit.', fr: "Je n'ai pas le temps aujourd'hui." })).toBe(false)
  })
})

describe('reading exercise', () => {
  it('is correct only when every statement is judged correctly', () => {
    const ex = makeReadingExercise('r', theme('t', 0, 0, 1).readings![0])
    expect(ex.statements).toHaveLength(2)
    expect(isReadingCorrect(ex, [true, false])).toBe(true)
    expect(isReadingCorrect(ex, [true, true])).toBe(false)
    expect(isReadingCorrect(ex, [true, null])).toBe(false)
  })
})

describe('buildSession', () => {
  it('builds 10 unique exercises mixing all kinds', () => {
    for (let seed = 0; seed < 30; seed++) {
      const session = buildSession([theme('t1', 15, 10, 2)], undefined, 10, seeded(seed))
      expect(session).toHaveLength(10)
      expect(new Set(session.map((e) => e.id)).size).toBe(10)
      expect(countKind(session, 'reading')).toBe(1)
      expect(countKind(session, 'order')).toBeGreaterThanOrEqual(3)
      expect(countKind(session, 'order')).toBeLessThanOrEqual(4)
      expect(countKind(session, 'write')).toBeGreaterThanOrEqual(2)
      expect(countKind(session, 'write')).toBeLessThanOrEqual(3)
      expect(countKind(session, 'translate')).toBeGreaterThanOrEqual(2)
    }
  })

  it('works without reading texts', () => {
    const session = buildSession([theme('t1', 15, 10)], undefined, 10, seeded(4))
    expect(session).toHaveLength(10)
    expect(countKind(session, 'reading')).toBe(0)
  })

  it('mixes several themes and uses chapter themes for distractors', () => {
    const small = theme('small', 2, 1)
    const session = buildSession([small], [small, theme('other', 10, 5)], 10, seeded(7))
    expect(session).toHaveLength(3)
    for (const ex of session) {
      if (ex.kind === 'translate') expect(ex.options).toHaveLength(4)
    }
  })

  it('tops up with sentences when there is little vocabulary', () => {
    const session = buildSession([theme('t', 1, 12)], undefined, 10, seeded(2))
    expect(session).toHaveLength(10)
    expect(new Set(session.map((e) => e.id)).size).toBe(10)
  })

  it('never asks the same Luxembourgish text twice', () => {
    const t = theme('t', 12, 10)
    t.vocab.push(...t.sentences.map((s) => ({ lb: s.lb, fr: s.fr.toUpperCase() })))
    for (let seed = 0; seed < 50; seed++) {
      const session = buildSession([t, { ...t, id: 'copy' }], undefined, 10, seeded(seed))
      expect(new Set(session.map(promptOf)).size).toBe(session.length)
      expect(session).toHaveLength(10)
    }
  })

  it('accepts synonyms from the chapter in writing exercises', () => {
    const a: Theme = { ...theme('a', 0, 0), vocab: [{ lb: 'dacks', fr: 'souvent' }] }
    const b: Theme = { ...theme('b', 0, 0), vocab: [{ lb: 'oft', fr: 'souvent' }] }
    const session = buildSession([a], [a, b], 10, seeded(1))
    const write = session.find((e) => e.kind === 'write')
    expect(write && checkWrite(write, 'oft')).toBe('correct')
  })
})

describe('reshuffle', () => {
  it('keeps the same content', () => {
    const ex = makeOrderExercise('x', { lb: 'Ech wunnen zu Lëtzebuerg.', fr: "J'habite à Luxembourg." })
    const again = reshuffle(ex)
    expect(again.kind).toBe('order')
    if (again.kind === 'order') {
      expect(again.tiles.map((t) => t.id).sort()).toEqual(ex.tiles.map((t) => t.id).sort())
    }
  })
})
