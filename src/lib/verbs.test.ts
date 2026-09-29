import { describe, expect, it } from 'vitest'
import { verbs } from '../data'
import type { Verb } from '../data/types'
import { filterVerbs, searchKey, sortVerbs } from './verbs'

const verb = (lb: string, fr: string, forms: string[], extra: Partial<Verb> = {}): Verb => ({
  lb,
  fr,
  forms,
  red: [],
  levels: ['A1'],
  ...extra,
})

const sample: Verb[] = [
  verb('kafen', 'acheter', ['kafen', 'keefs', 'keeft', 'kafen', 'kaaft', 'kafen'], { red: [1, 2], levels: ['A1', 'A2'] }),
  verb('akafen', 'faire les courses', ['kafen an', 'keefs an', 'keeft an', 'kafen an', 'kaaft an', 'kafen an']),
  verb('(sech) bestueden', 'se marier', ['bestueden (mech)', 'bestiits (dech)', 'bestit (sech)', 'bestueden (eis)', 'bestuet (iech)', 'bestueden (sech)'], { levels: ['A2'] }),
  verb('wëllen', 'vouloir', ['wëll', 'wëlls', 'wëll', 'wëllen', 'wëllt', 'wëllen'], { modal: true }),
  verb('wëllen', 'vouloir (+ nom)', ['wëll', 'wëlls', 'wëll', 'wëllen', 'wëllt', 'wëllen'], { levels: ['A2'], pc: 'ech hunn … gewollt' }),
  verb('äntweren', 'répondre', ['äntweren', 'äntwers', 'äntwert', 'äntweren', 'äntwert', 'äntweren']),
  verb('sech iren', 'se tromper', ['ire mech', 'iers dech', 'iert sech', 'iren eis', 'iert iech/Iech', 'ire sech'], { levels: ['A2'] }),
  verb('maachen', 'faire', ['maachen', 'mëss', 'mécht', 'maachen', 'maacht', 'maachen'], { red: [1, 2] }),
]

const names = (list: Verb[]) => list.map((v) => v.lb + (v.modal ? '*' : ''))

describe('searchKey', () => {
  it('ignores case, accents, ellipses and punctuation', () => {
    expect(searchKey('  Ëmgoen … (sech)! ')).toBe('emgoen sech')
    expect(searchKey('Répondre')).toBe('repondre')
  })
})

describe('sortVerbs', () => {
  it('sorts alphabetically without accents or the sech prefix, full verb before modal', () => {
    expect(names(sortVerbs(sample))).toEqual([
      'akafen',
      'äntweren',
      '(sech) bestueden',
      'sech iren',
      'kafen',
      'maachen',
      'wëllen',
      'wëllen*',
    ])
  })
})

describe('filterVerbs', () => {
  const sorted = sortVerbs(sample)

  it('returns everything for an empty query', () => {
    expect(filterVerbs(sorted, '   ')).toHaveLength(sample.length)
  })

  it('filters by level', () => {
    expect(names(filterVerbs(sorted, '', 'A2'))).toEqual(['(sech) bestueden', 'sech iren', 'kafen', 'wëllen'])
    expect(filterVerbs(sorted, '', 'A1')).toHaveLength(5)
  })

  it('finds a verb from a conjugated form, without accents', () => {
    expect(names(filterVerbs(sorted, 'keeft'))).toEqual(['kafen', 'akafen'])
    expect(names(filterVerbs(sorted, 'mecht'))).toEqual(['maachen'])
    expect(names(filterVerbs(sorted, 'gewollt'))).toEqual(['wëllen'])
  })

  it('finds a verb from its French translation, without accents', () => {
    expect(names(filterVerbs(sorted, 'repondre'))).toEqual(['äntweren'])
    expect(names(filterVerbs(sorted, 'marier'))).toEqual(['(sech) bestueden'])
  })

  it('ranks the infinitive before the French translation and the forms', () => {
    expect(names(filterVerbs(sorted, 'kafen'))).toEqual(['kafen', 'akafen'])
    expect(names(filterVerbs(sorted, 'faire'))).toEqual(['maachen', 'akafen'])
    expect(names(filterVerbs(sorted, 'bestueden'))[0]).toBe('(sech) bestueden')
    expect(names(filterVerbs(sorted, 'iren'))[0]).toBe('sech iren')
    expect(names(filterVerbs(sorted, 'antw'))).toEqual(['äntweren'])
  })

  it('combines the query with the level filter', () => {
    expect(names(filterVerbs(sorted, 'wellen', 'A2'))).toEqual(['wëllen'])
    expect(names(filterVerbs(sorted, 'vouloir'))).toEqual(['wëllen', 'wëllen*'])
    expect(filterVerbs(sorted, 'zzz')).toEqual([])
  })
})

describe('verb table data', () => {
  it('has the verbs of both lists (100 in A1, 144 in A2)', () => {
    expect(verbs.filter((v) => v.levels.includes('A1'))).toHaveLength(100)
    expect(verbs.filter((v) => v.levels.includes('A2'))).toHaveLength(144)
  })

  it('finds real verbs from their forms and translations', () => {
    expect(names(filterVerbs(verbs, 'keeft'))).toEqual(['kafen', 'akafen', 'verkafen'])
    expect(names(filterVerbs(verbs, 'mecht'))[0]).toBe('maachen')
    expect(names(filterVerbs(verbs, 'être'))[0]).toBe('sinn')
    expect(names(filterVerbs(verbs, 'ass'))).toContain('sinn')
  })

  it('has well-formed rows', () => {
    for (const v of verbs) {
      const where = `${v.lb}${v.modal ? ' (modal)' : ''}`
      expect(v.lb.trim(), where).not.toBe('')
      expect(v.fr.trim(), where).not.toBe('')
      expect(v.forms, where).toHaveLength(6)
      expect(v.forms.some((f) => f.trim() !== ''), where).toBe(true)
      for (const i of v.red) {
        expect(Number.isInteger(i) && i >= 0 && i < 6, where).toBe(true)
        expect(v.forms[i], where).not.toBe('')
      }
      expect(new Set(v.red).size, where).toBe(v.red.length)
      expect(v.levels.length, where).toBeGreaterThan(0)
      expect(v.levels.every((l) => l === 'A1' || l === 'A2'), where).toBe(true)
      if (v.pc !== undefined) expect(v.pc.trim(), where).not.toBe('')
    }
  })

  it('has unique rows and is sorted', () => {
    const keys = verbs.map((v) => `${v.lb}|${!!v.modal}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(names(sortVerbs(verbs))).toEqual(names(verbs))
  })
})
