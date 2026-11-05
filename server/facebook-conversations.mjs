import crypto from 'node:crypto'
import { graphRequest, HttpError } from './facebook.mjs'
import { getAccountPage, getSetting, getSocialAccount, recordFacebookEvent } from './store.mjs'
import { decrypt } from './security.mjs'

function pageCredential(accountId, pageId, userId) {
  const account = getSocialAccount(accountId, userId)
  if (!account) throw new HttpError(404, 'الحساب غير موجود.')
  const page = getAccountPage(accountId, pageId)
  if (!page) throw new HttpError(404, 'الصفحة غير مرتبطة بهذا الحساب. أعد جلب الصفحات أولًا.')
  const accessToken = decrypt(page.token_encrypted)
  if (!accessToken) throw new HttpError(400, 'لا يوجد رمز وصول لهذه الصفحة. أعد ربط الحساب أو جلب الصفحات.')
  return { page, accessToken }
}

export async function listPageConversations(accountId, pageId, userId, { limit = 25 } = {}) {
  const { page, accessToken } = pageCredential(accountId, pageId, userId)
  const fields = 'id,updated_time,participants,snippet,unread_count,can_reply'
  const result = await graphRequest(`${pageId}/conversations?fields=${fields}&limit=${Math.min(Math.max(Number(limit) || 25, 1), 50)}`, accessToken)
  return {
    page: { id: page.provider_page_id, name: page.name },
    conversations: (result?.data || []).map(item => ({
      id: item.id,
      updatedTime: item.updated_time,
      snippet: item.snippet || '',
      unreadCount: item.unread_count || 0,
      canReply: item.can_reply !== false,
      participants: (item.participants?.data || []).map(person => ({ id: person.id, name: person.name || 'مستخدم فيسبوك' })),
    })),
  }
}

export async function listConversationMessages(accountId, pageId, conversationId, userId, { limit = 50 } = {}) {
  const { accessToken } = pageCredential(accountId, pageId, userId)
  if (!/^[\w.-]+$/.test(conversationId)) throw new HttpError(400, 'معرف المحادثة غير صالح.')
  const fields = 'id,created_time,from,to,message,attachments'
  const result = await graphRequest(`${conversationId}/messages?fields=${fields}&limit=${Math.min(Math.max(Number(limit) || 50, 1), 100)}`, accessToken)
  return (result?.data || []).map(item => ({
    id: item.id,
    createdTime: item.created_time,
    from: { id: item.from?.id || '', name: item.from?.name || 'مستخدم فيسبوك' },
    to: (item.to?.data || []).map(person => ({ id: person.id, name: person.name })),
    body: item.message || '',
    attachments: (item.attachments?.data || []).map(attachment => ({ id: attachment.id, mimeType: attachment.mime_type, name: attachment.name, url: attachment.image_data?.url || attachment.video_data?.url || attachment.file_url || null })),
  }))
}

export async function sendPageMessage(accountId, pageId, userId, { recipientId, text }) {
  const { accessToken } = pageCredential(accountId, pageId, userId)
  if (!/^\d{1,100}$/.test(String(recipientId || ''))) throw new HttpError(400, 'معرف المستلم غير صالح.')
  const body = String(text || '').trim()
  if (!body || body.length > 4_000) throw new HttpError(400, 'الرسالة يجب أن تكون بين 1 و4000 حرف.')
  const payload = new URLSearchParams({
    recipient: JSON.stringify({ id: String(recipientId) }),
    message: JSON.stringify({ text: body }),
    messaging_type: 'RESPONSE',
  })
  const result = await graphRequest(`${pageId}/messages`, accessToken, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  if (!result?.message_id) throw new HttpError(502, 'لم تُرجع Meta معرفًا للرسالة المرسلة.')
  return { ok: true, recipientId: result.recipient_id || String(recipientId), messageId: result.message_id }
}

export function verifyFacebookWebhook(query) {
  const expected = process.env.FACEBOOK_VERIFY_TOKEN || getSetting('facebook_verify_token')
  if (!expected) throw new HttpError(503, 'لم يتم ضبط FACEBOOK_VERIFY_TOKEN بعد.')
  if (query['hub.mode'] !== 'subscribe' || query['hub.verify_token'] !== expected || !query['hub.challenge']) throw new HttpError(403, 'فشل التحقق من Webhook.')
  return query['hub.challenge']
}

export function handleFacebookWebhook({ payload, rawBody, signature }) {
  const appSecret = getSetting('facebook_app_secret')
  if (!appSecret) throw new HttpError(503, 'أكمل إعدادات تطبيق Meta قبل استقبال Webhook.')
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
  const suppliedBuffer = Buffer.from(String(signature || ''))
  const expectedBuffer = Buffer.from(expected)
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) throw new HttpError(403, 'توقيع Webhook غير صالح.')
  let accepted = 0
  for (const entry of payload?.entry || []) {
    for (const event of entry.messaging || []) {
      const eventType = event.message ? 'message' : event.delivery ? 'delivery' : event.read ? 'read' : event.postback ? 'postback' : 'other'
      const eventId = `${entry.id}:${event.sender?.id || ''}:${event.timestamp || ''}:${event.message?.mid || event.delivery?.mids?.[0] || event.postback?.mid || ''}`
      if (recordFacebookEvent({ eventId, providerPageId: String(entry.id), eventType, payload: event })) accepted++
    }
  }
  return { ok: true, accepted }
}
