import { useRef } from 'react'
import type { WriteExercise as WriteExerciseData } from '../lib/exercises'

interface Props {
  exercise: WriteExerciseData
  value: string
  onChange: (value: string) => void
  /** True once the answer has been checked */
  disabled: boolean
}

const SPECIAL_CHARS = ['ä', 'é', 'ë', 'è', 'ô', 'û']

export function WriteExercise({ exercise, value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const insert = (char: string) => {
    const input = inputRef.current
    if (!input || disabled) return
    const start = input.selectionStart ?? value.length
    const end = input.selectionEnd ?? value.length
    onChange(value.slice(0, start) + char + value.slice(end))
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(start + char.length, start + char.length)
    })
  }

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

      <input
        ref={inputRef}
        className="write__input"
        type="text"
        lang="lb"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={disabled}
        aria-label="Ta réponse en luxembourgeois"
        placeholder="Ta réponse…"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        autoFocus
      />

      <div className="charpad" aria-label="Caractères spéciaux">
        {SPECIAL_CHARS.map((char) => (
          <button
            key={char}
            type="button"
            className="charpad__key"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(char)}
          >
            {char}
          </button>
        ))}
      </div>

      {exercise.withArticle && (
        <p className="write__hint">💡 N'oublie pas l'article (de, den, d', dat…).</p>
      )}
    </div>
  )
}
