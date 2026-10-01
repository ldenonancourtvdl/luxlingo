# LuxLingo 🇱🇺

**▶ Play online: https://ldenonancourtvdl.github.io/luxlingo/**

A Duolingo-style web app for learning Luxembourgish (for French speakers). The content follows the chapters and themes of the textbooks **"Schwätzt Dir Lëtzebuergesch? A1"** and **"Schwätzt Dir Lëtzebuergesch? A2"** (INLL).

## Features

- Two levels: **A1** (Kapitel 1–6) and, below it, **A2** (Kapitel 1–7).
- Pick a **chapter**, then a **theme** (e.g. *Wéi geet et?*, *Beim Bäcker*), or mix the whole chapter.
- Each session has **10 random exercises** of four kinds:
  - **Word order**: drag and drop (or tap) the Luxembourgish words into the right order to translate a French sentence.
  - **Translation**: choose the right French translation of a Luxembourgish word or sentence (4 options, keys `1`–`4`).
  - **Writing**: type the Luxembourgish word for a French word. The article is required (`de`, `den`, `d'`, `dat`…). Case and punctuation don't matter. A missing accent is accepted but pointed out, and there are buttons for `ä é ë è ô û`.
  - **Reading comprehension**: read a short text and mark 4–5 statements *Richteg* (true) or *Falsch* (false). It only counts as correct if every statement is right. The French translation is shown after answering.
- A session usually has 1 reading, 3–4 word-order, 2–3 writing and 2–4 translation exercises.
- At the end you get a **score (x/10)**, a review of your mistakes, and a button to **retry only your mistakes**.
- **Verb table** (📖 button at the bottom of the home page): the ~145 verbs from the books' *Wichteg Verben* lists (A1 p. 106–107, A2 p. 147–149). It shows all six present-tense forms, the passé composé (A2 list) and a French translation. Irregular forms are in red, and modal verbs are highlighted.
  - Accent-insensitive search on the infinitive, the French translation or any conjugated form (e.g. `keeft` → *kafen*).
  - Filters: A1 / A2 / Tous.
  - Sticky header and first column; on mobile the table scrolls sideways and the translation moves under the verb.
- **Verb practice** (two buttons next to the table): endless drills on the same verb lists, with an A1 / A2 / Tous filter, a live score and a streak counter.
  - **Multiple choice** (🎯): the French translation is shown and you pick the Luxembourgish infinitive among 4 options (keys `1`–`4`). The three distractors are drawn at random from the twelve verbs that look most like the answer, so the choices stay close without ever being ambiguous.
  - **Writing** (⌨️): type the Luxembourgish infinitive. `sech` is optional, and a missing accent or a small typo still counts as correct while showing the right spelling. The tolerance is one typo for verbs up to 8 letters and two beyond, with no tolerance up to 4 letters; an answer that happens to be another verb (`kafen` vs `akafen`) is always counted wrong.
  - Every verb comes up once before any repeats. Press **Terminer** whenever you like to get a recap with your score, the percentage and the list of your mistakes.
- Keyboard: `Enter` checks the answer and moves to the next exercise.
- Runs fully in the browser (no backend) and works on mobile (touch drag and drop).

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests + content validation
npm run build    # production build in dist/
```

Every push to `main` runs the tests, builds the app and deploys it to GitHub Pages (`.github/workflows/deploy.yml`).

## Content

Each chapter is one JSON file, `src/data/<level>/k<N>.json` (`src/data/a1/k1.json` … `src/data/a2/k7.json`). The level comes from the folder. The schema is in `src/data/types.ts`:

```jsonc
{
  "id": 1, "title": "Moien!", "titleFr": "Bonjour !", "descriptionFr": "…", "page": 8,
  "themes": [{
    "id": "a1-k1-wei-geet-et", "title": "Wéi geet et?", "titleFr": "Comment ça va ?",
    "vocab":     [{ "lb": "de Mann", "fr": "l'homme" }],
    "sentences": [{ "lb": "Ech schaffen haut.", "fr": "Je travaille aujourd'hui.", "alt": ["Haut schaffen ech."] }],
    "readings":  [{
      "title": "…", "text": "…", "textFr": "…",
      "questions": [{ "lb": "Hie schafft haut.", "fr": "Il travaille aujourd'hui.", "answer": true }]
    }]
  }]
}
```

- `vocab` feeds the translation and writing exercises. Wrong options come from the same theme, then the chapter. Writing uses items of up to 3 words; `"a / b"` means both forms are accepted.
- `sentences` feed the word-order exercises (and some translation exercises). `alt` lists other correct word orders.
- `readings` feed the reading-comprehension exercises. Each theme has 2 texts with 4–5 true/false statements.
- `src/data/verbs.json` holds the verb table, one row per verb:
  `{ "lb", "fr", "forms": [ech, du, hien/si/et, mir, dir/Dir, si], "red": [indexes of irregular forms], "pc"?, "modal"?, "note"?, "levels": ["A1", "A2"] }`.
  An empty form (`""`) means the verb isn't used with that person (e.g. *reenen*).
- `npm test` validates the content: unique ids and translations, sentence length, `alt` using the same words, writable vocab, and reading format, and the verb table rows.

The chapter/theme structure, vocabulary and verb conjugations follow the books. The example sentences and reading texts were written for this app and don't reproduce the books' dialogues. The textbooks themselves are not included. The content was generated with AI assistance, so review by a native speaker is welcome.
