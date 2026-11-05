import { useMemo, useState, type FormEvent } from 'react'
import { Search, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAppData } from '@/context/AppDataContext'
import { uid } from '@/lib/demo'
import { cn } from '@/lib/utils'
import { DemoNotice, EmptyState, PlatformIcon } from '@/components/shared'

export default function Inbox() {
  const { data, setData, addActivity } = useAppData()
  const [selectedId, setSelectedId] = useState(data.conversations[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const selected = data.conversations.find(conversation => conversation.id === selectedId) ?? data.conversations[0]
  const conversations = useMemo(() => data.conversations.filter(conversation => `${conversation.name} ${conversation.handle}`.toLowerCase().includes(query.toLowerCase())), [data.conversations, query])

  const selectConversation = (id: string) => {
    setSelectedId(id)
    setData(current => ({ ...current, conversations: current.conversations.map(conversation => conversation.id === id ? { ...conversation, unread: 0 } : conversation) }))
  }
  const saveDraft = (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !draft.trim()) return
    const body = draft.trim()
    setData(current => ({ ...current, conversations: current.conversations.map(conversation => conversation.id === selected.id ? { ...conversation, messages: [...conversation.messages, { id: uid('msg'), body, direction: 'outgoing', time: 'الآن', draft: true }] } : conversation) }))
    addActivity('حفظ مسودة رد', `محادثة مع ${selected.name}`)
    setDraft(''); toast.success('تم حفظ الرد كمسودة فقط', { description: 'لم يتم إرسال أي رسالة خارجية.' })
  }

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-bold tracking-tight text-ink md:text-[28px]">الرسائل</h1><p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">راجع المحادثات وجهّز ردود الفريق من صندوق وارد موحد.</p></div>
      <DemoNotice>الردود الجديدة تُحفظ كمسودات محلية وتحمل علامة واضحة. لا يتم إرسال أي رسالة للمنصة.</DemoNotice>
      <Card className="overflow-hidden border-slate-200/80 shadow-none"><div className="grid min-h-[650px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b lg:border-b-0 lg:border-l"><div className="border-b p-4"><div className="relative"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث في المحادثات..." className="h-11 pr-10" /></div></div><div className="max-h-72 overflow-y-auto p-2 lg:max-h-none">{conversations.map(conversation => <button key={conversation.id} type="button" onClick={() => selectConversation(conversation.id)} className={cn('flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', selected?.id === conversation.id ? 'bg-emerald-50' : 'hover:bg-slate-50')}><span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><PlatformIcon platform={conversation.platform} />{conversation.online && <span className="absolute bottom-0 left-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" />}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-ink">{conversation.name}</span>{conversation.unread > 0 && <Badge className="size-5 justify-center rounded-full bg-emerald-700 p-0 text-[10px] text-white">{conversation.unread}</Badge>}</span><span className="mt-1 block truncate text-xs text-slate-500">{conversation.messages.at(-1)?.body ?? 'لا توجد رسائل'}</span></span></button>)}</div></div>
        <div className="flex min-w-0 flex-col">{selected ? <><div className="flex min-h-20 items-center gap-3 border-b px-4 py-3"><span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"><PlatformIcon platform={selected.platform} /></span><div><h2 className="font-semibold text-ink">{selected.name}</h2><p className="mt-0.5 text-xs text-slate-500">{selected.handle} · {selected.online ? 'متصل' : 'غير متصل'}</p></div></div><div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 md:p-6">{selected.messages.map(message => <div key={message.id} className={cn('flex', message.direction === 'outgoing' ? 'justify-start' : 'justify-end')}><div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 md:max-w-[70%]', message.direction === 'outgoing' ? 'rounded-br-md bg-emerald-800 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-ink', message.draft && 'border border-dashed border-emerald-300 bg-emerald-50 text-emerald-950')}><p>{message.body}</p><div className={cn('mt-1 flex items-center gap-2 text-[10px]', message.direction === 'outgoing' && !message.draft ? 'text-emerald-100' : 'text-slate-400')}><span>{message.time}</span>{message.draft && <Badge variant="outline" className="border-emerald-300 bg-white px-1.5 py-0 text-[9px] text-emerald-700">مسودة محلية</Badge>}</div></div></div>)}</div><form onSubmit={saveDraft} className="flex gap-2 border-t bg-white p-3 md:p-4"><Input value={draft} onChange={event => setDraft(event.target.value)} placeholder="اكتب مسودة رد..." className="h-12 flex-1" /><Button type="submit" disabled={!draft.trim()} className="h-12 bg-emerald-700 px-4 text-white hover:bg-emerald-800"><Send />حفظ كمسودة</Button></form></> : <div className="flex flex-1 items-center justify-center p-6"><EmptyState title="اختر محادثة" description="اختر محادثة من القائمة لعرض الرسائل وتجهيز رد." /></div>}</div>
      </div></Card>
    </>
  )
}
