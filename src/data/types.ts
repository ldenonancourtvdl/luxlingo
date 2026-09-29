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

export interface Theme {
  id: string
  /** Theme title as printed in the book (Luxembourgish) */
  title: string
  titleFr: string
  vocab: VocabItem[]
  sentences: Sentence[]
}

export interface Chapter {
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
