import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { randomUUID } from '@/lib/utils'

export async function uploadRoomImage(roomId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${randomUUID()}.${ext}`
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

export async function uploadVenueImage(venueId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${randomUUID()}.${ext}`
  const ref = storageRef(storage, `venues/${venueId}/${filename}`)
  await uploadBytes(ref, file)
  return getDownloadURL(ref)
}

// Venue image URLs are deleted the same way as room images — the path is parsed
// from the URL, so deleteRoomImage works for any bucket path.
export async function deleteVenueImage(url: string): Promise<void> {
  return deleteRoomImage(url)
}

export async function deleteAllVenueImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(u => deleteRoomImage(u)))
}

export async function uploadProofOfPayment(invoiceId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${randomUUID()}.${ext}`
  const ref = storageRef(storage, `invoices/${invoiceId}/proof/${filename}`)
  await uploadBytes(ref, file)
  return getDownloadURL(ref)
}

export async function uploadOrgLogo(orgId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${randomUUID()}.${ext}`
  const ref = storageRef(storage, `organisations/${orgId}/${filename}`)
  await uploadBytes(ref, file)
  return getDownloadURL(ref)
}

export async function deleteOrgLogo(url: string): Promise<void> {
  return deleteRoomImage(url)
}

export async function uploadMenuItemImage(itemId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${randomUUID()}.${ext}`
  const ref = storageRef(storage, `menu-items/${itemId}/${filename}`)
  await uploadBytes(ref, file)
  return getDownloadURL(ref)
}

export async function deleteMenuItemImage(url: string): Promise<void> {
  return deleteRoomImage(url)
}
