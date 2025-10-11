/**
 * Crypto utilities for password hashing and security
 */

/**
 * Hash password using SHA-256 with salt
 * @param password - The password to hash
 * @returns Promise<string> - The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'dental_clinic_salt_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    console.error('Error hashing password:', error)
    throw error
  }
}
