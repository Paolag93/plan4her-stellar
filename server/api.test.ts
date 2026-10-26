/* Run: node server/api.test.ts. Uses a fake Pinata; never contacts the network. */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApi } from './api.ts'
import { encryptJson } from '../src/domain/encryption.ts'

const JWT = 'test-only-jwt-value-never-real'
const calls: { url: string; auth: string | null; body: FormData }[] = []
const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input)
  if (url.includes('/v3/files')) { calls.push({ url, auth: new Headers(init?.headers).get('authorization'), body: init?.body as FormData }); return new Response(JSON.stringify({ data: { cid: 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy' } }), { status: 200 }) }
  if (url.includes('/ipfs/')) return new Response(JSON.stringify(stored), { status: 200 })
  return new Response('nope', { status: 404 })
}) as typeof fetch
let stored: unknown = null
let clock = Date.parse('2026-10-25T12:00:00Z')

async function start(config: Parameters<typeof createApi>[0]) {
  const api = createApi({ fetchImpl: fakeFetch, now: () => clock, sessionSecret: 's'.repeat(40), ...config })
  const server = createServer(async (req, res) => { if (!await api(req, res)) res.writeHead(404).end() })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return { base, close: () => new Promise<void>(r => server.close(() => r())) }
}
const json = (body: unknown) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

// Disabled deployment: no access code, no JWT.
{
  const s = await start({})
  assert.deepEqual(await (await fetch(`${s.base}/api/status`)).json(), { uploads: false, sessions: false, network: 'public' })
  assert.equal((await fetch(`${s.base}/api/session`, json({ accessCode: 'x' }))).status, 503)
  await s.close()
}

const s = await start({ pinataJwt: JWT, accessCode: 'demo-code-2026' })
// Unauthenticated upload is refused.
const envelope = await encryptJson({ cycleBasics: { lastPeriodStart: '2026-10-01' } }, 'synthetic passphrase', 100_000)
assert.equal((await fetch(`${s.base}/api/ipfs/upload`, json(envelope))).status, 401)
assert.equal((await fetch(`${s.base}/api/ipfs/upload`, { ...json(envelope), headers: { 'content-type': 'application/json', authorization: 'Bearer forged.token' } })).status, 401)
// Wrong access code refused; right one issues a token that never contains the JWT.
assert.equal((await fetch(`${s.base}/api/session`, json({ accessCode: 'wrong' }))).status, 401)
const session = await (await fetch(`${s.base}/api/session`, json({ accessCode: 'demo-code-2026' }))).json() as { token: string }
assert.ok(session.token && !JSON.stringify(session).includes(JWT))
const auth = { 'content-type': 'application/json', authorization: `Bearer ${session.token}` }
// Plaintext is rejected before reaching Pinata.
const plain = await fetch(`${s.base}/api/ipfs/upload`, { method: 'POST', headers: auth, body: JSON.stringify({ cycleBasics: { lastPeriodStart: '2026-10-01' } }) })
assert.equal(plain.status, 422); assert.equal(calls.length, 0)
assert.equal((await fetch(`${s.base}/api/ipfs/upload`, { method: 'POST', headers: auth, body: JSON.stringify({ ...envelope, note: 'period' }) })).status, 422)
assert.equal((await fetch(`${s.base}/api/ipfs/upload`, { method: 'POST', headers: { ...auth, 'content-type': 'text/plain' }, body: 'x' })).status, 415)
// Valid ciphertext is forwarded with the server-side JWT and a neutral name.
const upload = await fetch(`${s.base}/api/ipfs/upload`, { method: 'POST', headers: auth, body: JSON.stringify(envelope) })
assert.equal(upload.status, 200)
const uploaded = await upload.json() as { cid: string }
assert.match(uploaded.cid, /^baf/)
assert.equal(calls.length, 1); assert.equal(calls[0].auth, `Bearer ${JWT}`)
const name = calls[0].body.get('name') as string
assert.match(name, /^p4h-[0-9a-f]{16}\.json$/)
const sentText = await (calls[0].body.get('file') as Blob).text()
assert.ok(!sentText.includes('lastPeriodStart') && !sentText.includes('2026-10-01'), 'only ciphertext is uploaded')
assert.equal(calls[0].body.get('network'), 'public')
// Retrieval returns only envelopes and validates CIDs.
stored = envelope
assert.deepEqual(await (await fetch(`${s.base}/api/ipfs/${uploaded.cid}`, { headers: auth })).json(), envelope)
assert.equal((await fetch(`${s.base}/api/ipfs/notacid`, { headers: auth })).status, 400)
stored = { plaintext: true }
assert.equal((await fetch(`${s.base}/api/ipfs/${uploaded.cid}`, { headers: auth })).status, 422)
// Oversized bodies rejected.
assert.equal((await fetch(`${s.base}/api/ipfs/upload`, { method: 'POST', headers: auth, body: 'x'.repeat(3_200_000) })).status, 413)
// Rate limiting per session (10/hour).
let limited = 0
for (let i = 0; i < 12; i++) if ((await fetch(`${s.base}/api/ipfs/upload`, { method: 'POST', headers: auth, body: JSON.stringify(envelope) })).status === 429) limited++
assert.ok(limited >= 2, 'upload rate limit enforced')
// Session brute force is rate limited per IP.
let sessionLimited = false
for (let i = 0; i < 12; i++) if ((await fetch(`${s.base}/api/session`, json({ accessCode: 'guess' + i }))).status === 429) sessionLimited = true
assert.ok(sessionLimited)
// Tokens expire after 30 minutes.
clock += 31 * 60_000
assert.equal((await fetch(`${s.base}/api/ipfs/${'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy'}`, { headers: auth })).status, 401)
await s.close()
console.log('Server tests passed: disabled-by-default, access-code sessions, forged/expired token rejection, ciphertext-only uploads, server-side JWT, neutral metadata, CID validation, size and rate limits.')
