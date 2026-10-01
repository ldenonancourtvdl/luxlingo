import type { WriteExercise as WriteExerciseData } from '../lib/exercises'
import { AnswerInput } from './AnswerInput'

interface Props {
  exercise: WriteExerciseData
  value: string
  onChange: (value: string) => void
  /** True once the answer has been checked */
  disabled: boolean
}

export function WriteExercise({ exercise, value, onChange, disabled }: Props) {
  return (
    <div className="write">
      <h2 className="exercise__title">Écris en luxembourgeois</h2>
      <div className="prompt-card">
        <span className="prompt-card__flag" aria-hidden>
          🇫🇷
        </span>
        <p className="prompt-card__text" lang="fr">
          {exercise.prompt}
        </p>
      </div>

      <AnswerInput value={value} onChange={onChange} disabled={disabled} />

      {exercise.withArticle && <p className="write__hint">💡 N'oublie pas l'article (de, den, d', dat…).</p>}
    </div>
  )
}
