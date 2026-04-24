// Global validation utilities

/**
 * Count words in a string
 * Words are separated by whitespace
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0
  return text.trim().split(/\s+/).length
}

/**
 * Validate maximum word count
 * @param text - Input text to validate
 * @param maxWords - Maximum allowed words (default: 20)
 * @returns true if word count is within limit
 */
export function validateMaxWords(text: string, maxWords: number = 20): boolean {
  return countWords(text) <= maxWords
}

/**
 * Truncate text to first N words with ellipsis
 * @param text - Input text to truncate
 * @param maxWords - Maximum words to display (default: 10)
 * @returns Truncated text with "...." suffix if truncated
 */
export function truncateWords(text: string, maxWords: number = 10): string {
  if (!text || text.trim().length === 0) return text
  
  const words = text.trim().split(/\s+/)
  
  if (words.length <= maxWords) return text
  
  const truncated = words.slice(0, maxWords).join(' ')
  return `${truncated}....`
}

/**
 * Get validation error message for word count
 * @param maxWords - Maximum allowed words (default: 20)
 * @returns Error message
 */
export function getWordCountError(maxWords: number = 20): string {
  return `Maximum ${maxWords} words allowed`
}
