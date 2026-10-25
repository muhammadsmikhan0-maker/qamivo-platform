export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

export function detectImageContentType(bytes: Uint8Array): AllowedImageType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 6) {
    const signature = String.fromCharCode(...bytes.slice(0, 6))
    if (/^GIF8[79]a$/.test(signature)) return 'image/gif'
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) return 'image/webp'
  return null
}

export function validateImageUpload(
  bytes: Uint8Array,
  declaredContentType: string,
  size: number,
): { ok: true; contentType: AllowedImageType } | { ok: false; reason: 'empty' | 'too_large' | 'invalid_image' | 'content_type_mismatch' } {
  if (!Number.isFinite(size) || size < 1) return { ok: false, reason: 'empty' }
  if (size > MAX_IMAGE_UPLOAD_BYTES) return { ok: false, reason: 'too_large' }
  const detected = detectImageContentType(bytes)
  if (!detected) return { ok: false, reason: 'invalid_image' }
  if (declaredContentType && declaredContentType !== detected) {
    return { ok: false, reason: 'content_type_mismatch' }
  }
  return { ok: true, contentType: detected }
}
