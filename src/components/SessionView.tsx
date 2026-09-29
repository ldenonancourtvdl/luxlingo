import { useCallback, useEffect, useRef, useState } from 'react'
import { type Exercise, isOrderCorrect, isTranslateCorrect } from '../lib/exercises'
import { OrderExercise } from './OrderExercise'
import { TranslateExercise } from './TranslateExercise'

export interface ExerciseResult {
  exercise: Exercise
  correct: boolean
  /** What the learner answered, as text */
  given: string
}

interface Props {
  title: string
  exercises: Exercise[]
  onQuit: () => void
  onFinish: (results: ExerciseResult[]) => void
}

const PRAISES = ['Super !', 'Bravo !', 'Richteg ! (Correct !)', 'Excellent !', 'Genau ! (Exactement !)', 'Très bien !']

export function SessionView({ title, exercises, onQuit, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [orderValue, setOrderValue] = useState<string[]>([])
  const [choice, setChoice] = useState<string | null>(null)
  const [checked, setChecked] = useState<ExerciseResult | null>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  const exercise = exercises[index]
  const canCheck = exercise.kind === 'order' ? orderValue.length > 0 : choice !== null

  const check = useCallback(() => {
    let result: ExerciseResult
    if (exercise.kind === 'order') {
      const words = orderValue.map((id) => exercise.tiles.find((t) => t.id === id)?.text ?? '')
      result = { exercise, correct: isOrderCorrect(exercise, words), given: words.join(' ') }
    } else {
      result = { exercise, correct: isTranslateCorrect(exercise, choice), given: choice ?? '' }
    }
    setChecked(result)
    setResults((prev) => [...prev, result])
  }, [exercise, orderValue, choice])

  const next = useCallback(() => {
    if (index + 1 >= exercises.length) {
      onFinish(results)
      return
    }
    setIndex(index + 1)
    setOrderValue([])
    setChoice(null)
    setChecked(null)
  }, [index, exercises.length, onFinish, results])

  const primary = useCallback(() => {
    if (checked) next()
    else if (canCheck) check()
  }, [checked, canCheck, next, check])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat) return
      const target = event.target as HTMLElement
      if (target === primaryRef.current) return
      if (target.closest('button') && !target.closest('[data-exercise]')) return
      event.preventDefault()
      primary()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [primary])

  useEffect(() => {
    if (checked) primaryRef.current?.focus()
  }, [checked])

  const quit = () => {
    if (results.length === 0 || window.confirm('Quitter la session ? Ta progression sera perdue.')) onQuit()
  }

  const progress = ((index + (checked ? 1 : 0)) / exercises.length) * 100

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

      <main className="session__body" data-exercise key={exercise.id + index}>
        {exercise.kind === 'order' ? (
          <OrderExercise exercise={exercise} value={orderValue} onChange={setOrderValue} disabled={!!checked} />
        ) : (
          <TranslateExercise exercise={exercise} value={choice} onChange={setChoice} disabled={!!checked} />
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
                    {checked.correct ? PRAISES[index % PRAISES.length] : 'Réponse correcte :'}
                  </p>
                  {!checked.correct && (
                    <p className="feedback__answer" lang={exercise.kind === 'order' ? 'lb' : 'fr'}>
                      {exercise.answer}
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
