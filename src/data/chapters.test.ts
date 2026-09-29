import { describe, expect, it } from 'vitest'
import { buildSession, canWrite, checkWrite, makeWriteExercise, normalizeToken, tokenize } from '../lib/exercises'
import { chapters, levels } from '.'

const words = (s: string) => tokenize(s).map(normalizeToken).sort().join(' ')

describe('chapter content', () => {
  it('has the chapters of both books in order, A1 before A2', () => {
    expect(levels.map((l) => l.id)).toEqual(['A1', 'A2'])
    expect(levels[0].chapters.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(levels[1].chapters.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(chapters.map((c) => c.key)).toEqual([...levels[0].chapters, ...levels[1].chapters].map((c) => c.key))
  })

  it('has unique chapter keys and theme ids', () => {
    const keys = chapters.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
    const ids = chapters.flatMap((c) => c.themes.map((t) => t.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every theme and every chapter mix yields 10 varied exercises', () => {
    for (const chapter of chapters) {
      for (const themes of [chapter.themes, ...chapter.themes.map((t) => [t])]) {
        for (let run = 0; run < 20; run++) {
          const session = buildSession(themes, chapter.themes)
          const where = themes.map((t) => t.id).join()
          expect(session, where).toHaveLength(10)
          expect(session.filter((e) => e.kind === 'reading'), where).toHaveLength(1)
          expect(session.filter((e) => e.kind === 'write').length, where).toBeGreaterThanOrEqual(2)
          for (const ex of session) {
            if (ex.kind === 'translate') expect(ex.options, ex.prompt).toHaveLength(4)
            if (ex.kind === 'order') expect(ex.tiles.length, ex.answer).toBeGreaterThanOrEqual(2)
          }
        }
      }
    }
  })

  for (const chapter of chapters) {
    describe(`${chapter.level} Kapitel ${chapter.id}`, () => {
      it('has chapter metadata', () => {
        expect(chapter.title).toBeTruthy()
        expect(chapter.titleFr).toBeTruthy()
        expect(chapter.descriptionFr).toBeTruthy()
        expect(chapter.page).toBeGreaterThan(0)
        expect(chapter.themes.length).toBeGreaterThan(0)
      })

      for (const theme of chapter.themes) {
        it(`${theme.id} is well-formed`, () => {
          expect(theme.id).toMatch(new RegExp(`^${chapter.level.toLowerCase()}-k${chapter.id}-[a-z0-9-]+$`))
          expect(theme.title && theme.titleFr).toBeTruthy()
          expect(theme.vocab.length).toBeGreaterThanOrEqual(8)
          expect(theme.sentences.length).toBeGreaterThanOrEqual(6)

          for (const list of [theme.vocab, theme.sentences]) {
            for (const item of list) {
              expect(item.lb.trim(), JSON.stringify(item)).toBe(item.lb)
              expect(item.fr.trim(), JSON.stringify(item)).toBe(item.fr)
              expect(item.lb.length && item.fr.length).toBeTruthy()
            }
            const lb = list.map((i) => i.lb.toLowerCase())
            const fr = list.map((i) => i.fr.toLowerCase())
            expect(lb.filter((x, i) => lb.indexOf(x) !== i), 'duplicate lb').toEqual([])
            expect(fr.filter((x, i) => fr.indexOf(x) !== i), 'duplicate fr').toEqual([])
          }

          for (const s of theme.sentences) {
            const n = tokenize(s.lb).length
            expect(n, s.lb).toBeGreaterThanOrEqual(2)
            expect(n, s.lb).toBeLessThanOrEqual(10)
            expect(s.lb, 'ends with punctuation').toMatch(/[.?!]$/)
            for (const alt of s.alt ?? []) {
              expect(words(alt), `alt of "${s.lb}" must use the same words`).toBe(words(s.lb))
              expect(normalizeToken(tokenize(alt).join(' ')), 'alt differs').not.toBe(normalizeToken(tokenize(s.lb).join(' ')))
            }
          }
        })

        it(`${theme.id} vocabulary can be written`, () => {
          const writable = theme.vocab.filter(canWrite)
          expect(writable.length).toBeGreaterThanOrEqual(3)
          for (const item of writable) {
            const ex = makeWriteExercise('x', item)
            for (const variant of item.lb.split(' / ')) expect(checkWrite(ex, variant), item.lb).toBe('correct')
          }
        })

        it(`${theme.id} has reading texts`, () => {
          const readings = theme.readings ?? []
          expect(readings).toHaveLength(2)
          for (const r of readings) {
            expect(r.title && r.text && r.textFr, r.title).toBeTruthy()
            expect(r.questions.length, r.title).toBeGreaterThanOrEqual(4)
            expect(r.questions.length, r.title).toBeLessThanOrEqual(5)
            expect(r.questions.filter((q) => q.answer === true).length, r.title).toBeGreaterThanOrEqual(2)
            expect(r.questions.filter((q) => q.answer === false).length, r.title).toBeGreaterThanOrEqual(2)
            for (const q of r.questions) expect(q.lb && q.fr, r.title).toBeTruthy()
          }
        })
      }
    })
  }
})
