import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspace = path.resolve(root, '..')
const output = path.join(workspace, 'analysis', 'verification')
fs.mkdirSync(output, { recursive: true })
const dataDir = path.join(workspace, 'analysis', 'inbox-ui-data')
fs.rmSync(dataDir, { recursive: true, force: true })
const baseUrl = 'http://127.0.0.1:7300'
const sent = []
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const graph = http.createServer((req, res) => {
  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    sent.push({ method: req.method, url: req.url, body: Buffer.concat(chunks).toString('utf8') })
    res.setHeader('Content-Type', 'application/json')
    const respond = value => res.end(JSON.stringify(value))
    if (req.url === '/v23.0/me?fields=id,name') return respond({ id: 'account-1', name: 'حساب الاختبار' })
    if (req.url === '/v23.0/me/accounts?fields=id,name,tasks,access_token') return respond({ data: [{ id: 'page-1', name: 'صفحة الاختبار', tasks: [], access_token: 'page-token' }] })
    if (req.url === '/v23.0/page-1/conversations?fields=id,updated_time,participants,snippet,unread_count,can_reply&limit=25') return respond({ data: [{ id: 'thread-1', updated_time: '2026-11-06T00:00:00Z', snippet: 'أحتاج السعر', unread_count: 1, can_reply: true, participants: { data: [{ id: '123456789', name: 'عميل تجريبي' }, { id: 'page-1', name: 'صفحة الاختبار' }] } }] })
    if (req.url === '/v23.0/thread-1/messages?fields=id,created_time,from,to,message,attachments&limit=50') return respond({ data: [{ id: 'message-1', created_time: '2026-11-06T00:00:00Z', from: { id: '123456789', name: 'عميل تجريبي' }, to: { data: [{ id: 'page-1', name: 'صفحة الاختبار' }] }, message: 'أحتاج السعر', attachments: { data: [] } }] })
    if (req.method === 'POST' && req.url === '/v23.0/page-1/messages') return respond({ recipient_id: '123456789', message_id: 'sent-message-1' })
    res.statusCode = 404
    respond({ error: 'not_found' })
  })
})
await new Promise(resolve => graph.listen(0, '127.0.0.1', resolve))

const server = spawn(process.execPath, ['scripts/dev.mjs', '--host', '127.0.0.1', '--port', '7300'], {
  cwd: root, detached: true, windowsHide: true, stdio: 'ignore',
  env: { ...process.env, MADAR_DATA_DIR: dataDir, MADAR_API_PORT: '7102', MADAR_ALLOWED_ORIGINS: baseUrl, FACEBOOK_GRAPH_BASE: `http://127.0.0.1:${graph.address().port}` },
})

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch('http://127.0.0.1:7102/api/health', { signal: AbortSignal.timeout(800) })).ok) return } catch {}
    await sleep(400)
  }
  throw new Error('Development server did not become ready.')
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  const consoleErrors = []
  const pageErrors = []
  const notFound = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('response', response => { if (response.status() === 404) notFound.push(response.url()) })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.locator('#auth-name').fill('مستخدم الاختبار')
  await page.locator('#auth-email').fill('inbox.test@example.com')
  await page.locator('#auth-password').fill('test-password-123')
  await page.locator('#auth-confirm').fill('test-password-123')
  await page.getByRole('button', { name: 'إنشاء المدير وبدء العمل' }).click()
  await page.getByRole('heading', { name: 'من الرسالة…' }).waitFor()

  const connected = await page.request.post(`${baseUrl}/api/facebook/token`, { data: { accessToken: 'dummy-user-token-12345' } })
  if (!connected.ok()) throw new Error(`Mock account connection failed: ${connected.status()} ${await connected.text()}`)
  await page.goto(`${baseUrl}/#/inbox`, { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByText('عميل تجريبي').first().waitFor({ timeout: 20_000 })
  await page.getByText('أحتاج السعر', { exact: true }).first().waitFor()

  await page.getByPlaceholder('اكتب ردًا إلى عميل تجريبي...').fill('السعر 20 دينارًا')
  await page.getByRole('button', { name: 'مراجعة وإرسال' }).click()
  await page.getByRole('heading', { name: 'تأكيد إرسال رسالة حقيقية؟' }).waitFor()
  await page.screenshot({ path: path.join(output, 'madar-inbox-confirmation.png'), fullPage: true })
  await page.getByRole('button', { name: 'تأكيد الإرسال', exact: true }).click()
  await page.getByText('أرسلت Meta الرسالة بنجاح').waitFor()
  await page.getByText('السعر 20 دينارًا', { exact: true }).last().waitFor()
  await page.screenshot({ path: path.join(output, 'madar-inbox-sent.png'), fullPage: true })

  const sendBody = sent.at(-1).body
  if (!sendBody.includes('messaging_type=RESPONSE')) throw new Error('Send payload was not confirmed as RESPONSE.')
  console.log(JSON.stringify({ consoleErrors, pageErrors, notFound, screenshots: ['madar-inbox-confirmation.png', 'madar-inbox-sent.png'] }, null, 2))
  if (consoleErrors.length || pageErrors.length || notFound.length) throw new Error('Inbox verification failed.')
} finally {
  if (browser) await browser.close()
  if (server.pid) spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
  await new Promise(resolve => graph.close(resolve))
}
