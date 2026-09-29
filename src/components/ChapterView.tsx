import type { CSSProperties } from 'react'
import type { Chapter, Theme } from '../data/types'
import { chapterColor } from '../lib/colors'

interface Props {
  chapter: Chapter
  onBack: () => void
  onStart: (themes: Theme[]) => void
}

export function ChapterView({ chapter, onBack, onStart }: Props) {
  return (
    <div className="page" style={{ '--accent': chapterColor(chapter.id) } as CSSProperties}>
      <button type="button" className="back-link" onClick={onBack}>
        ← Tous les chapitres
      </button>

      <header className="chapter-banner">
        <span className="chapter-banner__badge">
          Kapitel {chapter.id} · p. {chapter.page}
        </span>
        <h1 className="chapter-banner__title" lang="lb">
          {chapter.title}
        </h1>
        <p className="chapter-banner__subtitle">{chapter.titleFr}</p>
        <p className="chapter-banner__description">{chapter.descriptionFr}</p>
        <button type="button" className="btn btn--light" onClick={() => onStart(chapter.themes)}>
          🔀 Tout le chapitre (10 exercices)
        </button>
      </header>

      <h2 className="section-title">Choisis un thème</h2>
      <ol className="theme-list">
        {chapter.themes.map((theme, i) => (
          <li key={theme.id}>
            <button type="button" className="theme-card" onClick={() => onStart([theme])}>
              <span className="theme-card__number">{i + 1}</span>
              <span className="theme-card__text">
                <span className="theme-card__title" lang="lb">
                  {theme.title}
                </span>
                <span className="theme-card__subtitle">{theme.titleFr}</span>
                <span className="theme-card__meta">
                  {theme.vocab.length} mots · {theme.sentences.length} phrases
                </span>
              </span>
              <span className="theme-card__go" aria-hidden>
                ▶
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
