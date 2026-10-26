/*
 * Client-side encryption for optional backups. Plaintext never leaves the
 * browser: a random AES-256-GCM data key encrypts the payload, and that key is
 * wrapped with a key derived from the user's passphrase (PBKDF2-SHA-256).
 * Neither the raw data key nor the passphrase is stored or uploaded.
 * Losing the passphrase means the backup cannot be decrypted by anyone.
 */

export const ENVELOPE_FORMAT = 'p4h-enc'
export const ENVELOPE_VERSION = 1
export const KDF_ITERATIONS = 600_000
export const MIN_PASSPHRASE_LENGTH = 12
export const MAX_ENVELOPE_CHARS = 3_000_000

export interface EncryptedEnvelope {
  format: typeof ENVELOPE_FORMAT
  v: typeof ENVELOPE_VERSION
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string }
  wrap: { name: 'AES-GCM'; iv: string; key: string }
  data: { name: 'AES-GCM'; iv: string; ct: string }
}

const ENVELOPE_KEYS = ['format', 'v', 'kdf', 'wrap', 'data']
const B64 = /^[A-Za-z0-9+/]+={0,2}$/

function subtle(): SubtleCrypto {
  const c = globalThis.crypto
  if (!c?.subtle) throw new Error('This browser cannot encrypt data. Use a current browser over HTTPS.')
  return c.subtle
}
function random(bytes: number): Uint8Array<ArrayBuffer> { return globalThis.crypto.getRandomValues(new Uint8Array(new ArrayBuffer(bytes))) }

export function toBase64(bytes: Uint8Array): string {
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  if (!B64.test(text) || text.length % 4 !== 0) throw new Error('Damaged backup.')
  const raw = atob(text); const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export function passphraseIssues(passphrase: string): string[] {
  const issues: string[] = []
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) issues.push(`Use at least ${MIN_PASSPHRASE_LENGTH} characters.`)
  if (passphrase.length > 512) issues.push('Use at most 512 characters.')
  if (passphrase.trim().length !== passphrase.length) issues.push('Remove spaces at the start or end.')
  return issues
}

async function deriveWrappingKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey'])
}

/** Encrypts any JSON-serializable value. The envelope contains no plaintext metadata. */
export async function encryptJson(value: unknown, passphrase: string, iterations = KDF_ITERATIONS): Promise<EncryptedEnvelope> {
  const issues = passphraseIssues(passphrase)
  if (issues.length) throw new Error(issues.join(' '))
  const salt = random(16), wrapIv = random(12), dataIv = random(12)
  const dataKey = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: dataIv }, dataKey, plaintext))
  const kek = await deriveWrappingKey(passphrase, salt, iterations)
  const wrapped = new Uint8Array(await subtle().wrapKey('raw', dataKey, kek, { name: 'AES-GCM', iv: wrapIv }))
  return {
    format: ENVELOPE_FORMAT, v: ENVELOPE_VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toBase64(salt) },
    wrap: { name: 'AES-GCM', iv: toBase64(wrapIv), key: toBase64(wrapped) },
    data: { name: 'AES-GCM', iv: toBase64(dataIv), ct: toBase64(ct) },
  }
}

/** Strict structural check shared by the browser and the upload server. */
export function isEncryptedEnvelope(v: unknown): v is EncryptedEnvelope {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const e = v as Record<string, unknown>
  const obj = (x: unknown, keys: string[]): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === keys.length && Object.keys(x).every(k => keys.includes(k))
  const b64 = (x: unknown, min: number, max: number) => typeof x === 'string' && x.length >= min && x.length <= max && x.length % 4 === 0 && B64.test(x)
  return Object.keys(e).length === ENVELOPE_KEYS.length && Object.keys(e).every(k => ENVELOPE_KEYS.includes(k))
    && e.format === ENVELOPE_FORMAT && e.v === ENVELOPE_VERSION
    && obj(e.kdf, ['name', 'hash', 'iterations', 'salt']) && e.kdf.name === 'PBKDF2' && e.kdf.hash === 'SHA-256'
    && Number.isInteger(e.kdf.iterations) && (e.kdf.iterations as number) >= 100_000 && (e.kdf.iterations as number) <= 5_000_000 && b64(e.kdf.salt, 24, 24)
    && obj(e.wrap, ['name', 'iv', 'key']) && e.wrap.name === 'AES-GCM' && b64(e.wrap.iv, 16, 16) && b64(e.wrap.key, 64, 64)
    && obj(e.data, ['name', 'iv', 'ct']) && e.data.name === 'AES-GCM' && b64(e.data.iv, 16, 16) && b64(e.data.ct, 24, MAX_ENVELOPE_CHARS)
}

export async function decryptJson(envelope: unknown, passphrase: string): Promise<unknown> {
  if (!isEncryptedEnvelope(envelope)) throw new Error('This is not a Plan4Her encrypted backup.')
  try {
    const kek = await deriveWrappingKey(passphrase, fromBase64(envelope.kdf.salt), envelope.kdf.iterations)
    const dataKey = await subtle().unwrapKey('raw', fromBase64(envelope.wrap.key), kek, { name: 'AES-GCM', iv: fromBase64(envelope.wrap.iv) }, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
    const plaintext = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.data.iv) }, dataKey, fromBase64(envelope.data.ct))
    return JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    // Authenticated encryption: a wrong passphrase and tampering are indistinguishable.
    throw new Error('Wrong passphrase, or the backup was changed or damaged.')
  }
}
