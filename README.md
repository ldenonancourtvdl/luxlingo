# LuxLingo 🇱🇺

A Duolingo-style web app for learning Luxembourgish (for French speakers). The content follows the chapters and themes of the textbook **"Schwätzt Dir Lëtzebuergesch? A1"** (INLL).

## Features

- Pick a **chapter** (Kapitel 1–6), then a **theme** (e.g. *Wéi geet et?*, *Beim Bäcker*), or mix the whole chapter.
- Each session has **10 random exercises** of two kinds:
  - **Word order**: drag and drop (or tap) the Luxembourgish words into the right order to translate a French sentence.
  - **Translation**: choose the right French translation of a Luxembourgish word or sentence (4 options, keys `1`–`4`).
- At the end: a **score (x/10)**, a review of your mistakes, and a button to **retry only your mistakes**.
- Keyboard: `Enter` checks the answer and moves to the next exercise.
- Runs fully in the browser (no backend), and works on mobile (touch drag and drop).

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests + content validation
npm run build    # production build in dist/
```

## Content

The exercises are defined in `src/data/chapters/k1.json` … `k6.json` (schema: `src/data/types.ts`):

```jsonc
{
  "id": 1, "title": "Moien!", "titleFr": "Bonjour !", "descriptionFr": "…", "page": 8,
  "themes": [{
    "id": "k1-wei-geet-et", "title": "Wéi geet et?", "titleFr": "Comment ça va ?",
    "vocab":     [{ "lb": "gutt", "fr": "bien" }],
    "sentences": [{ "lb": "Ech schaffen haut.", "fr": "Je travaille aujourd'hui.", "alt": ["Haut schaffen ech."] }]
  }]
}
```

- `vocab` feeds the translation exercises (wrong options come from the same theme, then the chapter).
- `sentences` feed the word-order exercises (and some translation exercises). `alt` lists other correct word orders.
- `npm test` validates the content (unique ids and translations, sentence length, `alt` using the same words, …).

The chapter/theme structure and vocabulary follow the book; the example sentences were written for this app (they don't reproduce the book's dialogues). The textbook itself is not included.
