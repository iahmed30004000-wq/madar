import dns from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { HttpError } from './facebook.mjs'

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024
const DEFAULT_EXTERNAL_HOST = 'glm.erv.zakiai.io'
let chatQueue = Promise.resolve()

function validModel(value) {
  const model = String(value || '')
  return model.length >= 3 && model.length <= 120 && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(model) && !model.includes('..') && !model.includes('//') && !model.endsWith('/') ? model : null
}

function validKey(value) {
  const key = String(value || '')
  return key.length >= 8 && key.length <= 400 && /^[\x21-\x7e]+$/.test(key) ? key : null
}

function parseBaseUrl(value) {
  if (!value) return null
  let url
  try { url = new URL(value) } catch { throw new HttpError(400, 'عنوان بوابة النموذج غير صالح.') }
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  if (url.username || url.password || url.search || url.hash) throw new HttpError(400, 'عنوان بوابة النموذج يحتوي بيانات غير مسموحة.')
  if (!['/', '/v1', '/v1/'].includes(url.pathname)) throw new HttpError(400, 'عنوان البوابة يجب أن يكون الأصل أو ينتهي بـ /v1 فقط.')
  if (url.protocol === 'http:' && !(local && process.env.NODE_ENV !== 'production')) throw new HttpError(400, 'بوابة النموذج الخارجية يجب أن تستخدم HTTPS.')
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new HttpError(400, 'بروتوكول بوابة النموذج غير مدعوم.')
  if (!local && (url.protocol !== 'https:' || !url.hostname.includes('.') || (url.port && url.port !== '443'))) throw new HttpError(400, 'عنوان بوابة النموذج الخارجية غير مسموح.')
  const allowedHosts = new Set([DEFAULT_EXTERNAL_HOST, ...String(process.env.ZAKI_GATEWAY_ALLOWED_HOSTS || '').split(',').filter(Boolean)])
  if (!local && !allowedHosts.has(url.hostname)) throw new HttpError(400, 'مضيف بوابة النموذج غير موجود في قائمة السماح.')
  return url.origin
}

export function gatewayEnv() {
  const origin = parseBaseUrl(process.env.ZAKI_GATEWAY_URL)
  return { origin, baseUrl: origin ? `${origin}/v1` : '', model: validModel(process.env.ZAKI_GATEWAY_MODEL), key: validKey(process.env.ZAKI_GATEWAY_API_KEY) }
}

export function gatewayStatus() {
  const config = gatewayEnv()
  return {
    configured: Boolean(config.baseUrl && config.model && config.key),
    primary: true,
    provider: 'openai-compatible',
    baseUrl: config.baseUrl,
    model: config.model || '',
    keyConfigured: Boolean(config.key),
    external: true,
  }
}

function ipv4Number(ip) {
  return ip.split('.').reduce((value, part) => ((value << 8n) | BigInt(Number(part))) & 0xffffffffn, 0n)
}

function inCidr(ip, cidr) {
  const [range, bitsText] = cidr.split('/')
  const bits = Number(bitsText)
  if (net.isIP(ip) === 4 && net.isIP(range) === 4) {
    const mask = bits === 0 ? 0n : 0xffffffffn << BigInt(32 - bits) & 0xffffffffn
    return (ipv4Number(ip) & mask) === (ipv4Number(range) & mask)
  }
  if (net.isIP(ip) === 6 && net.isIP(range) === 6) {
    const expand = value => {
      const [head, tail = ''] = value.split('::')
      const parts = head ? head.split(':') : []
      const tailParts = tail ? tail.split(':') : []
      const missing = Array(8 - parts.length - tailParts.length).fill('0')
      return BigInt(`0x${[...parts, ...missing, ...tailParts].map(part => part || '0').join('')}`)
    }
    const address = expand(ip)
    const network = expand(range)
    const mask = bits === 0 ? 0n : ((1n << 128n) - 1n) ^ ((1n << BigInt(128 - bits)) - 1n)
    return (address & mask) === (network & mask)
  }
  return true
}

function isPublicIp(ip) {
  const mapped = ip.startsWith('::ffff:') && net.isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip
  const blocked = [
    '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16',
    '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.168.0.0/16', '198.18.0.0/15',
    '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4',
    '::/128', '::1/128', 'fc00::/7', 'fe80::/10', 'fec0::/10', 'ff00::/8', '2001:db8::/32',
  ]
  return !blocked.some(cidr => inCidr(mapped, cidr))
}

