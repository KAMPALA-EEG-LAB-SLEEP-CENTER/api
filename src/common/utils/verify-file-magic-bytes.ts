const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * Reads the actual file signature (magic bytes) from an in-memory buffer
 * and returns the detected MIME type if it's one of the allowed types,
 * or null if it doesn't match / can't be identified.
 */
export async function verifyBufferMagicBytes(
  buffer: Buffer,
): Promise<string | null> {
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(buffer);

  if (detected && ALLOWED_MIME_TYPES.includes(detected.mime)) {
    return detected.mime;
  }
  return null;
}
