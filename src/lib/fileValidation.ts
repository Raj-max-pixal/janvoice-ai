export interface FileValidationResult {
  valid: boolean
  error?: string
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg']

export const FILE_TYPE_MAP = {
  image: ALLOWED_IMAGE_TYPES,
  video: ALLOWED_VIDEO_TYPES,
  document: ALLOWED_DOCUMENT_TYPES,
  audio: ALLOWED_AUDIO_TYPES,
} as const

export type FileCategory = keyof typeof FILE_TYPE_MAP

const MAX_FILE_SIZES: Record<FileCategory, number> = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 20 * 1024 * 1024, // 20MB
  audio: 25 * 1024 * 1024, // 25MB
}

/**
 * Validates a file for upload based on its category.
 * Checks file type (MIME) and file size.
 */
export function validateFile(file: File, category: FileCategory): FileValidationResult {
  const allowedTypes = FILE_TYPE_MAP[category]
  const maxSize = MAX_FILE_SIZES[category]

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    const typeNames: Record<FileCategory, string> = {
      image: 'JPEG, PNG, WebP, or HEIC',
      video: 'MP4, WebM, or QuickTime',
      document: 'PDF, DOC, DOCX, or TXT',
      audio: 'MP3, WAV, or OGG',
    }
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${typeNames[category]}. Received: ${file.type || 'unknown'}`,
    }
  }

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `File size exceeds ${sizeMB}MB limit. Current file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Validates a file without requiring a category (auto-detects from MIME type).
 */
export function validateFileAuto(file: File): FileValidationResult {
  for (const [category, types] of Object.entries(FILE_TYPE_MAP)) {
    if (types.includes(file.type)) {
      return validateFile(file, category as FileCategory)
    }
  }
  return {
    valid: false,
    error: `Unsupported file type: ${file.type || 'unknown'}. Allowed: images, videos, documents, or audio.`,
  }
}

/**
 * Returns a human-readable description of the allowed file types for a category.
 */
export function getAllowedTypesDescription(category: FileCategory): string {
  const descriptions: Record<FileCategory, string> = {
    image: 'JPG, PNG, WebP (max 10MB)',
    video: 'MP4, WebM (max 100MB)',
    document: 'PDF, DOC, DOCX, TXT (max 20MB)',
    audio: 'MP3, WAV, OGG (max 25MB)',
  }
  return descriptions[category]
}