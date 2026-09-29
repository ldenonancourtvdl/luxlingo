import { useMemo, useState } from 'react'
import type { Verb } from '../data/types'
import { filterVerbs, type LevelFilter, PERSONS } from '../lib/verbs'

interface Props {
  verbs: Verb[]
  onBack: () => void
}

const FILTERS: { id: LevelFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'A1', label: 'A1' },
  { id: 'A2', label: 'A2' },
]

export function VerbsView({ verbs, onBack }: Props) {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<LevelFilter>('all')

  const results = useMemo(() => filterVerbs(verbs, query, level), [verbs, query, level])
  const countFor = (id: LevelFilter) => (id === 'all' ? verbs.length : verbs.filter((v) => v.levels.includes(id)).length)

  return (
    <div className="page page--wide verbs-page">
      <button type="button" className="back-link" onClick={onBack}>
        ← Tous les chapitres
      </button>

      <header className="verbs-header">
        <h1 className="verbs-header__title">Tableau des verbes</h1>
        <p className="verbs-header__subtitle">
          Les verbes des listes <em lang="lb">Wichteg Verben</em> des livres A1 et A2, au présent et au passé composé.
          Cherche en français ou en luxembourgeois, même une forme conjuguée.
        </p>
      </header>

      <div className="verbs-toolbar">
        <input
          type="search"
          className="verbs-toolbar__search"
          placeholder="Chercher un verbe…"
          aria-label="Chercher un verbe"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <div className="verbs-toolbar__filters" role="group" aria-label="Niveau">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="chip"
              aria-pressed={level === f.id}
              onClick={() => setLevel(f.id)}
            >
              {f.label} <span className="chip__count">{countFor(f.id)}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="verbs-legend">
        <span className="verbs-legend__count">
          {results.length} verbe{results.length > 1 ? 's' : ''}
        </span>
        <span>
          <span className="is-irregular">En rouge</span> : formes irrégulières
        </span>
        <span>
          <span className="tag tag--modal">modal</span> : verbe de modalité
        </span>
      </p>

      {results.length === 0 ? (
        <p className="empty">Aucun verbe trouvé pour « {query} ».</p>
      ) : (
        <div className="verbs-scroll">
          <table className="verbs-table">
            <thead>
              <tr>
                <th scope="col" className="verbs-table__verb">
                  Verbe
                </th>
                <th scope="col" className="verbs-table__fr">
                  Français
                </th>
                {PERSONS.map((p) => (
                  <th scope="col" key={p} lang="lb">
                    {p}
                  </th>
                ))}
                <th scope="col">Passé composé</th>
              </tr>
            </thead>
            <tbody>
              {results.map((verb) => (
                <tr key={verb.lb + (verb.modal ? '#modal' : '')} className={verb.modal ? 'is-modal' : undefined}>
                  <th scope="row" className="verbs-table__verb">
                    <span lang="lb">{verb.lb}</span>
                    <span className="verbs-table__fr-inline">{verb.fr}</span>
                    <span className="verbs-table__tags">
                      {verb.modal && <span className="tag tag--modal">modal</span>}
                      {verb.levels.map((l) => (
                        <span key={l} className={`tag tag--${l.toLowerCase()}`}>
                          {l}
                        </span>
                      ))}
                    </span>
                    {verb.note && <span className="verbs-table__note">{verb.note}</span>}
                  </th>
                  <td className="verbs-table__fr">{verb.fr}</td>
                  {verb.forms.map((form, i) => (
                    <td key={i} lang="lb" className={verb.red.includes(i) ? 'is-irregular' : undefined}>
                      {form || <span className="verbs-table__empty">–</span>}
                    </td>
                  ))}
                  <td lang="lb" className="verbs-table__pc">
                    {verb.pc ?? <span className="verbs-table__empty">–</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
