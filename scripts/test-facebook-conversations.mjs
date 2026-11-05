import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.resolve(root, '..', 'analysis', 'facebook-test-data')
fs.rmSync(dataDir, { recursive: true, force: true })
process.env.MADAR_DATA_DIR = dataDir
process.env.FACEBOOK_GRAPH_VERSION = 'v23.0'
process.env.FACEBOOK_VERIFY_TOKEN = 'test-webhook-token'

const sent = []
const server = http.createServer((req, res) => {
  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    sent.push({ method: req.method, url: req.url, body: Buffer.concat(chunks).toString('utf8') })
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/v23.0/page-1/conversations?fields=id,updated_time,participants,snippet,unread_count,can_reply&limit=25') {
      res.end(JSON.stringify({ data: [{ id: 'thread-1', updated_time: '2026-11-06T00:00:00Z', snippet: 'مرحبًا', unread_count: 1, can_reply: true, participants: { data: [{ id: 'user-1', name: 'عميل تجريبي' }, { id: 'page-1', name: 'صفحة الاختبار' }] } }] }))
      return
    }
    if (req.url === '/v23.0/thread-1/messages?fields=id,created_time,from,to,message,attachments&limit=50') {
      res.end(JSON.stringify({ data: [{ id: 'message-1', created_time: '2026-11-06T00:00:00Z', from: { id: 'user-1', name: 'عميل تجريبي' }, to: { data: [{ id: 'page-1', name: 'صفحة الاختبار' }] }, message: 'أحتاج السعر', attachments: { data: [] } }] }))
      return
    }
    if (req.method === 'POST' && req.url === '/v23.0/page-1/messages') {
      res.end(JSON.stringify({ recipient_id: 'user-1', message_id: 'sent-message-1' }))
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not_found' }))
  })
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
process.env.FACEBOOK_GRAPH_BASE = `http://127.0.0.1:${server.address().port}`

try {
  const store = await import('../server/store.mjs')
  const facebook = await import('../server/facebook.mjs')
  const conversations = await import('../server/facebook-conversations.mjs')
  const user = store.createUser({ name: 'اختبار', email: 'test@example.com', passwordHash: 'dummy' })
  const account = store.upsertSocialAccount({ userId: user.id, provider: 'facebook', providerAccountId: 'account-1', name: 'حساب الاختبار', handle: 'facebook.com/account-1', accessToken: 'user-token' })
  store.storeAccountPages(account.id, [{ id: 'page-1', name: 'صفحة الاختبار', access_token: 'page-token', tasks: [] }])

  const list = await conversations.listPageConversations(account.id, 'page-1', user.id)
  assert.equal(list.conversations.length, 1)
  assert.equal(list.conversations[0].participants[0].name, 'عميل تجريبي')

  const messages = await conversations.listConversationMessages(account.id, 'page-1', 'thread-1', user.id)
  assert.equal(messages[0].body, 'أحتاج السعر')

  const result = await conversations.sendPageMessage(account.id, 'page-1', user.id, { recipientId: '123456789', text: 'السعر 20 دينارًا' })
  assert.equal(result.messageId, 'sent-message-1')
  const sendBody = sent.at(-1).body
  assert.equal(sendBody.includes('messaging_type=RESPONSE'), true)
  assert.equal(sendBody.includes('recipient'), true)

  facebook.saveFacebookConfig({ appId: 'test-app', appSecret: 'test-app-secret', publicUrl: 'https://example.com' })
  assert.equal(conversations.verifyFacebookWebhook({ 'hub.mode': 'subscribe', 'hub.verify_token': 'test-webhook-token', 'hub.challenge': '12345' }), '12345')

  const rawBody = JSON.stringify({ entry: [{ id: 'page-1', messaging: [{ sender: { id: 'user-1' }, timestamp: 1, message: { mid: 'mid-1', text: 'مرحبًا' } }] }] })
  const signature = `sha256=${crypto.createHmac('sha256', 'test-app-secret').update(rawBody).digest('hex')}`
  assert.equal(conversations.handleFacebookWebhook({ payload: JSON.parse(rawBody), rawBody, signature }).accepted, 1)
  assert.equal(conversations.handleFacebookWebhook({ payload: JSON.parse(rawBody), rawBody, signature }).accepted, 0)
  assert.throws(() => conversations.handleFacebookWebhook({ payload: JSON.parse(rawBody), rawBody, signature: 'sha256=invalid' }))

  console.log('Facebook conversation verification passed: list, messages, send confirmation payload, signed and idempotent webhook.')
} finally {
  await new Promise(resolve => server.close(resolve))
}
