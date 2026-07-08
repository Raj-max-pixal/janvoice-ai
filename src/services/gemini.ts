/**
 * gemini.ts - Delegates all AI operations to the 9Router AI service.
 * 
 * This file exists to maintain backward compatibility with existing imports
 * throughout the codebase. All functions re-export from the ai.ts service.
 * 
 * To replace the AI provider, edit src/services/ai.ts instead.
 * 
 * @deprecated Import directly from './ai' for new code.
 */

export {
  analyzeComplaint,
  generateRecommendations,
  improveComplaintText,
  translateComplaintText,
  getFallbackAnalysis,
} from './ai'

// HTML5 Speech Synthesis TTS (unchanged - not related to any AI provider)
export function playTextToSpeech(text: string): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const cleanText = text.replace(/\[.*?\]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 300))
    utterance.rate = 0.95
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  } else {
    console.warn('Speech synthesis not supported in this browser.')
  }
}

export function stopTextToSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}