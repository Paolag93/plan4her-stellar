/*
 * Production entry: serves the built PWA from dist/ and the encrypted-backup API.
 * Run with Node 22.18+ (built-in type stripping): `npm run start`.
 * Secrets come only from the hosting provider's environment settings.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { createApi } from './api.ts'

const root = resolve(process.env.STATIC_DIR ?? 'dist')
const api = createApi({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
  pinataNetwork: process.env.PINATA_NETWORK === 'private' ? 'private' : 'public',
  accessCode: process.env.DEMO_ACCESS_CODE,
  sessionSecret: process.env.SESSION_SECRET,
})
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' }
export const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://soroban-testnet.stellar.org https://horizon-testnet.stellar.org https://friendbot.stellar.org; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
}

const server = createServer(async (req, res) => {
  if (await api(req, res)) return
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
  let file = normalize(join(root, pathname))
  if (!file.startsWith(root)) { res.writeHead(403).end(); return }
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html') } catch { file = join(root, 'index.html') }
  try {
    const body = await readFile(file)
    const immutable = file.includes(`${join(root, 'assets')}`)
    res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch { res.writeHead(404, SECURITY_HEADERS).end('Not found') }
})
const port = Number(process.env.PORT ?? 8787)
server.listen(port, () => console.log(`Plan4Her server on :${port} (uploads ${process.env.PINATA_JWT ? 'enabled' : 'disabled'})`))
