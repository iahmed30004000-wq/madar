import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import {
  createSession, createUser, deleteSession, findUserByEmail, findUserById,
  getWorkspace, setWorkspace, userCount, userForSession,
} from './store.mjs'
import { randomToken, verifyPassword } from './security.mjs'
import {
  completeFacebookOAuth, connectManualToken, facebookAccounts, facebookConfig,
  facebookPages, removeFacebookAccount, saveFacebookConfig, startFacebookOAuth,
  verifyFacebookAccount, HttpError,
} from './facebook.mjs'
import { chatGateway, gatewayStatus, testGateway } from './gateway.mjs'

const app = express()
const serverDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(serverDir, '..', 'dist')
const port = Number(process.env.PORT || process.env.MADAR_API_PORT || 7101)
const host = process.env.MADAR_API_HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1')
const cookieName = 'madar_session'
const loginAttempts = new Map()

app.disable('x-powered-by')
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  const origin = req.headers.origin
  if (origin) {
    const allowed = new Set([
      'http://localhost:7100', 'http://127.0.0.1:7100',
      ...String(process.env.MADAR_ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    ])
    if (!allowed.has(origin)) return res.status(403).json({ message: 'مصدر الطلب غير مسموح.' })
  }
  next()
})
app.use(express.json({ limit: '3mb' }))
app.use((req, _res, next) => {
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=')
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))]
  }))
  req.sessionToken = cookies[cookieName]
  req.user = userForSession(req.sessionToken)
  next()
})

const asyncRoute = handler => async (req, res, next) => {
  try { await handler(req, res) } catch (error) { next(error) }
}
const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ message: 'سجّل الدخول للمتابعة.' })
const requireAdmin = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'هذه العملية تتطلب صلاحية مدير.' })
const issueSession = (res, userId) => {
  const token = randomToken(32)
  const expiresAt = createSession(userId, token)
  res.cookie(cookieName, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.MADAR_SECURE_COOKIE === 'true',
    expires: new Date(expiresAt), path: '/',
  })
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'madar-api' }))
app.get('/api/auth/status', (req, res) => res.json({ setupRequired: userCount() === 0, authenticated: Boolean(req.user), user: req.user || null }))
app.post('/api/auth/setup', asyncRoute(async (req, res) => {
  if (userCount() !== 0) throw new HttpError(409, 'تم إعداد الحساب الإداري مسبقًا.')
  const { name, email, password } = req.body || {}
  if (!String(name || '').trim()) throw new HttpError(400, 'أدخل اسم المدير.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) throw new HttpError(400, 'أدخل بريدًا إلكترونيًا صالحًا.')
  if (String(password || '').length < 10) throw new HttpError(400, 'كلمة المرور يجب أن تكون 10 أحرف على الأقل.')
  const user = createUser({ name: name.trim(), email: email.trim(), passwordHash: (await import('./security.mjs')).hashPassword(password) })
  issueSession(res, user.id)
  res.status(201).json({ user })
}))
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim()
  const key = `${req.ip}:${email}`
  const recent = (loginAttempts.get(key) || []).filter(time => time > Date.now() - 60_000)
  if (recent.length >= 6) throw new HttpError(429, 'محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.')
  const record = findUserByEmail(email)
  if (!record || !verifyPassword(String(req.body?.password || ''), record.password_hash)) {
    loginAttempts.set(key, [...recent, Date.now()])
    throw new HttpError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.')
  }
  loginAttempts.delete(key)
  issueSession(res, record.id)
  res.json({ user: findUserById(record.id) })
}))
app.post('/api/auth/logout', (req, res) => {
  deleteSession(req.sessionToken)
  res.clearCookie(cookieName, { path: '/' })
  res.json({ ok: true })
})
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }))

app.get('/api/bootstrap', requireAuth, (req, res) => {
  res.json({ workspace: getWorkspace(req.user.id)?.data || null, facebookAccounts: facebookAccounts(req.user.id) })
})
app.put('/api/workspace', requireAuth, (req, res) => {
  if (!req.body?.data || typeof req.body.data !== 'object' || Array.isArray(req.body.data)) return res.status(400).json({ message: 'بيانات مساحة العمل غير صالحة.' })
  const updatedAt = setWorkspace(req.user.id, req.body.data)
  res.json({ ok: true, updatedAt })
})

app.get('/api/facebook/config', requireAuth, (_req, res) => res.json(facebookConfig()))
app.post('/api/facebook/config', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  res.json(saveFacebookConfig(req.body || {}))
}))
app.get('/api/facebook/oauth/start', requireAuth, (req, res) => res.redirect(startFacebookOAuth(req.user.id)))
app.get('/api/facebook/oauth/callback', requireAuth, asyncRoute(async (req, res) => {
  try {
    await completeFacebookOAuth(req.query, req.user.id)
    res.redirect('/#/accounts?connected=1')
  } catch (error) {
    const message = error instanceof HttpError ? error.message : 'تعذر إكمال الربط مع فيسبوك.'
    res.redirect(`/#/accounts?oauthError=${encodeURIComponent(message)}`)
  }
}))
app.get('/api/facebook/accounts', requireAuth, (req, res) => res.json({ accounts: facebookAccounts(req.user.id) }))
app.post('/api/facebook/token', requireAuth, asyncRoute(async (req, res) => {
  const account = await connectManualToken(req.user.id, req.body?.accessToken)
  res.status(201).json({ account })
}))
app.post('/api/facebook/accounts/:id/verify', requireAuth, asyncRoute(async (req, res) => {
  res.json({ account: await verifyFacebookAccount(req.params.id, req.user.id) })
}))
app.get('/api/facebook/accounts/:id/pages', requireAuth, asyncRoute(async (req, res) => {
  res.json({ pages: await facebookPages(req.params.id, req.user.id) })
}))
app.delete('/api/facebook/accounts/:id', requireAuth, (req, res) => {
  removeFacebookAccount(req.params.id, req.user.id)
  res.json({ ok: true })
})

const aiAttempts = new Map()
const checkAiRate = (userId, limit) => {
  const recent = (aiAttempts.get(userId) || []).filter(time => time > Date.now() - 60_000)
  if (recent.length >= limit) throw new HttpError(429, 'طلبات كثيرة على المساعد. انتظر دقيقة ثم حاول مجددًا.')
  aiAttempts.set(userId, [...recent, Date.now()])
}
app.get('/api/ai/status', requireAuth, (_req, res) => res.json(gatewayStatus()))
app.post('/api/ai/test', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  checkAiRate(req.user.id, 20)
  res.json(await testGateway())
}))
app.post('/api/ai/chat', requireAuth, asyncRoute(async (req, res) => {
  checkAiRate(req.user.id, 30)
  res.json(await chatGateway(req.body?.messages, { maxTokens: req.body?.maxTokens }))
}))
app.use('/api', (_req, res) => res.status(404).json({ message: 'مسار API غير موجود.' }))

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false }))
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((error, _req, res, _next) => {
  const status = error instanceof HttpError ? error.status : 500
  const message = error instanceof HttpError ? error.message : 'حدث خطأ داخلي غير متوقع.'
  if (status === 500) console.error('API internal error:', error?.name || 'Error')
  res.status(status).json({ message })
})

app.listen(port, host, () => {
  console.log(`Madar API listening on http://${host}:${port}`)
})
