export type Platform = 'facebook' | 'instagram' | 'whatsapp' | 'telegram'
export type AccountStatus = 'active' | 'attention' | 'offline'
export type CampaignStatus = 'active' | 'scheduled' | 'paused' | 'completed' | 'draft'
export type CampaignType = 'messages' | 'publishing' | 'extraction'
export type ContentKind = 'message' | 'post' | 'reply'

export interface SocialAccount {
  id: string
  name: string
  handle: string
  platform: Platform
  status: AccountStatus
  lastSync: string
  campaigns: number
  real?: boolean
  externalId?: string
  connectionType?: 'demo' | 'official'
}

export interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  source: string
  tags: string[]
}

export interface ContactGroup {
  id: string
  name: string
  platform: Platform | 'mixed'
  updatedAt: string
  contacts: Contact[]
}

export interface ContentItem {
  id: string
  title: string
  body: string
  kind: ContentKind
  updatedAt: string
  usage: number
}

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  platform: Platform
  status: CampaignStatus
  accountIds: string[]
  audience: string
  content?: string
  schedule: string
  createdAt: string
  progress: number
  stats: {
    total: number
    success: number
    failed: number
    pending: number
  }
}

export interface AutomationRule {
  id: string
  name: string
  trigger: string
  response: string
  platform: Platform
  enabled: boolean
  matches: number
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'مدير' | 'مشرف' | 'موظف'
  status: 'active' | 'invited'
  lastActive: string
}

export interface ExtractionResult {
  id: string
  name: string
  handle: string
  phone?: string
  email?: string
  source: string
}

export interface ExtractionJob {
  id: string
  name: string
  method: 'ids' | 'keywords'
  query: string
  platform: Platform
  status: 'completed' | 'draft'
  createdAt: string
  results: ExtractionResult[]
}

export interface Message {
  id: string
  body: string
  direction: 'incoming' | 'outgoing'
  time: string
  draft?: boolean
}

export interface Conversation {
  id: string
  name: string
  handle: string
  platform: Platform
  unread: number
  online: boolean
  messages: Message[]
}

export interface Activity {
  id: string
  action: string
  detail: string
  time: string
  actor: string
}

export interface AppSettings {
  sendingDelayMin: number
  sendingDelayMax: number
  dailyLimit: number
  workStart: string
  workEnd: string
  timezone: string
  weekendPause: boolean
}

export interface AppData {
  workspaceName: string
  accounts: SocialAccount[]
  groups: ContactGroup[]
  contents: ContentItem[]
  campaigns: Campaign[]
  rules: AutomationRule[]
  members: TeamMember[]
  jobs: ExtractionJob[]
  conversations: Conversation[]
  activities: Activity[]
  settings: AppSettings
}
