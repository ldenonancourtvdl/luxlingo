import { useEffect, useState } from 'react'
import { ChapterView } from './components/ChapterView'
import { HomeView } from './components/HomeView'
import { ResultsView } from './components/ResultsView'
import { type ExerciseResult, SessionView } from './components/SessionView'
import { VerbDrillView } from './components/VerbDrillView'
import { VerbsView } from './components/VerbsView'
import { getChapter, levels, verbs } from './data'
import type { Theme } from './data/types'
import { buildSession, type Exercise, reshuffle } from './lib/exercises'
import type { DrillMode } from './lib/verbDrill'

interface Origin {
  chapterKey: string
  themes: Theme[]
  title: string
}

type Screen =
  | { name: 'home' }
  | { name: 'verbs' }
  | { name: 'drill'; mode: DrillMode }
  | { name: 'chapter'; chapterKey: string }
  | { name: 'session'; origin: Origin; title: string; exercises: Exercise[]; run: number }
  | { name: 'results'; origin: Origin; title: string; results: ExerciseResult[] }

let runCounter = 0

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const openChapter = (chapterKey: string) => setScreen({ name: 'chapter', chapterKey })
  const home = (
    <HomeView
      levels={levels}
      onOpen={openChapter}
      onOpenVerbs={() => setScreen({ name: 'verbs' })}
      onStartDrill={(mode) => setScreen({ name: 'drill', mode })}
    />
  )

  const startSession = (origin: Origin) => {
    const context = getChapter(origin.chapterKey)?.themes ?? origin.themes
    const exercises = buildSession(origin.themes, context)
    setScreen({ name: 'session', origin, title: origin.title, exercises, run: ++runCounter })
  }

  switch (screen.name) {
    case 'home':
      return home

    case 'verbs':
      return <VerbsView verbs={verbs} onBack={() => setScreen({ name: 'home' })} />

    case 'drill':
      return <VerbDrillView key={screen.mode} verbs={verbs} mode={screen.mode} onBack={() => setScreen({ name: 'home' })} />

    case 'chapter': {
      const chapter = getChapter(screen.chapterKey)
      if (!chapter) return home
      return (
        <ChapterView
          chapter={chapter}
          onBack={() => setScreen({ name: 'home' })}
          onStart={(themes) =>
            startSession({
              chapterKey: chapter.key,
              themes,
              title: themes.length === 1 ? themes[0].title : `${chapter.level} · Kapitel ${chapter.id} – ${chapter.title}`,
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
          onQuit={() => openChapter(screen.origin.chapterKey)}
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
          onBack={() => openChapter(screen.origin.chapterKey)}
        />
      )
  }
}
