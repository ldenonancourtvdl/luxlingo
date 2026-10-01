import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Verb } from '../data/types'
import {
  checkWritten,
  DrillDeck,
  type DrillMode,
  type DrillQuestion,
  isQcmCorrect,
} from '../lib/verbDrill'
import { type LevelFilter } from '../lib/verbs'
import { AnswerInput } from './AnswerInput'

export interface DrillResult {
  question: DrillQuestion
  correct: boolean
  given: string
  /** Remark shown with an answer accepted despite a typo or a missing accent */
  note?: string
}

interface Props {
  verbs: Verb[]
  mode: DrillMode
  onBack: () => void
}

const LEVELS: { id: LevelFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'A1', label: 'A1' },
  { id: 'A2', label: 'A2' },
]

const PRAISES = ['Super !', 'Bravo !', 'Richteg ! (Correct !)', 'Excellent !', 'Genau ! (Exactement !)', 'Top !']

const TITLES: Record<DrillMode, string> = {
  qcm: 'Quel est ce verbe en luxembourgeois ?',
  write: 'Écris ce verbe en luxembourgeois',
}

function verdictOf(score: number, total: number) {
  const ratio = total ? score / total : 0
  if (ratio === 1) return { emoji: '🏆', text: 'Perfekt ! Aucune erreur.' }
  if (ratio >= 0.8) return { emoji: '🎉', text: 'Super gemaach ! (Bien joué !)' }
  if (ratio >= 0.5) return { emoji: '💪', text: 'Net schlecht ! (Pas mal !)' }
  return { emoji: '📚', text: "Continue à t'entraîner, tu vas y arriver !" }
}

