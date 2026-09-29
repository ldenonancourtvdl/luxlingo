import { useEffect } from 'react'
import type { TranslateExercise as TranslateExerciseData } from '../lib/exercises'

interface Props {
  exercise: TranslateExerciseData
  value: string | null
  onChange: (value: string) => void
  /** True once the answer has been checked */
  disabled: boolean
}

export function TranslateExercise({ exercise, value, onChange, disabled }: Props) {
  useEffect(() => {
    if (disabled) return
    const onKey = (event: KeyboardEvent) => {
      const n = Number(event.key)
      if (Number.isInteger(n) && n >= 1 && n <= exercise.options.length) onChange(exercise.options[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disabled, exercise.options, onChange])

  const isSentence = exercise.prompt.trim().split(/\s+/).length > 3

  return (
    <div className="translate">
      <h2 className="exercise__title">Quelle est la bonne traduction ?</h2>
      <div className={`prompt-card${isSentence ? ' prompt-card--sentence' : ''}`}>
        <span className="prompt-card__flag" aria-hidden>
          🇱🇺
        </span>
        <p className="prompt-card__text" lang="lb">
          {exercise.prompt}
        </p>
      </div>
      <div className="options" role="radiogroup" aria-label="Traductions possibles">
        {exercise.options.map((option, i) => {
          let state = ''
          if (disabled && option === exercise.answer) state = ' option--correct'
          else if (disabled && option === value) state = ' option--wrong'
          else if (option === value) state = ' option--selected'
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === value}
              className={`option${state}`}
              aria-disabled={disabled}
              onClick={() => !disabled && onChange(option)}
              lang="fr"
            >
              <span className="option__key">{i + 1}</span>
              <span className="option__text">{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
