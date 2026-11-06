import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Activity, ArrowLeft, ArrowUpLeft, Check, CheckCircle2, MessageSquare, Play, Sparkles, Waypoints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppData } from '@/context/AppDataContext'
import { formatDate } from '@/lib/demo'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const { data, user } = useAppData()
  const navigate = useNavigate()
  const [guideOpen, setGuideOpen] = useState(false)
  const realAccounts = data.accounts.filter(account => account.real && account.status === 'active')
  const activeCampaigns = data.campaigns.filter(campaign => ['active', 'scheduled', 'paused'].includes(campaign.status))

  const next = useMemo(() => {
    if (!realAccounts.length) return { title: 'اربط أول حساب فيسبوك', detail: 'ابدأ بالحساب، ثم اختر الصفحة التي تريد إدارتها.', path: '/accounts?new=1', action: 'ربط حساب' }
    if (!data.conversations.length) return { title: 'افتح المحادثات', detail: 'انتقل إلى صندوق الوارد لمراجعة العملاء وتجهيز الردود.', path: '/inbox', action: 'فتح المحادثات' }
    if (!activeCampaigns.length) return { title: 'جهّز أول حملة', detail: 'اختر الجمهور والمحتوى والموعد، ثم راجع كل شيء قبل الحفظ.', path: '/campaigns?new=1', action: 'إنشاء حملة' }
    return { title: 'راجع عملك اليوم', detail: 'تابع المحادثات والحملات النشطة، أو اسأل وكيل مدار عن الخطوة التالية.', path: '/campaigns', action: 'عرض الحملات' }
  }, [realAccounts.length, data.conversations.length, activeCampaigns.length])

  const steps = [
    { index: 1, title: 'اربط الحساب', detail: realAccounts.length ? `${realAccounts.length} حساب حقيقي متصل` : 'لم يبدأ بعد', path: '/accounts', done: realAccounts.length > 0 },
    { index: 2, title: 'اختر الصفحة', detail: realAccounts.length ? 'الصفحات متاحة من الحساب' : 'بعد ربط الحساب', path: '/accounts', done: realAccounts.length > 0 },
    { index: 3, title: 'راجع المحادثات', detail: `${data.conversations.length} محادثة في مساحة العمل`, path: '/inbox', done: realAccounts.length > 0 && data.conversations.length > 0 },
    { index: 4, title: 'جهّز الحملة', detail: activeCampaigns.length ? `${activeCampaigns.length} حملة قيد العمل` : 'راجع ثم احفظ', path: '/campaigns', done: realAccounts.length > 0 && activeCampaigns.length > 0 },
  ]

  return (
    <div className="space-y-6">
      <section className="cinematic-hero relative isolate overflow-hidden rounded-[28px] bg-[#102f2b] text-white shadow-[0_24px_70px_-32px_rgba(16,47,43,0.75)]">
        <picture><source media="(max-width: 640px)" srcSet="/assets/generated/08-mobile-hero.webp" /><img src="/assets/generated/01-madar-hero.webp" alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-60" /></picture>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(9,34,31,0.98)_8%,rgba(16,47,43,0.87)_46%,rgba(16,47,43,0.30)_100%)]" />
        <div className="islamic-overlay absolute inset-0 -z-10 opacity-25" />
        <div className="relative grid min-h-[460px] gap-8 p-6 md:p-10 xl:grid-cols-[1.25fr_0.75fr] xl:items-end">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3"><span className="islamic-mark flex size-12 items-center justify-center bg-emerald-400 text-[#102f2b]"><Waypoints className="size-6" /></span><div><p className="text-sm font-semibold text-emerald-200">مدار · مساحة فريقك</p><p className="mt-1 text-xs text-emerald-100/65">عربي، واضح، وعلى خادمك</p></div></div>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.25] tracking-tight md:text-6xl md:leading-[1.18]">من الرسالة…<br /><span className="text-emerald-300">إلى النتيجة.</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-emerald-50/80 md:text-lg">اجمع حساباتك وصفحاتك ومحادثاتك في مسار واحد بسيط. كل خطوة تقود للتي بعدها، من دون قوائم مزدحمة أو إجراءات مخفية.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button className="h-12 bg-emerald-400 px-5 font-semibold text-[#102f2b] hover:bg-emerald-300" onClick={() => navigate(next.path)}>{next.action}<ArrowLeft /></Button>
              <Button variant="outline" className="h-12 border-white/25 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white" onClick={() => setGuideOpen(true)}><Play />كيف يعمل مدار؟</Button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-[#0c2925]/85 p-5 backdrop-blur-md md:p-6">
            <p className="text-xs font-medium text-emerald-300">المهمة التالية</p>
            <h2 className="mt-3 text-2xl font-bold leading-9">{next.title}</h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50/70">{next.detail}</p>
            <button type="button" onClick={() => navigate(next.path)} className="mt-5 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">انتقل مباشرة<ArrowUpLeft className="size-4" /></button>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('madar:assistant'))} className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl px-4 text-sm text-emerald-100/70 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><span className="flex items-center gap-2"><Sparkles className="size-4" />أريد مساعدة في هذه الخطوة</span></button>
          </div>
        </div>
        <span className="absolute bottom-3 left-4 rounded bg-black/20 px-2 py-1 text-[10px] text-white/55">أصول بصرية مولدة خصيصًا لمدار</span>
      </section>

      <section aria-labelledby="workflow-title">
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 id="workflow-title" className="text-xl font-bold text-ink">مسار العمل</h2><p className="mt-1 text-sm text-slate-500">أربع محطات. لا تحتاج أكثر من ذلك للبدء.</p></div><span className="hidden text-xs text-slate-400 md:inline">مرحبًا {user?.name?.split(' ')[0] || 'بك'}</span></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(step => <button key={step.index} type="button" onClick={() => navigate(step.path)} className={cn('group flex min-h-28 cursor-pointer items-center gap-4 rounded-2xl border bg-white p-4 text-right transition-all hover:-translate-y-0.5 hover:border-emerald-600/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', step.done ? 'border-emerald-700/20' : 'border-slate-200')}>
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold', step.done ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500')}>{step.done ? <Check className="size-5" /> : step.index}</span>
            <span className="min-w-0 flex-1"><span className="block font-semibold text-ink">{step.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{step.detail}</span></span><ArrowUpLeft className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-700" />
          </button>)}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-emerald-900/10 shadow-none">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="size-5 text-emerald-700" />آخر النشاطات</CardTitle><CardDescription>سجل حقيقي لما يتغير داخل مساحة العمل</CardDescription></CardHeader>
          <CardContent><div className="space-y-0">{data.activities.slice(0, 5).map(activity => <div key={activity.id} className="flex gap-4 border-b py-4 last:border-0 last:pb-0 first:pt-0"><div className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-600" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{activity.action}</p><p className="mt-1 text-sm leading-6 text-slate-500">{activity.detail}</p></div><div className="shrink-0 text-left text-xs text-slate-400"><p>{activity.actor}</p><p className="mt-1">{formatDate(activity.time, true)}</p></div></div>)}</div></CardContent>
        </Card>
        <Card className="border-emerald-900/10 bg-[#e7f0eb] shadow-none">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="size-5 text-emerald-700" />اختصار مفيد</CardTitle><CardDescription>من دون فتح صفحة جديدة</CardDescription></CardHeader>
          <CardContent className="space-y-4"><p className="text-sm leading-7 text-slate-600">من أي صفحة اضغط <strong className="text-emerald-900">وكيل مدار</strong> أعلى الشاشة. اطلب صياغة رد، تفسير الخطوة، أو مراجعة محتوى قبل استخدامه.</p><Button variant="outline" className="h-11 w-full border-emerald-700/25 bg-white text-emerald-900 hover:bg-emerald-50" onClick={() => window.dispatchEvent(new CustomEvent('madar:assistant'))}><Sparkles />افتح وكيل مدار</Button><div className="flex items-start gap-2 text-xs leading-6 text-slate-500"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-700" />المساعد يقترح ويراجع، والقرار والإرسال الفعلي يبقى بيدك.</div></CardContent>
        </Card>
      </div>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="sm:max-w-xl" dir="rtl">
          <DialogHeader><DialogTitle>كيف يعمل مدار؟</DialogTitle><DialogDescription>ثلاث خطوات مترابطة تبدأ بالحساب وتنتهي بعمل واضح.</DialogDescription></DialogHeader>
          <div className="space-y-3">{[
            ['١', 'اربط واختر', 'اربط حسابك ثم اعرض الصفحات المرتبطة به من صفحة الحسابات.'],
            ['٢', 'افهم العميل', 'افتح المحادثة وراجع الرسائل، واستخدم وكيل مدار لصياغة رد مناسب.'],
            ['٣', 'راجع ثم نفّذ', 'حدد الجمهور والمحتوى والموعد. راجع الحملة قبل حفظها، ولا يحدث إرسال دون مسار واضح.'],
          ].map(([number, title, text]) => <div key={number} className="flex gap-3 rounded-xl border border-emerald-900/10 bg-[#f4f8f5] p-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">{number}</span><div><h3 className="font-semibold text-ink">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div></div>)}
          </div>
          <Button className="h-11 w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => { setGuideOpen(false); navigate(next.path) }}>{next.action}<ArrowLeft /></Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
