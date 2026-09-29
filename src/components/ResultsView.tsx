import type { ExerciseResult } from './SessionView'

interface Props {
  title: string
  results: ExerciseResult[]
  onRetryMistakes: () => void
  onNewSession: () => void
  onBack: () => void
}

function verdict(score: number, total: number) {
  const ratio = total ? score / total : 0
  if (ratio === 1) return { emoji: '🏆', text: 'Perfekt ! Aucune erreur.' }
  if (ratio >= 0.8) return { emoji: '🎉', text: 'Super gemaach ! (Bien joué !)' }
  if (ratio >= 0.5) return { emoji: '💪', text: 'Net schlecht ! (Pas mal !)' }
  return { emoji: '📚', text: "Continue à t'entraîner, tu vas y arriver !" }
}

export function ResultsView({ title, results, onRetryMistakes, onNewSession, onBack }: Props) {
  const score = results.filter((r) => r.correct).length
  const mistakes = results.filter((r) => !r.correct)
  const { emoji, text } = verdict(score, results.length)

  return (
    <div className="page results">
      <header className="results__header">
        <div className="results__emoji" aria-hidden>
          {emoji}
        </div>
        <p className="results__title">{title}</p>
        <p className="results__score">
          <strong>{score}</strong>/{results.length}
        </p>
        <p className="results__verdict">{text}</p>
      </header>

      <div className="results__actions">
        {mistakes.length > 0 && (
          <button type="button" className="btn btn--primary" onClick={onRetryMistakes}>
            Refaire mes erreurs ({mistakes.length})
          </button>
        )}
        <button type="button" className={`btn ${mistakes.length ? 'btn--secondary' : 'btn--primary'}`} onClick={onNewSession}>
          Nouvelle session
        </button>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          Retour au chapitre
        </button>
      </div>

      {mistakes.length > 0 && (
        <section className="mistakes">
          <h2 className="section-title">Tes erreurs</h2>
          <ul className="mistakes__list">
            {mistakes.map(({ exercise, given }) => (
              <li key={exercise.id} className="mistake">
                <p className="mistake__kind">
                  {exercise.kind === 'order' ? 'Remettre dans l’ordre' : 'Traduire en français'}
                </p>
                <p className="mistake__prompt" lang={exercise.kind === 'order' ? 'fr' : 'lb'}>
                  {exercise.prompt}
                </p>
                <p className="mistake__given">
                  <span className="mistake__label">Ta réponse</span>
                  <span lang={exercise.kind === 'order' ? 'lb' : 'fr'}>{given || '—'}</span>
                </p>
                <p className="mistake__answer">
                  <span className="mistake__label">Bonne réponse</span>
                  <span lang={exercise.kind === 'order' ? 'lb' : 'fr'}>{exercise.answer}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
