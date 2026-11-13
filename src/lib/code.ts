const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/** Random code of `length` characters drawn from `ALPHABET`. */
export function generateCode(length = 7): string {
  let hasil = ''

  const randomBytes = crypto.getRandomValues(new Uint8Array(length))

  for (const byte of randomBytes) {
    // Modulo bias is negligible for 7-char codes at this scale.
    const indexHuruf = byte % ALPHABET.length
    hasil += ALPHABET[indexHuruf]
  }

  return hasil
}
