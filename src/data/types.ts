export interface VocabItem {
  /** Luxembourgish word or short expression, nouns with their definite article (e.g. "de Bäcker") */
  lb: string
  /** French translation (nouns with article, e.g. "le boulanger") */
  fr: string
}

export interface Sentence {
  /** Luxembourgish sentence, with final punctuation */
  lb: string
  /** French translation */
  fr: string
  /** Other correct Luxembourgish word orders using exactly the same words */
  alt?: string[]
}

export interface ReadingStatement {
  /** Statement about the text, in Luxembourgish */
  lb: string
  /** French translation of the statement */
  fr: string
  /** Whether the statement is true according to the text */
  answer: boolean
}

export interface Reading {
  /** Short title in Luxembourgish */
  title: string
  /** Luxembourgish text: "\n" = line break (e.g. dialogue lines), "\n\n" = new paragraph */
  text: string
  /** French translation of the text, same layout */
  textFr: string
  /** 4 or 5 true/false statements */
  questions: ReadingStatement[]
}

export interface Theme {
  /** "<level>-k<chapter>-<slug>", e.g. "a1-k1-wei-geet-et" */
  id: string
  /** Theme title as printed in the book (Luxembourgish) */
  title: string
  titleFr: string
  vocab: VocabItem[]
  sentences: Sentence[]
  /** Short reading-comprehension texts with true/false statements */
  readings?: Reading[]
}

/** Chapter as stored in src/data/<level>/k<N>.json */
export interface ChapterData {
  id: number
  /** Chapter title in Luxembourgish */
  title: string
  titleFr: string
  /** One-sentence summary of the learning goals, in French */
  descriptionFr: string
  /** Book page where the chapter starts */
  page: number
  themes: Theme[]
}

export type Level = 'A1' | 'A2'

export interface Chapter extends ChapterData {
  level: Level
  /** Unique key across levels, e.g. "a2-3" */
  key: string
}

/** Row of the books' verb lists (A1 "100 wichteg Verben", A2 "Wichteg Verben"), stored in src/data/verbs.json */
export interface Verb {
  /** Infinitive as printed, e.g. "akafen", "(sech) bestueden" */
  lb: string
  fr: string
  /** Present tense: ech, du, hien/si/et, mir, dir/Dir, si ("" = not used) */
  forms: string[]
  /** Indexes of the irregular forms (printed in red in the books) */
  red: number[]
  /** Passé composé as printed in the A2 list, e.g. "ech sinn … bliwwen" */
  pc?: string
  /** Modal-verb row (highlighted in the books) */
  modal?: boolean
  /** Footnote, in French */
  note?: string
  /** Lists the verb appears in */
  levels: Level[]
}
