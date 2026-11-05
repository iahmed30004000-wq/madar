export interface ApiUser { id: string; name: string; email: string; role: string }
export interface AuthStatus { setupRequired: boolean; authenticated: boolean; user: ApiUser | null }
export interface RealSocialAccount {
  id: string
  provider: string
  externalId: string
  name: string
  handle: string
  status: 'active' | 'attention' | 'offline'
  lastSync: string
  real: true
  connectionType: 'official'
  metadata: Record<string, unknown>
}
export interface FacebookConfig {
  configured: boolean
  appId: string
  publicUrl: string
  redirectUri: string
  graphVersion: string
  manualTokenEnabled: boolean
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  let payload: Record<string, unknown> = {}
  try { payload = text ? JSON.parse(text) : {} } catch { payload = { message: text.slice(0, 200) } }
  if (response.status === 401) window.dispatchEvent(new CustomEvent('madar:unauthorized'))
  if (!response.ok) throw new Error(String(payload.message || `HTTP ${response.status}`))
  return payload as T
}

export const authApi = {
  status: () => api<AuthStatus>('/auth/status'),
  setup: (value: { name: string; email: string; password: string }) => api<{ user: ApiUser }>('/auth/setup', { method: 'POST', body: JSON.stringify(value) }),
  login: (value: { email: string; password: string }) => api<{ user: ApiUser }>('/auth/login', { method: 'POST', body: JSON.stringify(value) }),
  logout: () => api<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
}

export const workspaceApi = {
  bootstrap: () => api<{ workspace: unknown; facebookAccounts: RealSocialAccount[] }>('/bootstrap'),
  save: (data: unknown) => api<{ ok: boolean; updatedAt: string }>('/workspace', { method: 'PUT', body: JSON.stringify({ data }) }),
}

export const facebookApi = {
  config: () => api<FacebookConfig>('/facebook/config'),
  saveConfig: (value: { appId: string; appSecret: string; publicUrl: string }) => api<FacebookConfig>('/facebook/config', { method: 'POST', body: JSON.stringify(value) }),
  accounts: () => api<{ accounts: RealSocialAccount[] }>('/facebook/accounts'),
  connectToken: (accessToken: string) => api<{ account: RealSocialAccount }>('/facebook/token', { method: 'POST', body: JSON.stringify({ accessToken }) }),
  verify: (id: string) => api<{ account: RealSocialAccount }>(`/facebook/accounts/${id}/verify`, { method: 'POST' }),
  pages: (id: string) => api<{ pages: Array<{ id: string; name: string; tasks: string[] }> }>(`/facebook/accounts/${id}/pages`),
  remove: (id: string) => api<{ ok: boolean }>(`/facebook/accounts/${id}`, { method: 'DELETE' }),
}

export interface FacebookConversation {
  id: string
  updatedTime: string
  snippet: string
  unreadCount: number
  canReply: boolean
  participants: Array<{ id: string; name: string }>
}
export interface FacebookMessage {
  id: string
  createdTime: string
  from: { id: string; name: string }
  to: Array<{ id: string; name: string }>
  body: string
  attachments: Array<{ id: string; mimeType?: string; name?: string; url?: string | null }>
}

export const facebookConversationApi = {
  list: (accountId: string, pageId: string) => api<{ page: { id: string; name: string }; conversations: FacebookConversation[] }>(`/facebook/accounts/${accountId}/pages/${pageId}/conversations`),
  messages: (accountId: string, pageId: string, conversationId: string) => api<{ messages: FacebookMessage[] }>(`/facebook/accounts/${accountId}/pages/${pageId}/conversations/${conversationId}/messages`),
  send: (accountId: string, pageId: string, value: { recipientId: string; text: string }) => api<{ ok: boolean; recipientId: string; messageId: string }>(`/facebook/accounts/${accountId}/pages/${pageId}/messages`, { method: 'POST', body: JSON.stringify(value) }),
}

export interface AiStatus {
  configured: boolean
  primary: boolean
  provider: 'openai-compatible'
  baseUrl: string
  model: string
  keyConfigured: boolean
  external: boolean
}
export interface AiChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export const aiApi = {
  status: () => api<AiStatus>('/ai/status'),
  test: () => api<AiStatus & { ok: boolean; modelsCount: number; reply: string }>('/ai/test', { method: 'POST', body: '{}' }),
  chat: (messages: AiChatMessage[]) => api<{ reply: string; model: string }>('/ai/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
}
