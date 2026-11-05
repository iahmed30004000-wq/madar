import { useEffect, useState, type FormEvent } from 'react'
import { Bot, CheckCircle2, Loader2, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAppData } from '@/context/AppDataContext'
import { aiApi, type AiChatMessage, type AiStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

const systemMessage: AiChatMessage = {
  role: 'system',
  content: 'أنت وكيل مدار داخل منصة عربية لإدارة الصفحات والمحادثات والحملات. أجب بالعربية الواضحة وبأقصر خطوات عملية. اربط كل إجابة بالخطوة التالية للمستخدم. لا تقترح إخفاء الأتمتة أو تجاوز سياسات المنصات. لا تنفذ إرسالًا أو نشرًا، واطلب تأكيدًا بشريًا صريحًا قبل أي إجراء حقيقي.',
}

export default function AssistantPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAppData()
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([{ role: 'assistant', content: 'أهلًا، أنا وكيل مدار. أخبرني ما الذي تريد إنجازه وسأدلك على أقصر طريق دون خطوات زائدة.' }])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!open) return
    void aiApi.status().then(setStatus).catch(reason => toast.error(reason instanceof Error ? reason.message : 'تعذر فحص مزود الذكاء.'))
  }, [open])

  const testProvider = async () => {
    setTesting(true)
    try {
      const result = await aiApi.test()
      setStatus(result)
      toast.success('اتصل النموذج بنجاح', { description: `الرد التجريبي: ${result.reply}` })
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'فشل فحص النموذج.') }
    finally { setTesting(false) }
  }

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    if (!status?.configured) { toast.info('أكمل متغيرات مزود الذكاء في Coolify أولًا.'); return }
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setDraft('')
    setBusy(true)
    try {
      const answer = await aiApi.chat([systemMessage, ...next])
      setMessages(current => [...current, { role: 'assistant', content: answer.reply }])
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'تعذر الحصول على إجابة.') }
    finally { setBusy(false) }
  }

  const submit = (event: FormEvent) => { event.preventDefault(); void send(draft) }
  const suggestions = ['ما الخطوة التالية لربط صفحة والوصول لمحادثاتها؟', 'اكتب ردًا عربيًا مهذبًا ومختصرًا لعميل يسأل عن السعر.', 'كيف أراجع حملة قبل إرسالها بأمان؟']

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full flex-col border-l border-emerald-900/15 bg-[#f3f7f4] p-0 sm:max-w-lg" aria-describedby="assistant-description">
        <SheetHeader className="border-b border-emerald-900/10 bg-[#102f2b] px-5 py-5 text-right">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-emerald-400 text-[#102f2b]"><Bot /></span><div><SheetTitle className="text-xl text-white">وكيل مدار</SheetTitle><SheetDescription id="assistant-description" className="mt-1 text-emerald-100/75">مساعدك للخطوة التالية، وللردود والمحتوى.</SheetDescription></div></div>
            <Badge variant="outline" className={cn('border-emerald-300/25 bg-white/5 text-emerald-100', status?.configured && 'border-emerald-300/50')}><span className={cn('ml-1 size-1.5 rounded-full bg-amber-400', status?.configured && 'bg-emerald-400')} />{status?.configured ? 'المزود الرئيسي' : 'غير مكتمل'}</Badge>
          </div>
        </SheetHeader>
        <div className="border-b border-emerald-900/10 bg-white px-5 py-3">
          <div className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-slate-600"><ShieldCheck className="size-4 text-emerald-700" />{status?.model || 'OpenAI-compatible'} · خصوصية خارجية</span>{user?.role === 'admin' && <Button variant="ghost" size="sm" className="h-8 text-emerald-800" disabled={testing || !status?.configured} onClick={() => void testProvider()}>{testing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}فحص الاتصال</Button>}</div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {messages.map((message, index) => <div key={index} className={cn('max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-7', message.role === 'user' ? 'mr-auto rounded-bl-md bg-emerald-800 text-white' : 'ml-auto rounded-br-md border border-emerald-900/10 bg-white text-slate-800')}><p className="whitespace-pre-wrap">{message.content}</p></div>)}
          {busy && <div className="ml-auto flex w-fit items-center gap-2 rounded-2xl border border-emerald-900/10 bg-white px-4 py-3 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />وكيل مدار يكتب...</div>}
          {!messages.some(message => message.role === 'user') && <div className="space-y-2 pt-2"><p className="flex items-center gap-2 text-xs font-medium text-slate-500"><Sparkles className="size-4 text-emerald-700" />ابدأ بأحد هذه الاقتراحات</p>{suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="min-h-11 w-full cursor-pointer rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-right text-xs leading-6 text-slate-700 transition-colors hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">{suggestion}</button>)}</div>}
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-emerald-900/10 bg-white p-4"><Input value={draft} onChange={event => setDraft(event.target.value)} placeholder="اكتب مهمتك أو سؤالك..." aria-label="رسالة إلى وكيل مدار" className="h-12 flex-1" /><Button type="submit" className="h-12 bg-emerald-700 px-4 text-white hover:bg-emerald-800" disabled={!draft.trim() || busy} aria-label="إرسال الرسالة"><Send /></Button></form>
      </SheetContent>
    </Sheet>
  )
}
