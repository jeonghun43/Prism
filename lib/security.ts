/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitize nickname input to prevent XSS attacks
 * Only allows alphanumeric characters, Korean characters, and common punctuation
 */
export function sanitizeNickname(input: string): string {
  // Remove all HTML tags
  const withoutHtml = input.replace(/<[^>]*>/g, '')
  
  // Only allow alphanumeric, Korean characters, and basic punctuation
  // Korean Unicode range: \uAC00-\uD7A3 (한글), \u1100-\u11FF (자모)
  const sanitized = withoutHtml.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s_-]/g, '')
  
  // Remove leading/trailing spaces and normalize
  return sanitized.trim().replace(/\s+/g, ' ')
}

/**
 * Validate nickname format
 * - Length: 1-20 characters
 * - No spaces (for URL safety)
 * - Only alphanumeric and Korean characters
 */
export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  const normalized = nickname.replace(/\s+/g, '')
  
  if (!normalized || normalized.length === 0) {
    return { valid: false, error: '닉네임을 입력해주세요.' }
  }
  
  if (normalized.length < 1) {
    return { valid: false, error: '닉네임은 최소 1자 이상이어야 합니다.' }
  }
  
  if (normalized.length > 20) {
    return { valid: false, error: '닉네임은 20자 이하여야 합니다.' }
  }
  
  // Check for valid characters (alphanumeric, Korean)
  const validPattern = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ_-]+$/
  if (!validPattern.test(normalized)) {
    return { valid: false, error: '닉네임은 영문, 숫자, 한글만 사용할 수 있습니다.' }
  }
  
  return { valid: true }
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

