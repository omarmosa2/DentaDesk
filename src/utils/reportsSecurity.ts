/**
 * Reports Security Utilities
 * Handles password protection, security questions, and attempt tracking for the reports section
 */

import { hashPassword } from './crypto'

// Storage keys
const REPORTS_PASSWORD_KEY = 'dental_clinic_reports_password'
const SECURITY_QUESTION_KEY = 'dental_clinic_reports_security_question'
const SECURITY_ANSWER_KEY = 'dental_clinic_reports_security_answer'
const FAILED_ATTEMPTS_KEY = 'dental_clinic_reports_failed_attempts'
const LAST_ATTEMPT_TIME_KEY = 'dental_clinic_reports_last_attempt'
const PASSWORD_SETUP_COMPLETE_KEY = 'dental_clinic_reports_setup_complete'

// Attempt limits
const MAX_FAILED_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 30000 // 30 seconds

export interface SecurityQuestion {
  id: string
  question: string
}

export interface PasswordSettings {
  password: string
  securityQuestion: SecurityQuestion
  securityAnswer: string
}

// Predefined security questions in Arabic
export const SECURITY_QUESTIONS: SecurityQuestion[] = [
  { id: 'pet', question: 'ما اسم حيوانك الأليف الأول؟' },
  { id: 'city', question: 'ما اسم مدينتك المفضلة؟' },
  { id: 'school', question: 'ما اسم مدرستك الابتدائية؟' },
  { id: 'food', question: 'ما هو طبق الطعام المفضل لديك؟' },
  { id: 'color', question: 'ما هو لونك المفضل؟' },
  { id: 'movie', question: 'ما هو فيلمك المفضل؟' },
  { id: 'book', question: 'ما هو كتابك المفضل؟' }
]

/**
 * Check if password is set up
 */
export function isPasswordSet(): boolean {
  try {
    return localStorage.getItem(PASSWORD_SETUP_COMPLETE_KEY) === 'true'
  } catch (error) {
    console.error('Error checking password setup:', error)
    return false
  }
}

/**
 * Set up initial password and security question
 */
export async function setupPassword(settings: PasswordSettings): Promise<boolean> {
  try {
    // Validate password strength
    if (!validatePasswordStrength(settings.password)) {
      throw new Error('كلمة المرور ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم، ورمز خاص')
    }

    // Hash password
    const hashedPassword = await hashPassword(settings.password)

    // Hash security answer (case-insensitive, trimmed)
    const normalizedAnswer = settings.securityAnswer.trim().toLowerCase()
    const hashedAnswer = await hashPassword(normalizedAnswer)

    // Store in localStorage
    localStorage.setItem(REPORTS_PASSWORD_KEY, hashedPassword)
    localStorage.setItem(SECURITY_QUESTION_KEY, JSON.stringify(settings.securityQuestion))
    localStorage.setItem(SECURITY_ANSWER_KEY, hashedAnswer)
    localStorage.setItem(PASSWORD_SETUP_COMPLETE_KEY, 'true')

    // Reset any failed attempts
    resetFailedAttempts()

    return true
  } catch (error) {
    console.error('Error setting up password:', error)
    return false
  }
}

/**
 * Change existing password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    // Verify current password
    const isValid = await verifyPassword(currentPassword)
    if (!isValid) {
      throw new Error('كلمة المرور الحالية غير صحيحة')
    }

    // Validate new password strength
    if (!validatePasswordStrength(newPassword)) {
      throw new Error('كلمة المرور الجديدة ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم، ورمز خاص')
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update in localStorage
    localStorage.setItem(REPORTS_PASSWORD_KEY, hashedPassword)

    return true
  } catch (error) {
    console.error('Error changing password:', error)
    return false
  }
}

/**
 * Verify password
 */
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    // Check if password is set up
    if (!isPasswordSet()) {
      return false
    }

    // Check if user is currently locked out
    if (isLockedOut()) {
      throw new Error('تم تجاوز عدد المحاولات المسموحة. يرجى الانتظار 30 ثانية قبل المحاولة مرة أخرى')
    }

    const storedHash = localStorage.getItem(REPORTS_PASSWORD_KEY)
    if (!storedHash) {
      return false
    }

    const inputHash = await hashPassword(password)
    const isValid = inputHash === storedHash

    if (isValid) {
      // Success - reset failed attempts
      resetFailedAttempts()
    } else {
      // Failed - increment attempts
      incrementFailedAttempts()
    }

    return isValid
  } catch (error) {
    console.error('Error verifying password:', error)
    return false
  }
}

/**
 * Verify security answer for password reset
 */
