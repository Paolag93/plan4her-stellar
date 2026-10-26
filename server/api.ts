/*
 * Minimal API for encrypted backups. The Pinata JWT lives only in server
 * environment variables; browsers receive short-lived session tokens after
 * presenting the demo access code. The server accepts only Plan4Her encrypted
 * envelopes, so plaintext (cycle, task or goal data) cannot be uploaded through
 * it. Request bodies are never logged.
 */
import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isEncryptedEnvelope, MAX_ENVELOPE_CHARS } from '../src/domain/encryption.ts'

export interface ApiConfig {
  pinataJwt?: string
  /** Dedicated or public gateway host, e.g. "example.mypinata.cloud". */
  pinataGateway?: string
  pinataNetwork?: 'public' | 'private'
  accessCode?: string
  sessionSecret?: string
  fetchImpl?: typeof fetch
  now?: () => number
  uploadUrl?: string
}

const MAX_BODY = MAX_ENVELOPE_CHARS + 4096
const SESSION_TTL_MS = 30 * 60_000
const CID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,100})$/

type Bucket = { count: number; resetAt: number }
class RateLimiter {
  private buckets = new Map<string, Bucket>()
  private limit: number
  private windowMs: number
  private now: () => number
  constructor(limit: number, windowMs: number, now: () => number) { this.limit = limit; this.windowMs = windowMs; this.now = now }
  take(key: string): boolean {
    const t = this.now()
    const bucket = this.buckets.get(key)
    if (!bucket || bucket.resetAt <= t) { this.buckets.set(key, { count: 1, resetAt: t + this.windowMs }); this.prune(t); return true }
    if (bucket.count >= this.limit) return false
    bucket.count++; return true
  }
  private prune(t: number) { if (this.buckets.size > 5000) for (const [k, b] of this.buckets) if (b.resetAt <= t) this.buckets.delete(k) }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' })
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<string> {
  const declared = Number(req.headers['content-length'] ?? 0)
  if (declared > MAX_BODY) throw Object.assign(new Error('too-large'), { status: 413 })
  let size = 0; const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY) throw Object.assign(new Error('too-large'), { status: 413 })
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function clientIp(req: IncomingMessage): string {
  // Behind a single trusted proxy (e.g. Render/Fly), the left-most forwarded hop is the client.
  const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
  return forwarded || req.socket.remoteAddress || 'unknown'
}

const digest = (value: string) => createHash('sha256').update(value).digest()

export function createApi(config: ApiConfig) {
  const now = config.now ?? Date.now
  const fetchImpl = config.fetchImpl ?? fetch
  const secret = config.sessionSecret && config.sessionSecret.length >= 32 ? config.sessionSecret : randomBytes(32).toString('hex')
  const sessionLimiter = new RateLimiter(10, 15 * 60_000, now)
  const uploadLimiterSession = new RateLimiter(10, 60 * 60_000, now)
  const uploadLimiterIp = new RateLimiter(30, 60 * 60_000, now)
  const fetchLimiter = new RateLimiter(60, 60 * 60_000, now)

  const sign = (payload: string) => createHmac('sha256', secret).update(payload).digest('base64url')
  function issueToken(): { token: string; expiresAt: number } {
    const expiresAt = now() + SESSION_TTL_MS
    const payload = Buffer.from(JSON.stringify({ sid: randomBytes(12).toString('hex'), exp: expiresAt })).toString('base64url')
    return { token: `${payload}.${sign(payload)}`, expiresAt }
  }
  function verifyToken(header: string | undefined): string | null {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null
    const expected = Buffer.from(sign(payload)); const given = Buffer.from(signature)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sid?: unknown; exp?: unknown }
      return typeof data.sid === 'string' && typeof data.exp === 'number' && data.exp > now() ? data.sid : null
    } catch { return null }
  }

  const status = () => ({ uploads: Boolean(config.pinataJwt), sessions: Boolean(config.accessCode), network: config.pinataNetwork ?? 'public' })

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/')) return false
    const ip = clientIp(req)
    try {
      if (url.pathname === '/api/status' && req.method === 'GET') { send(res, 200, status()); return true }

      if (url.pathname === '/api/session' && req.method === 'POST') {
        if (!config.accessCode) { send(res, 503, { error: 'Encrypted cloud backup is not enabled on this deployment.' }); return true }
        if (!sessionLimiter.take(ip)) { send(res, 429, { error: 'Too many attempts. Try again later.' }); return true }
        let code = ''
        try { const body = JSON.parse(await readBody(req)) as { accessCode?: unknown }; code = typeof body.accessCode === 'string' ? body.accessCode : '' } catch { /* invalid */ }
        if (!code || !timingSafeEqual(digest(code), digest(config.accessCode))) { send(res, 401, { error: 'That access code is not valid.' }); return true }
        send(res, 200, issueToken()); return true
      }

      if (url.pathname === '/api/ipfs/upload' && req.method === 'POST') {
        const sid = verifyToken(req.headers.authorization)
        if (!sid) { send(res, 401, { error: 'Sign in with the demo access code first.' }); return true }
        if (!config.pinataJwt) { send(res, 503, { error: 'Encrypted cloud backup is not configured on this server.' }); return true }
        if (!uploadLimiterSession.take(sid) || !uploadLimiterIp.take(ip)) { send(res, 429, { error: 'Upload limit reached. Try again later.' }); return true }
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) { send(res, 415, { error: 'Send an encrypted backup.' }); return true }
        let envelope: unknown
        try { envelope = JSON.parse(await readBody(req)) } catch (error) { if ((error as { status?: number }).status === 413) throw error; send(res, 400, { error: 'Send an encrypted backup.' }); return true }
        // Only encrypted envelopes are accepted: this rejects plaintext uploads.
        if (!isEncryptedEnvelope(envelope)) { send(res, 422, { error: 'Only Plan4Her encrypted backups can be uploaded.' }); return true }
        const form = new FormData()
        // Neutral random name: no user, cycle or goal information in metadata.
        const name = `p4h-${randomBytes(8).toString('hex')}.json`
        form.append('file', new Blob([JSON.stringify(envelope)], { type: 'application/json' }), name)
        form.append('network', config.pinataNetwork ?? 'public')
        form.append('name', name)
        const upstream = await fetchImpl(config.uploadUrl ?? 'https://uploads.pinata.cloud/v3/files', { method: 'POST', headers: { Authorization: `Bearer ${config.pinataJwt}` }, body: form })
        if (!upstream.ok) { send(res, 502, { error: `Pinata upload failed (${upstream.status}).` }); return true }
        const result = await upstream.json() as { data?: { cid?: unknown } }
        const cid = result.data?.cid
        if (typeof cid !== 'string' || !CID.test(cid)) { send(res, 502, { error: 'Pinata returned an unexpected response.' }); return true }
        send(res, 200, { cid, network: config.pinataNetwork ?? 'public', uploadedAt: new Date(now()).toISOString() }); return true
      }

      const fetchMatch = url.pathname.match(/^\/api\/ipfs\/([A-Za-z0-9]+)$/)
      if (fetchMatch && req.method === 'GET') {
        const sid = verifyToken(req.headers.authorization)
        if (!sid) { send(res, 401, { error: 'Sign in with the demo access code first.' }); return true }
        if (!fetchLimiter.take(sid)) { send(res, 429, { error: 'Too many requests. Try again later.' }); return true }
        const cid = fetchMatch[1]
        if (!CID.test(cid)) { send(res, 400, { error: 'That is not a valid CID.' }); return true }
        const gateway = config.pinataGateway ?? 'gateway.pinata.cloud'
        const upstream = await fetchImpl(`https://${gateway}/ipfs/${cid}`)
        if (!upstream.ok) { send(res, 502, { error: `Could not retrieve this CID (${upstream.status}).` }); return true }
        const text = await upstream.text()
        if (text.length > MAX_BODY) { send(res, 502, { error: 'Retrieved file is too large.' }); return true }
        let envelope: unknown
        try { envelope = JSON.parse(text) } catch { envelope = null }
        if (!isEncryptedEnvelope(envelope)) { send(res, 422, { error: 'This CID does not contain a Plan4Her encrypted backup.' }); return true }
        send(res, 200, envelope); return true
      }

      send(res, 404, { error: 'Not found.' }); return true
    } catch (error) {
      const code = (error as { status?: number }).status
      send(res, code === 413 ? 413 : 500, { error: code === 413 ? 'Backup is too large.' : 'Server error.' })
      return true
    }
  }
}