async function gatewayRequest(path, { method = 'GET', body, timeout = 30_000 } = {}) {
  const config = gatewayEnv()
  if (!config.baseUrl || !config.model || !config.key) throw new HttpError(400, 'أكمل متغيرات بوابة النموذج في Coolify أولًا.')
  const url = new URL(`${config.baseUrl}${path}`)
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true }).catch(() => { throw new HttpError(502, 'تعذر حل اسم بوابة النموذج.') })
  if (local && !addresses.every(item => ['127.0.0.1', '::1'].includes(item.address))) throw new HttpError(400, 'عنوان البوابة المحلية لا يشير إلى الجهاز المحلي.')
  if (!local && (!addresses.length || addresses.some(item => !isPublicIp(item.address)))) throw new HttpError(400, 'عنوان بوابة النموذج يشير إلى شبكة غير عامة.')
  const selected = addresses[0]
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body))
  const transport = url.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn, value) => { if (!settled) { settled = true; fn(value) } }
    const request = transport.request(url, {
      method,
      servername: url.hostname,
      lookup: (_hostname, _options, callback) => callback(null, selected.address, selected.family),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.key}`,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}),
      },
    }, response => {
      const chunks = []
      let size = 0
      response.on('data', chunk => {
        size += chunk.length
        if (size > MAX_RESPONSE_BYTES) {
          request.destroy()
          finish(reject, new HttpError(502, 'استجابة بوابة النموذج أكبر من الحد المسموح.'))
          return
        }
        chunks.push(chunk)
      })
      response.on('end', () => {
        if (settled) return
        const status = response.statusCode || 500
        if (status < 200 || status >= 300) {
          const message = status === 401 || status === 403 ? 'رفضت بوابة النموذج مفتاح الوصول أو الصلاحية.' : status === 429 ? 'بوابة النموذج تجاوزت حد الطلبات. حاول لاحقًا.' : status >= 300 && status < 400 ? 'بوابة النموذج طلبت تحويلًا غير مسموح.' : 'تعذر الاتصال ببوابة النموذج.'
          finish(reject, new HttpError(status === 429 ? 429 : 502, message))
          return
        }
        try { finish(resolve, JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { finish(reject, new HttpError(502, 'ردت بوابة النموذج بصيغة غير صالحة.')) }
      })
      response.on('error', error => finish(reject, error))
    })
    request.setTimeout(timeout, () => {
      request.destroy()
      finish(reject, new HttpError(504, 'انتهت مهلة الاتصال ببوابة النموذج.'))
    })
    request.on('error', error => {
      if (error instanceof HttpError) finish(reject, error)
      else finish(reject, new HttpError(502, 'تعذر الوصول إلى بوابة النموذج.'))
    })
    if (payload) request.write(payload)
    request.end()
  })
}

function sanitizeText(value) {
  return String(value || '').slice(0, 8_000)
    .replace(/sk-[a-zA-Z0-9_-]{12,}/g, '[رمز محذوف]')
    .replace(/(?:access_token|api_key|app_secret|password|cookies?)(\s*[:=]\s*)\S+/gi, '$1[سر محذوف]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g, '[بريد محذوف]')
    .replace(/https?:\/\/\S+/gi, '[رابط محذوف]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[رقم محذوف]')
}

export async function listGatewayModels() {
  const result = await gatewayRequest('/models')
  return Array.isArray(result?.data) ? result.data : []
}

export async function chatGateway(messages, { maxTokens = 700, tools } = {}) {
  const config = gatewayEnv()
  if (!Array.isArray(messages) || !messages.length) throw new HttpError(400, 'أدخل رسالة للمساعد.')
  const clean = messages.slice(-12).filter(item => ['system', 'user', 'assistant'].includes(item?.role)).map(item => ({ role: item.role, content: sanitizeText(item.content) }))
  if (!clean.length || clean.every(item => !item.content.trim())) throw new HttpError(400, 'أدخل رسالة صالحة للمساعد.')
  const body = { model: config.model, stream: false, max_tokens: Math.min(Math.max(Number(maxTokens) || 700, 16), 2_000), temperature: 0.3, messages: clean, ...(tools ? { tools } : {}) }
  const execute = async () => {
    let result
    try { result = await gatewayRequest('/chat/completions', { method: 'POST', body, timeout: 180_000 }) }
    catch (error) {
      if (tools && error?.status === 400) result = await gatewayRequest('/chat/completions', { method: 'POST', body: { ...body, tools: undefined }, timeout: 180_000 })
      else throw error
    }
    const message = result?.choices?.[0]?.message
    if (!message?.content && !message?.tool_calls?.length) throw new HttpError(502, 'لم تُرجع بوابة النموذج إجابة قابلة للاستخدام.')
    return { reply: message.content || '', toolCalls: message.tool_calls || [], model: result.model || config.model, usage: result.usage || null }
  }
  const pending = chatQueue.then(execute, execute)
  chatQueue = pending.catch(() => {})
  return pending
}

export async function testGateway() {
  const models = await listGatewayModels()
  const config = gatewayEnv()
  if (models.length && !models.some(item => item?.id === config.model)) throw new HttpError(502, 'النموذج المحدد غير موجود في قائمة البوابة.')
  const answer = await chatGateway([{ role: 'user', content: 'أجب بكلمة «تم» فقط، من دون أي نص إضافي.' }], { maxTokens: 24 })
  return { ok: true, ...gatewayStatus(), modelsCount: models.length, reply: answer.reply, usage: answer.usage }
}
