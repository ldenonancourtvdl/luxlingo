import { describe, expect, it } from 'vitest'
import { verbs } from '../data'
import { shuffle } from './random'
import { searchKey } from './verbs'
import type { Verb } from '../data/types'
import {
  checkWritten,
  DrillDeck,
  editDistance,
  isQcmCorrect,
  makeQcmQuestion,
  makeWriteQuestion,
  OPTION_COUNT,
  similarity,
  typoBudget,
} from './verbDrill'

const verb = (lb: string, fr: string, extra: Partial<Verb> = {}): Verb => ({
  lb,
  fr,
  forms: ['', '', '', '', '', ''],
  red: [],
  levels: ['A1'],
  ...extra,
})

const pool: Verb[] = [
  verb('kafen', 'acheter'),
  verb('akafen', 'faire les courses'),
  verb('lafen', 'courir'),
  verb('schwammen', 'nager'),
  verb('lauschteren', 'écouter'),
  verb('(sech) bestueden', 'se marier'),
  verb('sech freeën', 'se réjouir'),
  verb('(sech) undinn', 'mettre ; s’habiller'),
  verb('(sech) undoen', 'mettre ; s’habiller'),
  verb('telefonéieren', 'téléphoner'),
  verb('organiséieren', 'organiser'),
  verb('decidéieren', 'décider'),
]

const find = (lb: string) => pool.find((v) => v.lb === lb) as Verb
/** Deterministic rng for the tests */
const seeded = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

describe('editDistance', () => {
  it('counts insertions, deletions and substitutions', () => {
    expect(editDistance('kafen', 'kafen')).toBe(0)
    expect(editDistance('kafen', 'akafen')).toBe(1)
    expect(editDistance('kafen', 'kaffen')).toBe(1)
    expect(editDistance('kafen', 'kofen')).toBe(1)
    expect(editDistance('kafen', '')).toBe(5)
  })

  it('stops early above the ceiling', () => {
    expect(editDistance('lauschteren', 'schwammen', 2)).toBeGreaterThan(2)
    expect(editDistance('kafen', 'kaffen', 1)).toBe(1)
  })
})

describe('similarity', () => {
  it('ranks look-alike verbs higher', () => {
    expect(similarity('kafen', 'akafen')).toBeGreaterThan(similarity('kafen', 'schwammen'))
    expect(similarity('kafen', 'kafen')).toBe(1)
  })
})

describe('typoBudget', () => {
  it('tolerates nothing on very short verbs, more on long ones', () => {
    expect(typoBudget('ginn')).toBe(0)
    expect(typoBudget('kafen')).toBe(1)
    expect(typoBudget('schwammen')).toBe(2)
  })
})

describe('makeQcmQuestion', () => {
  const question = makeQcmQuestion('q1', find('kafen'), pool, seeded(7))

  it('asks the French and offers Luxembourgish options', () => {
    expect(question.prompt).toBe('acheter')
    expect(question.answer).toBe('kafen')
    expect(question.options).toHaveLength(OPTION_COUNT)
    expect(question.options).toContain('kafen')
    expect(new Set(question.options).size).toBe(OPTION_COUNT)
  })

  it('varies the distractors from one draw to the next', () => {
    const draws = new Set(
      Array.from({ length: 20 }, (_, i) => makeQcmQuestion('q', find('kafen'), pool, seeded(i + 1)).options.join('|')),
    )
    expect(draws.size).toBeGreaterThan(3)
  })

  it('never offers two verbs with the same translation', () => {
    for (let seed = 1; seed < 30; seed++) {
      const options = makeQcmQuestion('q', find('(sech) undinn'), pool, seeded(seed)).options
      expect(options).not.toContain('(sech) undoen')
    }
  })

  it('checks the chosen option', () => {
    expect(isQcmCorrect(question, 'kafen')).toBe(true)
    expect(isQcmCorrect(question, 'akafen')).toBe(false)
    expect(isQcmCorrect(question, null)).toBe(false)
  })
})

describe('checkWritten', () => {
  const ask = (lb: string) => makeWriteQuestion('w', find(lb), pool)

  it('accepts the exact infinitive', () => {
    expect(checkWritten(ask('kafen'), 'kafen')).toBe('correct')
    expect(checkWritten(ask('kafen'), '  Kafen ')).toBe('correct')
  })

  it('accepts the reflexive infinitive with or without the pronoun', () => {
    const q = ask('(sech) bestueden')
    expect(checkWritten(q, 'bestueden')).toBe('correct')
    expect(checkWritten(q, 'sech bestueden')).toBe('correct')
    expect(checkWritten(q, '(sech) bestueden')).toBe('correct')
    expect(checkWritten(ask('sech freeën'), 'freeën')).toBe('correct')
  })

  it('accepts another verb with the same translation', () => {
    expect(checkWritten(ask('(sech) undinn'), 'undoen')).toBe('correct')
  })

  it('reports a missing accent but counts it as correct', () => {
    expect(checkWritten(ask('telefonéieren'), 'telefoneieren')).toBe('accents')
    expect(checkWritten(ask('sech freeën'), 'freeen')).toBe('accents')
  })

  it('tolerates a typo on long enough verbs', () => {
    expect(checkWritten(ask('lauschteren'), 'lauschtern')).toBe('typo')
    expect(checkWritten(ask('lauschteren'), 'laushteren')).toBe('typo')
    expect(checkWritten(ask('schwammen'), 'schwamen')).toBe('typo')
    expect(checkWritten(ask('kafen'), 'kafeen')).toBe('typo')
  })

  it('never accepts another verb of the list as a typo', () => {
    expect(checkWritten(ask('kafen'), 'akafen')).toBe('wrong')
    expect(checkWritten(ask('kafen'), 'lafen')).toBe('wrong')
    expect(checkWritten(ask('akafen'), 'kafen')).toBe('wrong')
  })

  it('rejects an empty or too different answer', () => {
    expect(checkWritten(ask('kafen'), '   ')).toBe('wrong')
    expect(checkWritten(ask('kafen'), 'schwammen')).toBe('wrong')
    expect(checkWritten(ask('schwammen'), 'schwimmen')).toBe('typo')
    expect(checkWritten(ask('schwammen'), 'nager')).toBe('wrong')
  })
})

