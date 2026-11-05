import type { Platform } from '@/types'

export const platformLabels: Record<Platform, string> = {
  facebook: 'فيسبوك',
  instagram: 'إنستغرام',
  whatsapp: 'واتساب',
  telegram: 'تيليجرام',
}

export const campaignTypeLabels = {
  messages: 'رسائل جماعية',
  publishing: 'نشر مجدول',
  extraction: 'استخراج بيانات',
} as const

export const campaignStatusLabels = {
  active: 'نشطة',
  scheduled: 'مجدولة',
  paused: 'متوقفة',
  completed: 'مكتملة',
  draft: 'مسودة',
} as const

export function uid(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function formatDate(value: string, withTime = false) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ar-JO', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | undefined>>) {
  const escape = (value: string | number | undefined) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const content = '\ufeff' + [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
