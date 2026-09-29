import { useEffect, useState } from 'react'
import { ChapterView } from './components/ChapterView'
import { HomeView } from './components/HomeView'
import { ResultsView } from './components/ResultsView'
import { type ExerciseResult, SessionView } from './components/SessionView'
import { chapters, getChapter } from './data'
import type { Theme } from './data/types'
import { buildSession, type Exercise, reshuffle } from './lib/exercises'

interface Origin {
  chapterId: number
  themes: Theme[]
  title: string
}

type Screen =
  | { name: 'home' }
  | { name: 'chapter'; chapterId: number }
  | { name: 'session'; origin: Origin; title: string; exercises: Exercise[]; run: number }
  | { name: 'results'; origin: Origin; title: string; results: ExerciseResult[] }

let runCounter = 0

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const openChapter = (chapterId: number) => setScreen({ name: 'chapter', chapterId })

  const startSession = (origin: Origin) => {
    const context = getChapter(origin.chapterId)?.themes ?? origin.themes
    const exercises = buildSession(origin.themes, context)
    setScreen({ name: 'session', origin, title: origin.title, exercises, run: ++runCounter })
  }

  switch (screen.name) {
    case 'home':
      return <HomeView chapters={chapters} onOpen={openChapter} />

    case 'chapter': {
      const chapter = getChapter(screen.chapterId)
      if (!chapter) return <HomeView chapters={chapters} onOpen={openChapter} />
      return (
        <ChapterView
          chapter={chapter}
          onBack={() => setScreen({ name: 'home' })}
          onStart={(themes) =>
            startSession({
              chapterId: chapter.id,
              themes,
              title: themes.length === 1 ? themes[0].title : `Kapitel ${chapter.id} – ${chapter.title}`,
            })
          }
        />
      )
    }

    case 'session':
      return (
        <SessionView
          key={screen.run}
          title={screen.title}
          exercises={screen.exercises}
          onQuit={() => openChapter(screen.origin.chapterId)}
          onFinish={(results) => setScreen({ name: 'results', origin: screen.origin, title: screen.title, results })}
        />
      )

    case 'results':
      return (
        <ResultsView
          title={screen.title}
          results={screen.results}
          onRetryMistakes={() =>
            setScreen({
              name: 'session',
              origin: screen.origin,
              title: `${screen.origin.title} · Révision des erreurs`,
              exercises: screen.results.filter((r) => !r.correct).map((r) => reshuffle(r.exercise)),
              run: ++runCounter,
            })
          }
          onNewSession={() => startSession(screen.origin)}
          onBack={() => openChapter(screen.origin.chapterId)}
        />
      )
  }
}