describe('DrillDeck', () => {
  it('asks every verb before repeating one', () => {
    const deck = new DrillDeck(pool, 'write', seeded(3))
    const asked = Array.from({ length: pool.length }, () => deck.next()?.answer)
    expect(new Set(asked).size).toBe(pool.length)
    expect(deck.next()).not.toBeNull()
  })

  it('never asks the same verb twice in a row', () => {
    const deck = new DrillDeck(pool, 'qcm', seeded(11))
    let previous = ''
    for (let i = 0; i < 60; i++) {
      const question = deck.next()
      expect(question?.answer).not.toBe(previous)
      previous = question?.answer ?? ''
    }
  })

  it('builds questions of the requested mode with unique ids', () => {
    const deck = new DrillDeck(pool, 'qcm', seeded(5))
    const first = deck.next()
    const second = deck.next()
    expect(first?.mode).toBe('qcm')
    expect(first?.id).not.toBe(second?.id)
  })

  it('returns nothing when there is no verb', () => {
    expect(new DrillDeck([], 'qcm').next()).toBeNull()
  })
})

describe('drill on the real verb list', () => {
  /** Compare the infinitives the way the drill does: no reflexive pronoun, no accents */
  const bare = (lb: string) => searchKey(lb.replace(/^\(?sech\)?\s+/, ''))
  const meanSimilarity = (answer: string, options: string[]) => {
    const scores = options.filter((o) => o !== answer).map((o) => similarity(bare(answer), bare(o)))
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }

  it('picks distractors that look like the answer', () => {
    let drawn = 0
    let random = 0
    for (const [i, v] of verbs.entries()) {
      const { options } = makeQcmQuestion(`q${i}`, v, verbs, seeded(i + 1))
      drawn += meanSimilarity(v.lb, options)
      random += meanSimilarity(v.lb, shuffle(verbs, seeded(i + 500)).slice(0, 3).map((o) => o.lb))
      for (const option of options) {
        if (option !== v.lb) expect(similarity(bare(v.lb), bare(option)), `${v.lb} / ${option}`).toBeGreaterThan(0.33)
      }
    }
    // Look-alike distractors, clearly closer than a random draw
    expect(drawn / verbs.length).toBeGreaterThan(0.5)
    expect(drawn).toBeGreaterThan(random * 1.5)
  })

  it('builds valid QCM questions for every verb', () => {
    for (const [i, v] of verbs.entries()) {
      const question = makeQcmQuestion(`q${i}`, v, verbs, seeded(i + 1))
      expect(question.options, v.lb).toHaveLength(OPTION_COUNT)
      expect(new Set(question.options).size, v.lb).toBe(OPTION_COUNT)
      expect(question.options, v.lb).toContain(v.lb)
      const translations = question.options.map((o) => verbs.find((x) => x.lb === o)?.fr)
      expect(new Set(translations).size, v.lb).toBe(OPTION_COUNT)
    }
  })

  it('accepts the expected spellings of real verbs', () => {
    const ask = (lb: string) => makeWriteQuestion('w', verbs.find((v) => v.lb === lb) as Verb, verbs)
    expect(checkWritten(ask('lauschteren'), 'lauschteren')).toBe('correct')
    expect(checkWritten(ask('(sech) wäschen'), 'waschen')).toBe('accents')
    expect(checkWritten(ask('spadséieren'), 'spadseieren')).toBe('accents')
    expect(checkWritten(ask('buschtawéieren'), 'buschtaweiren')).toBe('typo')
    expect(checkWritten(ask('ginn'), 'sinn')).toBe('wrong')
    expect(checkWritten(ask('goen'), 'ginn')).toBe('wrong')
    expect(checkWritten(ask('kafen'), 'verkafen')).toBe('wrong')
  })

  it('accepts both spellings when two verbs share a translation', () => {
    const ask = (lb: string) => makeWriteQuestion('w', verbs.find((v) => v.lb === lb) as Verb, verbs)
    expect(checkWritten(ask('(sech) undinn'), 'undoen')).toBe('correct')
    expect(checkWritten(ask('(sech) undoen'), 'undinn')).toBe('correct')
  })
})