function Recap({ results, mode, onRestart, onBack }: { results: DrillResult[]; mode: DrillMode; onRestart: () => void; onBack: () => void }) {
  const score = results.filter((r) => r.correct).length
  const mistakes = results.filter((r) => !r.correct)
  const { emoji, text } = verdictOf(score, results.length)
  const percent = Math.round((score / results.length) * 100)

  return (
    <div className="page results">
      <header className="results__header">
        <div className="results__emoji" aria-hidden>
          {emoji}
        </div>
        <p className="results__title">{mode === 'qcm' ? 'Verbes · QCM' : 'Verbes · Écriture'}</p>
        <p className="results__score">
          <strong>{score}</strong>/{results.length}
        </p>
        <p className="results__verdict">
          {text} ({percent} %)
        </p>
      </header>

      <div className="results__actions">
        <button type="button" className="btn btn--primary" onClick={onRestart}>
          Nouvelle session
        </button>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          Retour à l'accueil
        </button>
      </div>

      {mistakes.length > 0 && (
        <section className="mistakes">
          <h2 className="section-title">Tes erreurs ({mistakes.length})</h2>
          <ul className="mistakes__list">
            {mistakes.map((result, i) => (
              <li key={`${result.question.id}-${i}`} className="mistake">
                <p className="mistake__prompt" lang="fr">
                  {result.question.prompt}
                </p>
                <p className="mistake__given">
                  <span className="mistake__label">Ta réponse</span>
                  <span lang="lb">{result.given || '—'}</span>
                </p>
                <p className="mistake__answer">
                  <span className="mistake__label">Bonne réponse</span>
                  <span lang="lb">{result.question.answer}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function VerbDrillView({ verbs, mode, onBack }: Props) {
  const [level, setLevel] = useState<LevelFilter>('all')
  const [question, setQuestion] = useState<DrillQuestion | null>(null)
  const [results, setResults] = useState<DrillResult[]>([])
  const [choice, setChoice] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [checked, setChecked] = useState<DrillResult | null>(null)
  const [finished, setFinished] = useState(false)
  const [round, setRound] = useState(0)
  const deckRef = useRef<DrillDeck | null>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  const pool = useMemo(
    () => (level === 'all' ? verbs : verbs.filter((v) => v.levels.includes(level))),
    [verbs, level],
  )

  // A new deck whenever the pool changes or a new session starts
  useEffect(() => {
    deckRef.current = new DrillDeck(pool, mode)
    setQuestion(deckRef.current.next())
    setChoice(null)
    setText('')
    setChecked(null)
  }, [pool, mode, round])

  const score = results.filter((r) => r.correct).length
  const streak = (() => {
    let n = 0
    for (let i = results.length - 1; i >= 0 && results[i].correct; i--) n++
    return n
  })()

  const canCheck = question?.mode === 'qcm' ? choice !== null : text.trim().length > 0

  const check = useCallback(() => {
    if (!question) return
    let result: DrillResult
    if (question.mode === 'qcm') {
      result = { question, correct: isQcmCorrect(question, choice), given: choice ?? '' }
    } else {
      const verdict = checkWritten(question, text)
      const notes = {
        accents: `Attention aux accents : ${question.answer}`,
        typo: `Presque ! On écrit : ${question.answer}`,
        correct: undefined,
        wrong: undefined,
      }
      result = { question, correct: verdict !== 'wrong', given: text.trim(), note: notes[verdict] }
    }
    setChecked(result)
    setResults((prev) => [...prev, result])
  }, [question, choice, text])

  const next = useCallback(() => {
    setQuestion(deckRef.current?.next() ?? null)
    setChoice(null)
    setText('')
    setChecked(null)
  }, [])

  const primary = useCallback(() => {
    if (checked) next()
    else if (canCheck) check()
  }, [checked, canCheck, next, check])

  const finish = () => (results.length === 0 ? onBack() : setFinished(true))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) {
        const target = event.target as HTMLElement
        if (target === primaryRef.current) return
        if (target.closest('button') && !target.closest('[data-exercise]')) return
        event.preventDefault()
        primary()
        return
      }
      if (checked || question?.mode !== 'qcm') return
      const n = Number(event.key)
      if (Number.isInteger(n) && n >= 1 && n <= question.options.length) setChoice(question.options[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [primary, checked, question])

  useEffect(() => {
    if (checked) primaryRef.current?.focus({ preventScroll: true })
  }, [checked])

  if (finished) {
    return (
      <Recap
        results={results}
        mode={mode}
        onRestart={() => {
          setResults([])
          setFinished(false)
          setRound((r) => r + 1)
        }}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="session drill">
      <header className="session__header drill__header">
        <button type="button" className="icon-btn" onClick={finish} aria-label="Terminer la session">
          ✕
        </button>
        <div className="drill__filters" role="group" aria-label="Niveau des verbes">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              className="chip chip--sm"
              aria-pressed={level === l.id}
              onClick={() => setLevel(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="drill__score" aria-live="polite">
          <span className="drill__stat drill__stat--good">✓ {score}</span>
          <span className="drill__stat drill__stat--bad">✕ {results.length - score}</span>
          {streak >= 3 && (
            <span className="drill__stat drill__stat--streak" aria-label={`${streak} bonnes réponses d'affilée`}>
              🔥 {streak}
            </span>
          )}
        </p>
      </header>

      <main className="session__body" data-exercise key={question?.id}>
        {question && (
          <>
            <h2 className="exercise__title">{TITLES[mode]}</h2>
            <div className="prompt-card">
              <span className="prompt-card__flag" aria-hidden>
                🇫🇷
              </span>
              <p className="prompt-card__text" lang="fr">
                {question.prompt}
              </p>
            </div>

            {question.mode === 'qcm' ? (
              <div className="options" role="radiogroup" aria-label="Verbes proposés">
                {question.options.map((option, i) => {
                  let state = ''
                  if (checked && option === question.answer) state = ' option--correct'
                  else if (checked && option === choice) state = ' option--wrong'
                  else if (option === choice) state = ' option--selected'
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={option === choice}
                      className={`option${state}`}
                      aria-disabled={!!checked}
                      onClick={() => !checked && setChoice(option)}
                      lang="lb"
                    >
                      <span className="option__key">{i + 1}</span>
                      <span className="option__text">{option}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
                <AnswerInput value={text} onChange={setText} disabled={!!checked} label="Le verbe en luxembourgeois" />
                <p className="write__hint">💡 Écris l'infinitif. Le pronom « sech » est facultatif.</p>
              </>
            )}
          </>
        )}
      </main>

      <footer className={`footer${checked ? (checked.correct ? ' footer--correct' : ' footer--wrong') : ''}`}>
        <div className="footer__inner">
          <div className="feedback" aria-live="polite">
            {checked && (
              <>
                <span className="feedback__icon" aria-hidden>
                  {checked.correct ? '✓' : '✕'}
                </span>
                <div>
                  <p className="feedback__title">
                    {checked.correct ? PRAISES[results.length % PRAISES.length] : 'Réponse correcte :'}
                  </p>
                  {!checked.correct && (
                    <p className="feedback__answer" lang="lb">
                      {checked.question.answer}
                    </p>
                  )}
                  {checked.note && (
                    <p className="feedback__note" lang="lb">
                      {checked.note}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="footer__buttons">
            <button type="button" className="btn btn--light" onClick={finish}>
              Terminer
            </button>
            <button
              ref={primaryRef}
              type="button"
              className={`btn ${checked && !checked.correct ? 'btn--danger' : 'btn--primary'}`}
              disabled={!checked && !canCheck}
              onClick={primary}
            >
              {checked ? 'Continuer' : 'Vérifier'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
