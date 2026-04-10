import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'

export async function uploadRoomImage(roomId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${crypto.randomUUID()}.${ext}`
  const ref = storageRef(storage, `rooms/${roomId}/${filename}`)
  await uploadBytes(ref, file)
  return getDownloadURL(ref)
}

/**
 * Deletes a file from Firebase Storage given its full download URL.
 * Extracts the storage path from the URL so we don't need to store paths separately.
 */
export async function deleteRoomImage(url: string): Promise<void> {
  const match = url.match(/\/o\/(.+?)\?/)
  if (!match) {
    console.warn('[storage] Could not extract path from URL:', url)
    return
  }
  const path = decodeURIComponent(match[1]!)
  console.log('[storage] Deleting Firebase object at path:', path)
  const ref = storageRef(storage, path)
  await deleteObject(ref)
}

export async function deleteAllRoomImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(u => deleteRoomImage(u)))
}
