import assert from 'node:assert/strict'
import http from 'node:http'
import { chatGateway, gatewayStatus, testGateway } from '../server/gateway.mjs'

const requests = []
const server = http.createServer((req, res) => {
  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8')
    requests.push({ method: req.method, url: req.url, authorization: req.headers.authorization, body: raw })
    res.setHeader('Content-Type', 'application/json')
    if (req.method === 'GET' && req.url === '/v1/models') {
      res.end(JSON.stringify({ data: [{ id: 'auto/best-chat' }] }))
      return
    }
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      const body = JSON.parse(raw)
      res.end(JSON.stringify({
        model: body.model,
        choices: [{ message: { role: 'assistant', content: 'تم' } }],
        usage: { prompt_tokens: 8, completion_tokens: 1 },
      }))
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not_found' }))
  })
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
process.env.NODE_ENV = 'test'
process.env.ZAKI_GATEWAY_URL = `http://127.0.0.1:${address.port}/v1`
process.env.ZAKI_GATEWAY_MODEL = 'auto/best-chat'
process.env.ZAKI_GATEWAY_API_KEY = 'unit-test-secret'

try {
  assert.equal(gatewayStatus().configured, true)
  const tested = await testGateway()
  assert.equal(tested.ok, true)
  assert.equal(tested.modelsCount, 1)
  assert.equal(tested.reply, 'تم')

  await chatGateway([{ role: 'user', content: 'تواصل مع person@example.com عبر https://example.com واستخدم sk-abcdefghijklmno' }])
  const chatRequest = requests.at(-1)
  assert.equal(chatRequest.authorization, 'Bearer unit-test-secret')
  assert.equal(chatRequest.body.includes('person@example.com'), false)
  assert.equal(chatRequest.body.includes('https://example.com'), false)
  assert.equal(chatRequest.body.includes('sk-abcdefghijklmno'), false)
  assert.equal(chatRequest.body.includes('[بريد محذوف]'), true)
  assert.equal(chatRequest.body.includes('[رابط محذوف]'), true)
  assert.equal(chatRequest.body.includes('[رمز محذوف]'), true)

  delete process.env.ZAKI_GATEWAY_API_KEY
  assert.equal(gatewayStatus().configured, false)
  assert.equal(gatewayStatus().keyConfigured, false)
  console.log('Gateway mock verification passed: models, chat, privacy redaction, and secret-free status.')
} finally {
  await new Promise(resolve => server.close(resolve))
}
