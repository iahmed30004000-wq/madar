import type { ReactNode } from 'react'
import { Facebook, Instagram, MessageCircle, Send, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { platformLabels } from '@/lib/demo'
import type { AccountStatus, CampaignStatus, Platform } from '@/types'

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink md:text-[28px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const props = { className: cn('size-4', className), 'aria-hidden': true }
  if (platform === 'facebook') return <Facebook {...props} />
  if (platform === 'instagram') return <Instagram {...props} />
  if (platform === 'telegram') return <Send {...props} />
  return <MessageCircle {...props} />
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <Badge variant="outline" className="gap-1.5 border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600">
      <PlatformIcon platform={platform} />
      {platformLabels[platform]}
    </Badge>
  )
}

const statusStyles: Record<CampaignStatus | AccountStatus, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  scheduled: 'border-sky-200 bg-sky-50 text-sky-700',
  paused: 'border-amber-200 bg-amber-50 text-amber-700',
  completed: 'border-slate-200 bg-slate-100 text-slate-600',
  draft: 'border-slate-200 bg-white text-slate-500',
  attention: 'border-amber-200 bg-amber-50 text-amber-700',
  offline: 'border-rose-200 bg-rose-50 text-rose-700',
}

export function StatusBadge({ status, label }: { status: CampaignStatus | AccountStatus; label: string }) {
  return <Badge variant="outline" className={cn('gap-1.5 px-2.5 py-1 font-medium', statusStyles[status])}><span className="size-1.5 rounded-full bg-current" />{label}</Badge>
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon: ReactNode }) {
  return (
    <Card className="border-slate-200/80 bg-white shadow-none">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-ink">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</div>
      </CardContent>
    </Card>
  )
}

export function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Search className="size-5" /></div>
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {actionLabel && onAction && <Button className="mt-5" onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}

export function DemoNotice({ children = 'هذه بيئة عرض محلية. لن يتم تنفيذ أي إجراء على المنصات الخارجية.' }: { children?: ReactNode }) {
  return <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">{children}</div>
}
