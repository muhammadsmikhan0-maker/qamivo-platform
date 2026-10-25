import { describe, expect, it } from 'vitest'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
  detectImageContentType,
  validateImageUpload,
} from '../src/lib/image-validation'

describe('image upload validation', () => {
  it.each([
    ['PNG', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'],
    ['JPEG', [0xff, 0xd8, 0xff], 'image/jpeg'],
    ['GIF', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 'image/gif'],
    ['WebP', [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], 'image/webp'],
  ] as const)('recognises the %s signature', (_label, bytes, expected) => {
    expect(detectImageContentType(Uint8Array.from(bytes))).toBe(expected)
  })

  it('rejects HTML and other non-image payloads even when named as an image', () => {
    expect(validateImageUpload(new TextEncoder().encode('<script>alert(1)</script>'), 'image/png', 26))
      .toEqual({ ok: false, reason: 'invalid_image' })
  })

  it('rejects declared MIME types that do not match the file signature', () => {
    expect(validateImageUpload(Uint8Array.from([0xff, 0xd8, 0xff]), 'image/png', 3))
      .toEqual({ ok: false, reason: 'content_type_mismatch' })
  })

  it('rejects empty and oversized uploads', () => {
    expect(validateImageUpload(new Uint8Array(), 'image/png', 0))
      .toEqual({ ok: false, reason: 'empty' })
    expect(validateImageUpload(Uint8Array.from([0xff, 0xd8, 0xff]), 'image/jpeg', MAX_IMAGE_UPLOAD_BYTES + 1))
      .toEqual({ ok: false, reason: 'too_large' })
  })

  it('allows only the four raster image types supported by the upload pipeline', () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  })
})
