import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import app from './config'

const storage = getStorage(app)

/**
 * Upload a profile photo to Firebase Storage.
 * Returns the public download URL.
 *
 * Path: photos/{userId}/photo{slot}.jpg  (slot = 1 | 2 | 3)
 */
export async function uploadProfilePhoto(
  userId: string,
  file: File,
  slot: 1 | 2 | 3 = 1
): Promise<string> {
  // Compress/resize on client before uploading
  const compressed = await compressImage(file, 800, 0.82)
  const path = `photos/${userId}/photo${slot}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' })
  return getDownloadURL(storageRef)
}

/**
 * Delete a profile photo from Firebase Storage.
 */
export async function deleteProfilePhoto(userId: string, slot: 1 | 2 | 3 = 1): Promise<void> {
  const path = `photos/${userId}/photo${slot}.jpg`
  const storageRef = ref(storage, path)
  try {
    await deleteObject(storageRef)
  } catch {
    // File may not exist — ignore
  }
}

// ── Image compression ─────────────────────────────────────────────────────────
function compressImage(file: File, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > height) {
        if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize }
      } else {
        if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      }, 'image/jpeg', quality)
    }
    img.onerror = reject
    img.src = url
  })
}
