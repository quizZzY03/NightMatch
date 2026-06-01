import { compressToBase64 } from '../utils/imageUtils'

/**
 * Upload a profile photo.
 *
 * Strategy: compress to base64 (≤400 px, ≤65 % quality → ~15–40 KB each)
 * and return the data-URL directly. This is stored in the user's Firestore
 * document and works on img[src] with no external storage service needed.
 *
 * If Firebase Storage is ever enabled, replace this with a real upload.
 */
export async function uploadProfilePhoto(
  _userId: string,
  file: File,
  _slot: 1 | 2 | 3 = 1
): Promise<string> {
  // 400 px max, 65 % quality → typically 15–40 KB base64 per photo
  return compressToBase64(file, 400, 0.65)
}

/**
 * No-op: base64 images live in Firestore, not in a storage bucket.
 */
export async function deleteProfilePhoto(_userId: string, _slot: 1 | 2 | 3 = 1): Promise<void> {
  // Nothing to delete from storage — caller can null out the field in Firestore
}
