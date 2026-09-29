import { describe, expect, it } from 'vitest'
import { buildSession, normalizeToken, tokenize } from '../lib/exercises'
import { chapters } from '.'

const words = (s: string) => tokenize(s).map(normalizeToken).sort().join(' ')

describe('chapter content', () => {
  it('has the 6 chapters of the book in order', () => {
    expect(chapters.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('has unique theme ids', () => {
    const ids = chapters.flatMap((c) => c.themes.map((t) => t.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every theme and every chapter mix yields 10 exercises with 4 options', () => {
    for (const chapter of chapters) {
      for (const themes of [chapter.themes, ...chapter.themes.map((t) => [t])]) {
        for (let run = 0; run < 20; run++) {
          const session = buildSession(themes, chapter.themes)
          expect(session, themes.map((t) => t.id).join()).toHaveLength(10)
          for (const ex of session) {
            if (ex.kind === 'translate') expect(ex.options, ex.prompt).toHaveLength(4)
            else expect(ex.tiles.length, ex.answer).toBeGreaterThanOrEqual(2)
          }
        }
      }
    }
  })

  for (const chapter of chapters) {
    describe(`Kapitel ${chapter.id}`, () => {
      it('has chapter metadata', () => {
        expect(chapter.title).toBeTruthy()
        expect(chapter.titleFr).toBeTruthy()
        expect(chapter.descriptionFr).toBeTruthy()
        expect(chapter.page).toBeGreaterThan(0)
        expect(chapter.themes.length).toBeGreaterThan(0)
      })

      for (const theme of chapter.themes) {
        it(`${theme.id} is well-formed`, () => {
          expect(theme.id).toMatch(new RegExp(`^k${chapter.id}-[a-z0-9-]+$`))
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
      }
    })
  }
})
