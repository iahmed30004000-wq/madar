import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, Paperclip, RefreshCw, Search, Send } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppData } from '@/context/AppDataContext'
import { facebookApi, facebookConversationApi, type FacebookConversation, type FacebookMessage } from '@/lib/api'
import { nowIso, uid } from '@/lib/demo'
import { cn } from '@/lib/utils'
import { DemoNotice, EmptyState, PageHeader, PlatformIcon } from '@/components/shared'

export default function Inbox() {
  const { data, setData, addActivity } = useAppData()
  const realAccounts = data.accounts.filter(account => account.real)
  const [mode, setMode] = useState<'real' | 'demo'>(realAccounts.length ? 'real' : 'demo')
  const [selectedId, setSelectedId] = useState(data.conversations[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [accountId, setAccountId] = useState(realAccounts[0]?.id ?? '')
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([])
  const [pageId, setPageId] = useState('')
  const [realConversations, setRealConversations] = useState<FacebookConversation[]>([])
  const [realId, setRealId] = useState('')
  const [realMessages, setRealMessages] = useState<FacebookMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const selected = data.conversations.find(conversation => conversation.id === selectedId) ?? data.conversations[0]
  const conversations = useMemo(() => data.conversations.filter(conversation => `${conversation.name} ${conversation.handle}`.toLowerCase().includes(query.toLowerCase())), [data.conversations, query])
  const currentPage = pages.find(page => page.id === pageId)
  const selectedReal = realConversations.find(conversation => conversation.id === realId) ?? realConversations[0]
  const recipient = selectedReal?.participants.find(person => person.id !== pageId) ?? selectedReal?.participants[0]
  const filteredReal = realConversations.filter(conversation => `${conversation.snippet} ${conversation.participants.map(person => person.name).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const firstRealId = realAccounts[0]?.id ?? ''

  useEffect(() => {
    if (firstRealId) {
      setMode(current => current === 'demo' ? 'real' : current)
      setAccountId(current => current || firstRealId)
    }
  }, [firstRealId])

  useEffect(() => {
    if (mode !== 'real' || !accountId) { setPages([]); setPageId(''); return }
    setError(''); setPages([]); setPageId(''); setRealConversations([]); setRealId(''); setRealMessages([])
    void facebookApi.pages(accountId).then(result => {
      setPages(result.pages)
      if (result.pages[0]) setPageId(result.pages[0].id)
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'تعذر جلب الصفحات.'))
  }, [accountId, mode])

  useEffect(() => {
    if (mode !== 'real' || !accountId || !pageId) return
    setLoading(true); setError(''); setRealConversations([]); setRealId(''); setRealMessages([])
    void facebookConversationApi.list(accountId, pageId).then(result => {
      setRealConversations(result.conversations)
      if (result.conversations[0]) setRealId(result.conversations[0].id)
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'تعذر جلب المحادثات.')).finally(() => setLoading(false))
  }, [accountId, pageId, mode])

  useEffect(() => {
    if (mode !== 'real' || !accountId || !pageId || !realId) { setRealMessages([]); return }
    setLoading(true); setError('')
    void facebookConversationApi.messages(accountId, pageId, realId).then(result => setRealMessages(result.messages)).catch(reason => setError(reason instanceof Error ? reason.message : 'تعذر جلب الرسائل.')).finally(() => setLoading(false))
    setRealConversations(current => current.map(item => item.id === realId ? { ...item, unreadCount: 0 } : item))
  }, [accountId, pageId, realId, mode])

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

  const sendReal = async () => {
    if (!recipient || !selectedReal || !draft.trim()) return
    setSending(true)
    try {
      const result = await facebookConversationApi.send(accountId, pageId, { recipientId: recipient.id, text: draft.trim() })
      const outgoing: FacebookMessage = { id: result.messageId, createdTime: nowIso(), from: { id: pageId, name: currentPage?.name || 'الصفحة' }, to: [{ id: recipient.id, name: recipient.name }], body: draft.trim(), attachments: [] }
      setRealMessages(current => [...current, outgoing])
      addActivity('إرسال رسالة فيسبوك', `إلى ${recipient.name} عبر ${currentPage?.name || 'الصفحة'}`)
      setDraft(''); setConfirmOpen(false)
      toast.success('أرسلت Meta الرسالة بنجاح')
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'تعذر إرسال الرسالة.') }
    finally { setSending(false) }
  }

  const submitReal = (event: FormEvent) => {
    event.preventDefault()
    if (!recipient || !draft.trim() || !selectedReal?.canReply) return
    if (!/^\d+$/.test(recipient.id)) { toast.error('لا يوجد معرف مستلم رقمي صالح لهذه المحادثة.'); return }
    setConfirmOpen(true)
  }

  return (
    <>
      <PageHeader title="المحادثات" description="اختر الصفحة، راجع العميل ورسائله، ثم قرر الرد من نفس المكان." actions={mode === 'real' && pageId ? <Button variant="outline" className="h-11" disabled={loading} onClick={() => { setPageId(current => { const value = current; setRealConversations([]); setRealId(''); setRealMessages([]); return value; }); void facebookConversationApi.list(accountId, pageId).then(result => { setRealConversations(result.conversations); if (result.conversations[0]) setRealId(result.conversations[0].id) }).catch(reason => setError(reason instanceof Error ? reason.message : 'تعذر التحديث.')) }}><RefreshCw className={loading ? 'animate-spin' : ''} />تحديث</Button> : undefined} />
      <div className="mb-5 grid max-w-md grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setMode('real')} className={cn('min-h-11 cursor-pointer rounded-lg text-sm font-medium', mode === 'real' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500')}>حسابات حقيقية</button><button type="button" onClick={() => setMode('demo')} className={cn('min-h-11 cursor-pointer rounded-lg text-sm font-medium', mode === 'demo' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500')}>بيانات تجريبية</button></div>
      {mode === 'demo' ? <DemoNotice>الردود الجديدة هنا مسودات محلية فقط، ولا يتم إرسال أي رسالة للمنصة.</DemoNotice> : <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">المحادثات والرسائل تُجلب من Meta عند توفر الصلاحيات. <strong>أي رد حقيقي يحتاج تأكيدك الصريح قبل الإرسال.</strong></div>}

      {mode === 'real' && <div className="mb-5 grid gap-4 rounded-2xl border border-emerald-900/10 bg-white p-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="inbox-account">الحساب</Label><select id="inbox-account" value={accountId} onChange={event => setAccountId(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="">اختر حسابًا حقيقيًا</option>{realAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="inbox-page">الصفحة</Label><select id="inbox-page" value={pageId} onChange={event => setPageId(event.target.value)} disabled={!pages.length} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-60"><option value="">{pages.length ? 'اختر الصفحة' : 'لا توجد صفحات بعد'}</option>{pages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}</select></div>
      </div>}
      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <Card className="overflow-hidden border-emerald-900/10 shadow-none"><div className="grid min-h-[650px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b lg:border-b-0 lg:border-l"><div className="border-b p-4"><div className="relative"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث في المحادثات..." className="h-11 pr-10" /></div></div><div className="max-h-72 overflow-y-auto p-2 lg:max-h-none">
          {mode === 'demo' ? conversations.map(conversation => <button key={conversation.id} type="button" onClick={() => selectConversation(conversation.id)} className={cn('flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', selected?.id === conversation.id ? 'bg-emerald-50' : 'hover:bg-slate-50')}><span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><PlatformIcon platform={conversation.platform} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-ink">{conversation.name}</span>{conversation.unread > 0 && <Badge className="size-5 justify-center rounded-full bg-emerald-700 p-0 text-[10px] text-white">{conversation.unread}</Badge>}</span><span className="mt-1 block truncate text-xs text-slate-500">{conversation.messages.at(-1)?.body ?? 'لا توجد رسائل'}</span></span></button>) : filteredReal.map(conversation => {
            const person = conversation.participants.find(item => item.id !== pageId) ?? conversation.participants[0]
            return <button key={conversation.id} type="button" onClick={() => setRealId(conversation.id)} className={cn('flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', selectedReal?.id === conversation.id ? 'bg-emerald-50' : 'hover:bg-slate-50')}><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><PlatformIcon platform="facebook" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-ink">{person?.name || 'محادثة'}</span>{conversation.unreadCount > 0 && <Badge className="size-5 justify-center rounded-full bg-emerald-700 p-0 text-[10px] text-white">{conversation.unreadCount}</Badge>}</span><span className="mt-1 block truncate text-xs text-slate-500">{conversation.snippet || 'لا توجد رسائل'}</span></span></button>
          })}
          {mode === 'real' && !loading && !filteredReal.length && <p className="p-6 text-center text-sm text-slate-500">{pageId ? 'لا توجد محادثات مطابقة لهذه الصفحة.' : 'اختر حسابًا وصفحة لعرض المحادثات.'}</p>}
          {mode === 'real' && loading && <div className="flex justify-center p-6 text-slate-500"><Loader2 className="size-5 animate-spin" /></div>}
        </div></div>

        <div className="flex min-w-0 flex-col">
          {mode === 'demo' ? (selected ? <><ConversationHeader name={selected.name} subtitle={selected.handle} /><div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 md:p-6">{selected.messages.map(message => <MessageBubble key={message.id} body={message.body} outgoing={message.direction === 'outgoing'} meta={message.time} draft={message.draft} />)}</div><form onSubmit={saveDraft} className="flex gap-2 border-t bg-white p-3 md:p-4"><Input value={draft} onChange={event => setDraft(event.target.value)} placeholder="اكتب مسودة رد..." className="h-12 flex-1" /><Button type="submit" disabled={!draft.trim()} className="h-12 bg-emerald-700 px-4 text-white hover:bg-emerald-800"><Send />حفظ كمسودة</Button></form></> : <EmptyConversation />) : (
            selectedReal ? <><ConversationHeader name={recipient?.name || 'محادثة'} subtitle={`${currentPage?.name || 'الصفحة'} · ${selectedReal.canReply ? 'يمكن الرد' : 'لا يمكن الرد'}`} /><div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 md:p-6">{realMessages.map(message => <MessageBubble key={message.id} body={message.body} outgoing={message.from.id === pageId} meta={message.createdTime} attachments={message.attachments.length} />)}{!loading && !realMessages.length && <p className="py-12 text-center text-sm text-slate-500">لا توجد رسائل في هذه المحادثة.</p>}{loading && <div className="flex justify-center py-8 text-slate-500"><Loader2 className="size-6 animate-spin" /></div>}</div><form onSubmit={submitReal} className="flex gap-2 border-t bg-white p-3 md:p-4"><Input value={draft} onChange={event => setDraft(event.target.value)} placeholder={selectedReal.canReply ? `اكتب ردًا إلى ${recipient?.name || 'العميل'}...` : 'لا يمكن الرد على هذه المحادثة'} disabled={!selectedReal.canReply} className="h-12 flex-1" /><Button type="submit" disabled={!draft.trim() || !selectedReal.canReply || sending} className="h-12 bg-emerald-700 px-4 text-white hover:bg-emerald-800">{sending ? <Loader2 className="animate-spin" /> : <Send />}مراجعة وإرسال</Button></form></> : <EmptyConversation />
          )}
        </div>
      </div></Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد إرسال رسالة حقيقية؟</AlertDialogTitle><AlertDialogDescription>سيتم إرسال النص التالي إلى <strong>{recipient?.name}</strong> عبر صفحة <strong>{currentPage?.name}</strong>. لا يمكن التراجع عن الإرسال بعد تنفيذه.</AlertDialogDescription></AlertDialogHeader><div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">{draft}</div><AlertDialogFooter><AlertDialogCancel disabled={sending}>راجع النص</AlertDialogCancel><AlertDialogAction disabled={sending} className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => void sendReal()}>{sending ? <Loader2 className="animate-spin" /> : <Send />}تأكيد الإرسال</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ConversationHeader({ name, subtitle }: { name: string; subtitle: string }) {
  return <div className="flex min-h-20 items-center gap-3 border-b px-4 py-3"><span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"><PlatformIcon platform="facebook" /></span><div><h2 className="font-semibold text-ink">{name}</h2><p className="mt-0.5 text-xs text-slate-500">{subtitle}</p></div></div>
}

function MessageBubble({ body, outgoing, meta, draft, attachments = 0 }: { body: string; outgoing: boolean; meta: string; draft?: boolean; attachments?: number }) {
  return <div className={cn('flex', outgoing ? 'justify-start' : 'justify-end')}><div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 md:max-w-[70%]', outgoing ? 'rounded-br-md bg-emerald-800 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-ink', draft && 'border border-dashed border-emerald-300 bg-emerald-50 text-emerald-950')}><p className="whitespace-pre-wrap">{body}</p>{attachments > 0 && <p className={cn('mt-2 flex items-center gap-1 text-xs', outgoing ? 'text-emerald-100' : 'text-slate-500')}><Paperclip className="size-3.5" />{attachments} مرفق</p>}<div className={cn('mt-1 flex items-center gap-2 text-[10px]', outgoing && !draft ? 'text-emerald-100' : 'text-slate-400')}><span>{meta}</span>{draft && <Badge variant="outline" className="border-emerald-300 bg-white px-1.5 py-0 text-[9px] text-emerald-700">مسودة محلية</Badge>}</div></div></div>
}

function EmptyConversation() {
  return <div className="flex flex-1 items-center justify-center p-6"><EmptyState title="اختر محادثة" description="اختر حسابًا وصفحة ومحادثة لعرض الرسائل وتجهيز الرد." /></div>
}
