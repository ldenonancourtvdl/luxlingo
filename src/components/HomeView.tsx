import type { CSSProperties } from 'react'
import type { Chapter } from '../data/types'
import { chapterColor } from '../lib/colors'

interface Props {
  chapters: Chapter[]
  onOpen: (chapterId: number) => void
}

export function HomeView({ chapters, onOpen }: Props) {
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
          Apprends le luxembourgeois chapitre par chapitre, avec le livre <em>Schwätzt Dir Lëtzebuergesch? A1</em>.
        </p>
      </header>

      {chapters.length === 0 ? (
        <p className="empty">Aucun chapitre trouvé dans src/data/chapters.</p>
      ) : (
        <ul className="chapter-grid">
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <button
                type="button"
                className="chapter-card"
                style={{ '--accent': chapterColor(chapter.id) } as CSSProperties}
                onClick={() => onOpen(chapter.id)}
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
      )}
    </div>
  )
}
