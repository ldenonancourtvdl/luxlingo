import { useRef } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  /** True once the answer has been checked */
  disabled: boolean
  label?: string
}

const SPECIAL_CHARS = ['ä', 'é', 'ë', 'è', 'ô', 'û']

/** Luxembourgish text input with a pad for the accented letters. */
export function AnswerInput({ value, onChange, disabled, label = 'Ta réponse en luxembourgeois' }: Props) {
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
    <>
      <input
        ref={inputRef}
        className="write__input"
        type="text"
        lang="lb"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={disabled}
        aria-label={label}
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
    </>
  )
}
