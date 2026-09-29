const CHAPTER_COLORS: Record<number, string> = {
  1: '#f5a524',
  2: '#f27a2e',
  3: '#ec4a64',
  4: '#c94fb0',
  5: '#4f74d9',
  6: '#1ea892',
  7: '#7aa617',
}

export const chapterColor = (id: number) => CHAPTER_COLORS[id] ?? '#00a3e0'
