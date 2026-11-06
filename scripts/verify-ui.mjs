import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspace = path.resolve(root, '..')
const output = path.join(workspace, 'analysis', 'verification')
fs.mkdirSync(output, { recursive: true })
const dataDir = path.join(workspace, 'analysis', 'ui-data')
fs.rmSync(dataDir, { recursive: true, force: true })
const baseUrl = 'http://127.0.0.1:7300'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

for (let attempt = 0; attempt < 5; attempt++) {
  try { await fetch('http://127.0.0.1:7102/api/health', { signal: AbortSignal.timeout(500) }); throw new Error('Port 7102 is already in use; stop the existing development server first.') } catch (error) { if (error.message.includes('already in use')) throw error }
}

const server = spawn(process.execPath, ['scripts/dev.mjs', '--host', '127.0.0.1', '--port', '7300'], {
  cwd: root,
  detached: true,
  windowsHide: true,
  stdio: 'ignore',
  env: { ...process.env, MADAR_DATA_DIR: dataDir, MADAR_API_PORT: '7102', MADAR_ALLOWED_ORIGINS: baseUrl },
})

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:7102/api/health', { signal: AbortSignal.timeout(800) })
      if (response.ok) return
    } catch {}
    await sleep(400)
  }
  throw new Error('Development server did not become ready.')
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const consoleErrors = []
  const notFound = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('response', response => { if (response.status() === 404) notFound.push(response.url()) })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  if (await page.locator('#auth-name').count()) {
    await page.locator('#auth-name').fill('مستخدم الاختبار')
    await page.locator('#auth-email').fill('ui.test@example.com')
    await page.locator('#auth-password').fill('test-password-123')
    await page.locator('#auth-confirm').fill('test-password-123')
    await page.getByRole('button', { name: 'إنشاء المدير وبدء العمل' }).click()
  }
  await page.getByRole('heading', { name: 'من الرسالة…' }).waitFor({ timeout: 30_000 })
  await page.screenshot({ path: path.join(output, 'madar-dashboard-desktop.png'), fullPage: true })

  await page.getByRole('button', { name: 'كيف يعمل مدار؟' }).click()
  await page.getByRole('dialog').getByText('ثلاث خطوات مترابطة تبدأ بالحساب وتنتهي بعمل واضح.').waitFor()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'فتح وكيل مدار', exact: true }).click()
  await page.getByText('مساعدك للخطوة التالية، وللردود والمحتوى.').waitFor()
  await sleep(700)
  await page.screenshot({ path: path.join(output, 'madar-assistant-desktop.png'), fullPage: true })
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'الحسابات والصفحات', exact: true }).click()
  await page.getByRole('heading', { name: 'الحسابات', exact: true }).waitFor()
  await page.getByRole('button', { name: 'الرئيسية', exact: true }).click()
  await page.getByRole('heading', { name: 'من الرسالة…' }).waitFor()

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'من الرسالة…' }).waitFor()
  await page.screenshot({ path: path.join(output, 'madar-dashboard-mobile.png'), fullPage: true })
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  const metrics = await page.evaluate(() => ({
    resources: performance.getEntriesByType('resource').length,
    transferBytes: performance.getEntriesByType('resource').reduce((sum, item) => sum + (item.transferSize || 0), 0),
  }))

  console.log(JSON.stringify({ consoleErrors, notFound, mobileOverflow, metrics, screenshots: ['madar-dashboard-desktop.png', 'madar-assistant-desktop.png', 'madar-dashboard-mobile.png'] }, null, 2))
  if (consoleErrors.length || notFound.length || mobileOverflow) throw new Error('UI verification failed.')
} finally {
  if (browser) await browser.close()
  if (server.pid) spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
}
