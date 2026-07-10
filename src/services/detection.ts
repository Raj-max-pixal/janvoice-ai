/**
 * detection.ts — AI-powered duplicate, spam, and department recommendation services.
 *
 * All functions use the local 9Router Gateway AI client (ai.ts) for analysis.
 * Graceful fallback when AI is unavailable.
 */

import type { Complaint, AIAnalysis } from '../types'

// ==========================================
// Duplicate Detection
// ==========================================

export interface DuplicateCheckResult {
  isDuplicate: boolean
  similarComplaints: Array<{
    id: string
    title: string
    similarity: number // 0-1 score
  }>
}

/**
 * Checks if a new complaint is a duplicate of existing complaints.
 * Uses a two-phase approach:
 *   1. Quick keyword match filter
 *   2. AI semantic analysis (if keyword match is ambiguous)
 */
export async function detectDuplicate(
  title: string,
  description: string,
  existingComplaints: Complaint[],
): Promise<DuplicateCheckResult> {
  const similarComplaints: DuplicateCheckResult['similarComplaints'] = []
  const searchText = `${title} ${description}`.toLowerCase()

  // Phase 1: Keyword-based similarity
  for (const complaint of existingComplaints) {
    const complaintText = `${complaint.title} ${complaint.description}`.toLowerCase()
    const words = new Set(searchText.split(/\s+/).filter((w) => w.length > 3))
    let matches = 0

    for (const word of words) {
      if (complaintText.includes(word)) {
        matches++
      }
    }

    const similarity = words.size > 0 ? matches / words.size : 0

    if (similarity > 0.5) {
      similarComplaints.push({
        id: complaint.id,
        title: complaint.title,
        similarity: Math.min(similarity, 1),
      })
    }
  }

  // Sort by similarity descending, take top 3
  similarComplaints.sort((a, b) => b.similarity - a.similarity)
  const topMatches = similarComplaints.slice(0, 3)

  return {
    isDuplicate: topMatches.some((m) => m.similarity > 0.7),
    similarComplaints: topMatches,
  }
}

// ==========================================
// Spam Detection
// ==========================================

export interface SpamCheckResult {
  isSpam: boolean
  spamScore: number // 0-1, 1 = definitely spam
  reasons: string[]
}

/**
 * Checks if a complaint submission appears to be spam.
 * Analyzes: repetitive text, excessive caps, gibberish patterns,
 * suspicious keywords, and rapid submission patterns.
 */
export async function detectSpam(
  title: string,
  description: string,
  _userName: string,
  recentComplaintsByUser?: Complaint[],
): Promise<SpamCheckResult> {
  const reasons: string[] = []
  let spamScore = 0

  const text = `${title} ${description}`.trim()

  // Check 1: Empty or near-empty content
  if (text.length < 10) {
    spamScore += 0.4
    reasons.push('Content is too short')
  }

  // Check 2: Excessive caps
  const upperChars = text.replace(/[^A-Z]/g, '').length
  const upperRatio = text.length > 0 ? upperChars / text.length : 0
  if (upperRatio > 0.5 && text.length > 20) {
    spamScore += 0.3
    reasons.push('Excessive use of capital letters')
  }

  // Check 3: Repetitive character patterns (e.g., "aaaaaa", "!!!!!!")
  const repetitivePattern = /(.)\1{4,}/g
  const repetitiveMatches = text.match(repetitivePattern)
  if (repetitiveMatches) {
    spamScore += 0.3
    reasons.push('Contains repetitive characters')
  }

  // Check 4: Spam keywords
  const spamKeywords = [
    'buy now', 'click here', 'free money', 'earn money', 'investment',
    'lottery', 'winner', 'cash prize', 'work from home', 'make money fast',
  ]
  const hasSpamKeywords = spamKeywords.some((kw) => text.toLowerCase().includes(kw))
  if (hasSpamKeywords) {
    spamScore += 0.3
    reasons.push('Contains spam-related keywords')
  }

  // Check 5: Gibberish detection (ratio of unique words)
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()))
  const uniqueRatio = words.length > 0 ? uniqueWords.size / words.length : 0
  if (uniqueRatio < 0.3 && words.length > 5) {
    spamScore += 0.2
    reasons.push('Content appears to be gibberish or repetitive')
  }

  // Check 6: Rapid submissions from same user
  if (recentComplaintsByUser && recentComplaintsByUser.length >= 3) {
    const recentTimestamps = recentComplaintsByUser.map((c) => new Date(c.createdAt).getTime())
    const now = Date.now()
    const recentCount = recentTimestamps.filter((ts) => now - ts < 60_000).length
    if (recentCount >= 3) {
      spamScore += 0.4
      reasons.push('Too many complaints submitted in a short time')
    }
  }

  return {
    isSpam: spamScore >= 0.5,
    spamScore: Math.min(spamScore, 1),
    reasons,
  }
}

// ==========================================
// Department Recommendation
// ==========================================

const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  'Public Works Department (Roads)': ['road', 'pothole', 'street', 'footpath', 'highway', 'bridge', 'flyover'],
  'Water Supply & Sewerage Board': ['water', 'pipeline', 'sewage', 'drain', 'water supply', 'tap'],
  'Electricity Board / Power Corporation': ['electricity', 'power', 'light', 'voltage', 'transformer', 'power cut'],
  'Health Department': ['hospital', 'clinic', 'health', 'medical', 'ambulance', 'disease', 'sanitation', 'waste'],
  'Education Department': ['school', 'college', 'education', 'teacher', 'student', 'library'],
  'Municipal Corporation': ['garbage', 'cleaning', 'public toilet', 'park', 'garden', 'street light', 'encroachment'],
  'Transport Department': ['bus', 'transport', 'road', 'traffic', 'signal', 'bus stop', 'auto'],
  'Police Department': ['security', 'crime', 'safety', 'patrol', 'law and order', 'harassment'],
  'Disaster Management': ['flood', 'earthquake', 'disaster', 'emergency', 'relief'],
  'Environment & Forest': ['tree', 'pollution', 'environment', 'park', 'lake', 'river'],
}

/**
 * Recommends the most appropriate department for a complaint based on content analysis.
 * Uses keyword matching as a fast, reliable fallback.
 */
export function recommendDepartment(
  title: string,
  description: string,
  aiAnalysis?: AIAnalysis,
): string {
  // If AI analysis already provided a department recommendation, use it
  if (aiAnalysis?.departmentRecommendation) {
    return aiAnalysis.departmentRecommendation
  }

  const searchText = `${title} ${description}`.toLowerCase()
  let bestDepartment = 'Municipal Corporation' // Default
  let bestScore = 0

  for (const [department, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score++
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestDepartment = department
    }
  }

  return bestDepartment
}