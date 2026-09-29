import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkWrite,
  type Exercise,
  isOrderCorrect,
  isReadingCorrect,
  isTranslateCorrect,
} from '../lib/exercises'
import { OrderExercise } from './OrderExercise'
import { ReadingExercise } from './ReadingExercise'
import { TranslateExercise } from './TranslateExercise'
import { WriteExercise } from './WriteExercise'

export interface ExerciseResult {
  exercise: Exercise
  correct: boolean
  /** What the learner answered, as text */
  given: string
  /** Extra remark shown with a correct answer (e.g. missing accents) */
  note?: string
  /** Reading exercises: the true/false answers given, per statement */
  answers?: (boolean | null)[]
}

interface Props {
  title: string
  exercises: Exercise[]
  onQuit: () => void
  onFinish: (results: ExerciseResult[]) => void
}

const PRAISES = ['Super !', 'Bravo !', 'Richteg ! (Correct !)', 'Excellent !', 'Genau ! (Exactement !)', 'Très bien !']

function emptyReading(exercise: Exercise): (boolean | null)[] {
  return exercise.kind === 'reading' ? exercise.statements.map(() => null) : []
}

export function SessionView({ title, exercises, onQuit, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [orderValue, setOrderValue] = useState<string[]>([])
  const [choice, setChoice] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [truths, setTruths] = useState<(boolean | null)[]>(() => emptyReading(exercises[0]))
  const [checked, setChecked] = useState<ExerciseResult | null>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  const exercise = exercises[index]
  const canCheck = (() => {
    switch (exercise.kind) {
      case 'order':
        return orderValue.length > 0
      case 'translate':
        return choice !== null
      case 'write':
        return text.trim().length > 0
      case 'reading':
        return truths.length > 0 && truths.every((t) => t !== null)
    }
  })()

  const check = useCallback(() => {
    let result: ExerciseResult
    switch (exercise.kind) {
      case 'order': {
        const words = orderValue.map((id) => exercise.tiles.find((t) => t.id === id)?.text ?? '')
        result = { exercise, correct: isOrderCorrect(exercise, words), given: words.join(' ') }
        break
      }
      case 'translate':
        result = { exercise, correct: isTranslateCorrect(exercise, choice), given: choice ?? '' }
        break
      case 'write': {
        const verdict = checkWrite(exercise, text)
        result = {
          exercise,
          correct: verdict !== 'wrong',
          given: text.trim(),
          note: verdict === 'accents' ? `Attention aux accents : ${exercise.answer}` : undefined,
        }
        break
      }
      case 'reading': {
        const good = exercise.statements.filter((s, i) => truths[i] === s.answer).length
        result = {
          exercise,
          correct: isReadingCorrect(exercise, truths),
          given: `${good}/${exercise.statements.length} bonnes réponses`,
          answers: truths,
        }
        break
      }
    }
    setChecked(result)
    setResults((prev) => [...prev, result])
  }, [exercise, orderValue, choice, text, truths])

  const next = useCallback(() => {
    if (index + 1 >= exercises.length) {
      onFinish(results)
      return
    }
    setIndex(index + 1)
    setOrderValue([])
    setChoice(null)
    setText('')
    setTruths(emptyReading(exercises[index + 1]))
    setChecked(null)
  }, [index, exercises, onFinish, results])

  const primary = useCallback(() => {
    if (checked) next()
    else if (canCheck) check()
  }, [checked, canCheck, next, check])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat) return
      const target = event.target as HTMLElement
      if (target === primaryRef.current) return
      // Let Enter act natively on true/false buttons and on the translation toggle.
      if (target.closest('.tf, summary')) return
      if (target.closest('button') && !target.closest('[data-exercise]')) return
      event.preventDefault()
      primary()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [primary])

  useEffect(() => {
    if (checked) primaryRef.current?.focus({ preventScroll: exercise.kind === 'reading' })
  }, [checked, exercise.kind])

  const quit = () => {
    if (results.length === 0 || window.confirm('Quitter la session ? Ta progression sera perdue.')) onQuit()
  }

  const progress = ((index + (checked ? 1 : 0)) / exercises.length) * 100

  const feedbackAnswer = (() => {
    if (!checked || checked.correct) return null
    switch (exercise.kind) {
      case 'reading':
        return { text: `${checked.given} – les erreurs sont en rouge.`, lang: 'fr' }
      case 'translate':
        return { text: exercise.answer, lang: 'fr' }
      default:
        return { text: exercise.answer, lang: 'lb' }
    }
  })()

  return (
    <div className="session">
      <header className="session__header">
        <button type="button" className="icon-btn" onClick={quit} aria-label="Quitter la session">
          ✕
        </button>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={exercises.length}
          aria-valuenow={index + (checked ? 1 : 0)}
          aria-label={title}
        >
          <div className="progress__bar" style={{ width: `${progress}%` }} />
        </div>
        <span className="session__count">
          {index + 1}/{exercises.length}
        </span>
      </header>

      <main className={`session__body session__body--${exercise.kind}`} data-exercise key={exercise.id + index}>
        {exercise.kind === 'order' && (
          <OrderExercise exercise={exercise} value={orderValue} onChange={setOrderValue} disabled={!!checked} />
        )}
        {exercise.kind === 'translate' && (
          <TranslateExercise exercise={exercise} value={choice} onChange={setChoice} disabled={!!checked} />
        )}
        {exercise.kind === 'write' && (
          <WriteExercise exercise={exercise} value={text} onChange={setText} disabled={!!checked} />
        )}
        {exercise.kind === 'reading' && (
          <ReadingExercise exercise={exercise} value={truths} onChange={setTruths} disabled={!!checked} />
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
                    {checked.correct
                      ? PRAISES[index % PRAISES.length]
                      : exercise.kind === 'reading'
                        ? 'Pas tout à fait…'
                        : 'Réponse correcte :'}
                  </p>
                  {feedbackAnswer && (
                    <p className="feedback__answer" lang={feedbackAnswer.lang}>
                      {feedbackAnswer.text}
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
      </footer>
    </div>
  )
}
