import {
  consumeOAuthState, createOAuthState, deleteSocialAccount, getSetting,
  getSocialAccount, listSocialAccounts, setSetting, storeAccountPages,
  updateAccountStatus, upsertSocialAccount,
} from './store.mjs'
import { randomToken } from './security.mjs'

const graphVersion = process.env.FACEBOOK_GRAPH_VERSION || 'v23.0'
const graphBase = process.env.FACEBOOK_GRAPH_BASE || 'https://graph.facebook.com'
const authBase = process.env.FACEBOOK_AUTH_BASE || 'https://www.facebook.com'
const scopes = process.env.FACEBOOK_SCOPES || 'pages_show_list,pages_read_engagement'

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

function requireConfig() {
  const appId = getSetting('facebook_app_id')
  const appSecret = getSetting('facebook_app_secret')
  const publicUrl = getSetting('facebook_public_url')
  if (!appId || !appSecret || !publicUrl) throw new HttpError(400, 'أكمل إعدادات تطبيق Meta أولًا.')
  return { appId, appSecret, publicUrl: publicUrl.replace(/\/$/, '') }
}

export function facebookConfig() {
  try {
    const config = requireConfig()
    return {
      configured: true,
      appId: config.appId,
      publicUrl: config.publicUrl,
      redirectUri: `${config.publicUrl}/api/facebook/oauth/callback`,
      graphVersion,
      manualTokenEnabled: true,
    }
  } catch {
    return { configured: false, appId: '', publicUrl: '', redirectUri: '', graphVersion, manualTokenEnabled: true }
  }
}

export function saveFacebookConfig({ appId, appSecret, publicUrl }) {
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(String(appId || ''))) throw new HttpError(400, 'معرف تطبيق Meta غير صالح.')
  if (String(appSecret || '').length < 8) throw new HttpError(400, 'أدخل App Secret صالحًا.')
  let parsed
  try { parsed = new URL(publicUrl) } catch { throw new HttpError(400, 'أدخل رابط HTTPS عامًا صالحًا.') }
  const local = ['localhost', '127.0.0.1'].includes(parsed.hostname)
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    throw new HttpError(400, 'الرابط العام يجب أن يستخدم HTTPS. localhost مسموح للاختبار فقط.')
  }
  setSetting('facebook_app_id', String(appId))
  setSetting('facebook_app_secret', String(appSecret))
  setSetting('facebook_public_url', parsed.toString().replace(/\/$/, ''))
  return facebookConfig()
}

export async function graphRequest(path, accessToken, options = {}) {
  const response = await fetch(`${graphBase}/${graphVersion}/${path}`, {
    ...options,
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(options.headers || {}) },
  })
  const text = await response.text()
  let payload
  try { payload = JSON.parse(text) } catch { payload = null }
  if (!response.ok || payload?.error) {
    const detail = payload?.error?.message || `HTTP ${response.status}`
    throw new HttpError(400, `رفضت Meta الطلب: ${String(detail).slice(0, 220)}`)
  }
  return payload
}

export function startFacebookOAuth(userId) {
  const config = requireConfig()
  const state = randomToken(32)
  createOAuthState(userId, state, Date.now() + 10 * 60 * 1000)
  const redirectUri = `${config.publicUrl}/api/facebook/oauth/callback`
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    scope: scopes,
  })
  return `${authBase}/${graphVersion}/dialog/oauth?${params}`
}

async function connectToken(userId, accessToken) {
  if (String(accessToken || '').length < 20) throw new HttpError(400, 'رمز الوصول غير صالح.')
  const profile = await graphRequest('me?fields=id,name', accessToken)
  if (!profile?.id || !profile?.name) throw new HttpError(400, 'لم ترجع Meta هوية حساب صالحة.')
  return upsertSocialAccount({
    userId, provider: 'facebook', providerAccountId: profile.id,
    name: profile.name, handle: `facebook.com/${profile.id}`,
    accessToken, metadata: { source: 'facebook-login' },
  })
}

export async function completeFacebookOAuth(query, userId) {
  if (query.error) throw new HttpError(400, 'تم إلغاء الربط أو رفضه من فيسبوك.')
  const config = requireConfig()
  if (!query.state || !consumeOAuthState(query.state, userId)) throw new HttpError(400, 'انتهت جلسة الربط أو أن حالة OAuth غير صالحة. ابدأ من جديد.')
  if (!query.code) throw new HttpError(400, 'لم يصل رمز تفويض من فيسبوك.')
  const redirectUri = `${config.publicUrl}/api/facebook/oauth/callback`
  const body = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: redirectUri,
    code: String(query.code),
  })
  const tokenResponse = await graphRequest('oauth/access_token', '', { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  if (!tokenResponse?.access_token) throw new HttpError(400, 'تعذر استبدال رمز التفويض برمز وصول.')
  return connectToken(userId, tokenResponse.access_token)
}

export async function connectManualToken(userId, accessToken) {
  return connectToken(userId, accessToken)
}

export function facebookAccounts(userId) {
  return listSocialAccounts(userId, 'facebook')
}

export async function verifyFacebookAccount(id, userId) {
  const account = getSocialAccount(id, userId)
  if (!account) throw new HttpError(404, 'الحساب غير موجود.')
  try {
    const { decrypt } = await import('./security.mjs')
    await graphRequest('me?fields=id,name', decrypt(account.token_encrypted))
    return updateAccountStatus(id, userId, 'active')
  } catch (error) {
    updateAccountStatus(id, userId, 'attention')
    throw error
  }
}

export async function facebookPages(id, userId) {
  const account = getSocialAccount(id, userId)
  if (!account) throw new HttpError(404, 'الحساب غير موجود.')
  const { decrypt } = await import('./security.mjs')
  const result = await graphRequest('me/accounts?fields=id,name,tasks,access_token', decrypt(account.token_encrypted))
  return storeAccountPages(id, result?.data || [])
}

export function removeFacebookAccount(id, userId) {
  const account = getSocialAccount(id, userId)
  if (!account) throw new HttpError(404, 'الحساب غير موجود.')
  deleteSocialAccount(id, userId)
}
