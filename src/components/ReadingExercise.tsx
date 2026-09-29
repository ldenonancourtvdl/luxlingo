import type { ReadingExercise as ReadingExerciseData } from '../lib/exercises'

interface Props {
  exercise: ReadingExerciseData
  value: (boolean | null)[]
  onChange: (value: (boolean | null)[]) => void
  /** True once the answers have been checked */
  disabled: boolean
}

const CHOICES = [
  { value: true, label: 'Richteg', hint: 'vrai' },
  { value: false, label: 'Falsch', hint: 'faux' },
]

export function ReadingExercise({ exercise, value, onChange, disabled }: Props) {
  const answer = (index: number, choice: boolean) => {
    if (disabled) return
    const next = [...value]
    next[index] = choice
    onChange(next)
  }

  return (
    <div className="reading">
      <h2 className="exercise__title">Lis le texte : vrai ou faux ?</h2>

      <article className="reading__card">
        <h3 className="reading__title" lang="lb">
          {exercise.title}
        </h3>
        <p className="reading__text" lang="lb">
          {exercise.text}
        </p>
        {disabled && (
          <details className="reading__translation">
            <summary>Voir la traduction</summary>
            <p className="reading__text" lang="fr">
              {exercise.textFr}
            </p>
          </details>
        )}
      </article>

      <ol className="statements">
        {exercise.statements.map((statement, i) => {
          const given = value[i] ?? null
          const state = disabled ? (given === statement.answer ? ' statement--correct' : ' statement--wrong') : ''
          return (
            <li key={i} className={`statement${state}`}>
              <div className="statement__text">
                <p lang="lb">{statement.lb}</p>
                {disabled && (
                  <p className="statement__fr" lang="fr">
                    {statement.fr} → <strong>{statement.answer ? 'vrai' : 'faux'}</strong>
                  </p>
                )}
              </div>
              <div className="tf" role="radiogroup" aria-label={`Affirmation ${i + 1}`}>
                {CHOICES.map((choice) => {
                  let cls = 'tf__btn'
                  if (given === choice.value) cls += ' tf__btn--selected'
                  if (disabled && statement.answer === choice.value) cls += ' tf__btn--answer'
                  return (
                    <button
                      key={choice.label}
                      type="button"
                      role="radio"
                      aria-checked={given === choice.value}
                      aria-disabled={disabled}
                      className={cls}
                      onClick={() => answer(i, choice.value)}
                    >
                      <span lang="lb">{choice.label}</span>
                      <small>{choice.hint}</small>
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
