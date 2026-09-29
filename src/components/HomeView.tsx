import type { CSSProperties } from 'react'
import type { LevelInfo } from '../data'
import { chapterColor } from '../lib/colors'

interface Props {
  levels: LevelInfo[]
  onOpen: (chapterKey: string) => void
  onOpenVerbs: () => void
}

export function HomeView({ levels, onOpen, onOpenVerbs }: Props) {
  return (
    <div className="page">
      <header className="hero">
        <div className="hero__flag" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <h1 className="hero__title">
          Lux<span>Lingo</span>
        </h1>
        <p className="hero__subtitle">
          Apprends le luxembourgeois chapitre par chapitre, avec les livres <em>Schwätzt Dir Lëtzebuergesch?</em> A1 et
          A2.
        </p>
      </header>

      {levels.length === 0 && <p className="empty">Aucun chapitre trouvé dans src/data.</p>}

      {levels.map((level) => (
        <section key={level.id} className="level" aria-labelledby={`level-${level.id}`}>
          <header className="level__header">
            <span className="level__badge">{level.id}</span>
            <div>
              <h2 className="level__title" id={`level-${level.id}`}>
                Niveau {level.id} · {level.titleFr}
              </h2>
              <p className="level__book">{level.book}</p>
            </div>
          </header>
          <ul className="chapter-grid">
            {level.chapters.map((chapter) => (
              <li key={chapter.key}>
                <button
                  type="button"
                  className="chapter-card"
                  style={{ '--accent': chapterColor(chapter.id) } as CSSProperties}
                  onClick={() => onOpen(chapter.key)}
                >
                  <span className="chapter-card__badge">Kapitel {chapter.id}</span>
                  <span className="chapter-card__title" lang="lb">
                    {chapter.title}
                  </span>
                  <span className="chapter-card__subtitle">{chapter.titleFr}</span>
                  <span className="chapter-card__meta">{chapter.themes.length} thèmes</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="home-footer">
        <button type="button" className="btn btn--ghost home-footer__btn" onClick={onOpenVerbs}>
          <span aria-hidden>📖</span> Tableau des verbes
        </button>
        <p className="home-footer__hint">Toutes les conjugaisons des listes de verbes A1 et A2, avec recherche.</p>
      </footer>
    </div>
  )
}