export async function verifySecurityAnswer(answer: string): Promise<boolean> {
  try {
    const storedHash = localStorage.getItem(SECURITY_ANSWER_KEY)
    if (!storedHash) {
      return false
    }

    // Normalize answer (trim and lowercase)
    const normalizedAnswer = answer.trim().toLowerCase()
    const inputHash = await hashPassword(normalizedAnswer)

    return inputHash === storedHash
  } catch (error) {
    console.error('Error verifying security answer:', error)
    return false
  }
}

/**
 * Reset password using security answer
 */
export async function resetPassword(newPassword: string, securityAnswer: string): Promise<boolean> {
  try {
    // Verify security answer
    const isAnswerValid = await verifySecurityAnswer(securityAnswer)
    if (!isAnswerValid) {
      throw new Error('إجابة السؤال الأماني غير صحيحة')
    }

    // Validate new password strength
    if (!validatePasswordStrength(newPassword)) {
      throw new Error('كلمة المرور الجديدة ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم، ورمز خاص')
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password
    localStorage.setItem(REPORTS_PASSWORD_KEY, hashedPassword)

    // Reset failed attempts
    resetFailedAttempts()

    return true
  } catch (error) {
    console.error('Error resetting password:', error)
    return false
  }
}

/**
 * Get stored security question
 */
export function getSecurityQuestion(): SecurityQuestion | null {
  try {
    const stored = localStorage.getItem(SECURITY_QUESTION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('Error getting security question:', error)
    return null
  }
}

/**
 * Get failed attempts count
 */
export function getFailedAttempts(): number {
  try {
    return parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10)
  } catch (error) {
    console.error('Error getting failed attempts:', error)
    return 0
  }
}

/**
 * Check if user is locked out
 */
export function isLockedOut(): boolean {
  try {
    const lastAttempt = localStorage.getItem(LAST_ATTEMPT_TIME_KEY)
    if (!lastAttempt) return false

    const lastAttemptTime = parseInt(lastAttempt, 10)
    const failedAttempts = getFailedAttempts()

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - lastAttemptTime
      return timeSinceLastAttempt < LOCKOUT_DURATION_MS
    }

    return false
  } catch (error) {
    console.error('Error checking lockout status:', error)
    return false
  }
}

/**
 * Get remaining lockout time in seconds
 */
export function getRemainingLockoutTime(): number {
  try {
    const lastAttempt = localStorage.getItem(LAST_ATTEMPT_TIME_KEY)
    if (!lastAttempt) return 0

    const lastAttemptTime = parseInt(lastAttempt, 10)
    const timeSinceLastAttempt = Date.now() - lastAttemptTime

    if (timeSinceLastAttempt < LOCKOUT_DURATION_MS) {
      return Math.ceil((LOCKOUT_DURATION_MS - timeSinceLastAttempt) / 1000)
    }

    return 0
  } catch (error) {
    console.error('Error getting remaining lockout time:', error)
    return 0
  }
}

/**
 * Increment failed attempts
 */
function incrementFailedAttempts(): void {
  try {
    const current = getFailedAttempts()
    localStorage.setItem(FAILED_ATTEMPTS_KEY, (current + 1).toString())
    localStorage.setItem(LAST_ATTEMPT_TIME_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error incrementing failed attempts:', error)
  }
}

/**
 * Reset failed attempts
 */
function resetFailedAttempts(): void {
  try {
    localStorage.removeItem(FAILED_ATTEMPTS_KEY)
    localStorage.removeItem(LAST_ATTEMPT_TIME_KEY)
  } catch (error) {
    console.error('Error resetting failed attempts:', error)
  }
}

/**
 * Validate password strength (relaxed requirements)
 */
export function validatePasswordStrength(password: string): boolean {
  // At least 4 characters
  if (password.length < 4) return false

  // At least one letter or number
  if (!/[a-zA-Z0-9]/.test(password)) return false

  return true
}

/**
 * Clear all reports security data (for testing/reset purposes)
 */
export function clearAllSecurityData(): void {
  try {
    localStorage.removeItem(REPORTS_PASSWORD_KEY)
    localStorage.removeItem(SECURITY_QUESTION_KEY)
    localStorage.removeItem(SECURITY_ANSWER_KEY)
    localStorage.removeItem(FAILED_ATTEMPTS_KEY)
    localStorage.removeItem(LAST_ATTEMPT_TIME_KEY)
    localStorage.removeItem(PASSWORD_SETUP_COMPLETE_KEY)
  } catch (error) {
    console.error('Error clearing security data:', error)
  }
}

