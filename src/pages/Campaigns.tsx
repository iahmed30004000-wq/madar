import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, Check, Copy, Download, Megaphone, MoreHorizontal, Pause, Play, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAppData } from '@/context/AppDataContext'
import { campaignStatusLabels, campaignTypeLabels, downloadCsv, formatDate, nowIso, platformLabels, uid } from '@/lib/demo'
import { cn } from '@/lib/utils'
import { DemoNotice, EmptyState, PageHeader, PlatformBadge, StatusBadge } from '@/components/shared'
import type { Campaign, CampaignStatus, CampaignType, Platform } from '@/types'

interface CampaignForm {
  name: string
  type: CampaignType
  platform: Platform
  accountIds: string[]
  audience: string
  content: string
  scheduleMode: 'now' | 'later'
  schedule: string
}
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16)
const initialForm = (): CampaignForm => ({ name: '', type: 'messages', platform: 'facebook', accountIds: [], audience: '', content: '', scheduleMode: 'later', schedule: tomorrow() })

export default function Campaigns() {
  const { data, setData, addActivity } = useAppData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | CampaignStatus>('all')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<CampaignForm>(initialForm)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)

  useEffect(() => { if (searchParams.get('new') === '1') setWizardOpen(true) }, [searchParams])
  const campaigns = useMemo(() => data.campaigns.filter(campaign => (status === 'all' || campaign.status === status) && campaign.name.toLowerCase().includes(query.toLowerCase())), [data.campaigns, query, status])
  const details = data.campaigns.find(campaign => campaign.id === detailsId)
  const platformAccounts = data.accounts.filter(account => account.platform === form.platform)
  const selectedGroup = data.groups.find(group => group.id === form.audience)

  const changeWizard = (open: boolean) => {
    setWizardOpen(open)
    if (!open) { setSearchParams({}); setStep(1); setForm(initialForm()); setError('') }
  }
  const openWizard = () => { setForm(initialForm()); setStep(1); setWizardOpen(true) }
  const toggleAccount = (id: string) => setForm(current => ({ ...current, accountIds: current.accountIds.includes(id) ? current.accountIds.filter(item => item !== id) : [...current.accountIds, id] }))
  const next = () => {
    if (step === 1 && !form.name.trim()) { setError('أدخل اسمًا واضحًا للحملة.'); return }
    if (step === 2 && (!form.accountIds.length || !form.audience)) { setError('اختر حسابًا واحدًا على الأقل ومجموعة الجمهور.'); return }
    if (step === 3 && !form.content) { setError(form.type === 'extraction' ? 'أدخل رابطًا أو كلمات المصدر.' : 'اختر المحتوى المستخدم في الحملة.'); return }
    if (step === 3 && form.scheduleMode === 'later' && !form.schedule) { setError('حدد موعد تشغيل الحملة.'); return }
    setError(''); setStep(current => Math.min(4, current + 1))
  }

  const create = () => {
    const groupContacts = selectedGroup?.contacts.length ?? 0
    const contentTitle = form.type === 'extraction' ? form.content : data.contents.find(item => item.id === form.content)?.title ?? form.content
    const campaign: Campaign = {
      id: uid('cmp'), name: form.name.trim(), type: form.type, platform: form.platform,
      status: form.scheduleMode === 'later' ? 'scheduled' : 'active', accountIds: form.accountIds,
      audience: selectedGroup?.name ?? form.audience, content: contentTitle,
      schedule: form.scheduleMode === 'later' ? new Date(form.schedule).toISOString() : nowIso(), createdAt: nowIso(), progress: 0,
      stats: { total: form.type === 'publishing' ? 1 : groupContacts, success: 0, failed: 0, pending: form.type === 'publishing' ? 1 : groupContacts },
    }
    setData(current => ({
      ...current,
      campaigns: [campaign, ...current.campaigns],
      contents: current.contents.map(item => item.id === form.content ? { ...item, usage: item.usage + 1 } : item),
    }))
    addActivity('إنشاء حملة', `${campaign.name} · ${campaignTypeLabels[campaign.type]}`)
    toast.success('تم حفظ الحملة في بيئة العرض', { description: 'لم يتم إرسال رسائل أو تنفيذ إجراء خارجي.' })
    changeWizard(false)
  }

  const toggle = (campaign: Campaign) => {
    const nextStatus = campaign.status === 'active' ? 'paused' : 'active'
    setData(current => ({ ...current, campaigns: current.campaigns.map(item => item.id === campaign.id ? { ...item, status: nextStatus } : item) }))
    addActivity(nextStatus === 'paused' ? 'إيقاف حملة' : 'استئناف حملة', campaign.name)
  }
  const duplicate = (campaign: Campaign) => {
    const copy = { ...campaign, id: uid('cmp'), name: `${campaign.name} — نسخة`, status: 'draft' as const, createdAt: nowIso(), progress: 0, stats: { ...campaign.stats, success: 0, failed: 0, pending: campaign.stats.total } }
    setData(current => ({ ...current, campaigns: [copy, ...current.campaigns] }))
    toast.success('تم نسخ الحملة كمسودة')
  }
  const exportReport = (campaign: Campaign) => {
    downloadCsv(`${campaign.name}-report.csv`, ['الحملة', 'النوع', 'المنصة', 'الحالة', 'الجمهور', 'الإجمالي', 'الناجح', 'الفاشل', 'المعلق'], [[campaign.name, campaignTypeLabels[campaign.type], platformLabels[campaign.platform], campaignStatusLabels[campaign.status], campaign.audience, campaign.stats.total, campaign.stats.success, campaign.stats.failed, campaign.stats.pending]])
    toast.success('تم تصدير تقرير الحملة')
  }
  const remove = () => {
    if (!deleteId) return
    const campaign = data.campaigns.find(item => item.id === deleteId)
    setData(current => ({ ...current, campaigns: current.campaigns.filter(item => item.id !== deleteId) }))
    if (campaign) addActivity('حذف حملة', campaign.name)
    setDeleteId(null); toast.success('تم حذف الحملة')
  }

  return (
    <>
      <PageHeader title="الحملات" description="أنشئ حملات الرسائل والنشر والاستخراج، وراجع استهدافها وجدولها ونتائجها." actions={<Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={openWizard}><Plus />حملة جديدة</Button>} />
      <DemoNotice>إنشاء الحملة وتغيير حالتها يحفظ التعديل محليًا فقط؛ لا يبدأ عامل تنفيذ ولا يتم أي إرسال خارجي.</DemoNotice>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="relative flex-1 md:max-w-sm"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث باسم الحملة..." className="h-11 bg-white pr-10" /></div><select value={status} onChange={event => setStatus(event.target.value as 'all' | CampaignStatus)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" aria-label="تصفية حسب الحالة"><option value="all">كل الحالات</option>{Object.entries(campaignStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      {campaigns.length ? <Card className="border-slate-200/80 shadow-none"><CardContent className="px-0 pb-0 pt-0"><Table><TableHeader><TableRow><TableHead className="pr-6">الحملة</TableHead><TableHead>المنصة</TableHead><TableHead>الحالة</TableHead><TableHead>التقدم</TableHead><TableHead>الناجح</TableHead><TableHead>الموعد</TableHead><TableHead className="pl-6"><span className="sr-only">إجراءات</span></TableHead></TableRow></TableHeader><TableBody>{campaigns.map(campaign => <TableRow key={campaign.id}>
        <TableCell className="pr-6"><button type="button" onClick={() => setDetailsId(campaign.id)} className="max-w-60 cursor-pointer text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><span className="block truncate font-medium text-ink hover:text-emerald-700">{campaign.name}</span><span className="mt-1 block text-xs text-slate-500">{campaignTypeLabels[campaign.type]} · {campaign.audience}</span></button></TableCell>
        <TableCell><PlatformBadge platform={campaign.platform} /></TableCell><TableCell><StatusBadge status={campaign.status} label={campaignStatusLabels[campaign.status]} /></TableCell>
        <TableCell><div className="flex min-w-24 items-center gap-2"><Progress value={campaign.progress} className="h-1.5" /><span className="text-xs text-slate-500">{campaign.progress}%</span></div></TableCell><TableCell className="font-medium text-ink">{campaign.stats.success}</TableCell><TableCell className="text-xs text-slate-500">{formatDate(campaign.schedule, true)}</TableCell>
        <TableCell className="pl-6"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`إجراءات ${campaign.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer" onSelect={() => setDetailsId(campaign.id)}>عرض التفاصيل</DropdownMenuItem>{campaign.status !== 'completed' && <DropdownMenuItem className="cursor-pointer" onSelect={() => toggle(campaign)}>{campaign.status === 'active' ? <Pause /> : <Play />}{campaign.status === 'active' ? 'إيقاف مؤقت' : 'تنشيط الحملة'}</DropdownMenuItem>}<DropdownMenuItem className="cursor-pointer" onSelect={() => exportReport(campaign)}><Download />تصدير التقرير</DropdownMenuItem><DropdownMenuItem className="cursor-pointer" onSelect={() => duplicate(campaign)}><Copy />نسخ كمسودة</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-rose-600 focus:text-rose-600" onSelect={() => setDeleteId(campaign.id)}><Trash2 />حذف</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
      </TableRow>)}</TableBody></Table></CardContent></Card> : <EmptyState title="لا توجد حملات مطابقة" description="غيّر البحث أو الحالة، أو أنشئ حملة جديدة لفريقك." actionLabel="حملة جديدة" onAction={openWizard} />}

      <Dialog open={wizardOpen} onOpenChange={changeWizard}><DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-5"><DialogTitle>إنشاء حملة جديدة</DialogTitle><DialogDescription>أربع خطوات لتحديد الحملة ومراجعتها قبل حفظها.</DialogDescription></DialogHeader>
        <div className="border-b bg-slate-50 px-6 py-4"><div className="grid grid-cols-4 gap-2">{['الأساسيات', 'الاستهداف', 'المحتوى والموعد', 'المراجعة'].map((label, index) => <div key={label} className="text-center"><div className={cn('mx-auto flex size-7 items-center justify-center rounded-full text-xs font-bold', step > index + 1 ? 'bg-emerald-700 text-white' : step === index + 1 ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-700' : 'bg-slate-200 text-slate-500')}>{step > index + 1 ? <Check className="size-4" /> : index + 1}</div><p className={cn('mt-2 hidden text-xs md:block', step === index + 1 ? 'font-semibold text-emerald-800' : 'text-slate-500')}>{label}</p></div>)}</div></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {step === 1 && <div className="space-y-5"><div className="space-y-2"><Label htmlFor="campaign-name">اسم الحملة</Label><Input id="campaign-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="مثال: ترحيب بعملاء شهر نوفمبر" className="h-11" /></div><div className="space-y-2"><Label>نوع الحملة</Label><div className="grid gap-3 md:grid-cols-3">{(Object.entries(campaignTypeLabels) as Array<[CampaignType, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setForm({ ...form, type: value, content: '' })} className={cn('min-h-20 cursor-pointer rounded-xl border p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', form.type === value ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50')}><Megaphone className={cn('mb-2 size-5', form.type === value ? 'text-emerald-700' : 'text-slate-400')} /><span className="block text-sm font-medium text-ink">{label}</span></button>)}</div></div><div className="space-y-2"><Label htmlFor="campaign-platform">المنصة</Label><select id="campaign-platform" value={form.platform} onChange={event => setForm({ ...form, platform: event.target.value as Platform, accountIds: [] })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm">{Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>}
          {step === 2 && <div className="space-y-6"><div><Label className="mb-3 block">الحسابات المستخدمة</Label>{platformAccounts.length ? <div className="grid gap-2 md:grid-cols-2">{platformAccounts.map(account => <label key={account.id} className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors', form.accountIds.includes(account.id) ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50')}><input type="checkbox" checked={form.accountIds.includes(account.id)} onChange={() => toggleAccount(account.id)} className="size-4 accent-emerald-700" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{account.name}</span><span className="block truncate text-xs text-slate-500">{account.handle}</span></span></label>)}</div> : <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">لا توجد حسابات على هذه المنصة. أضف حسابًا أولًا من صفحة الحسابات.</p>}</div><div className="space-y-2"><Label htmlFor="campaign-audience">مجموعة الجمهور</Label><select id="campaign-audience" value={form.audience} onChange={event => setForm({ ...form, audience: event.target.value })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="">اختر المجموعة</option>{data.groups.map(group => <option key={group.id} value={group.id}>{group.name} · {group.contacts.length} جهة</option>)}</select><p className="text-xs leading-5 text-slate-500">تُستخدم المجموعة للاستهداف في الرسائل، أو لحفظ نتائج الاستخراج، أو كمرجع تنظيمي للنشر.</p></div></div>}
          {step === 3 && <div className="space-y-5">{form.type === 'extraction' ? <div className="space-y-2"><Label htmlFor="campaign-source">مصدر الاستخراج</Label><Input id="campaign-source" value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} placeholder="رابط منشور أو مجموعة أو كلمات البحث" className="h-11" /></div> : <div className="space-y-2"><Label htmlFor="campaign-content">المحتوى</Label><select id="campaign-content" value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="">اختر من مكتبة المحتوى</option>{data.contents.filter(item => form.type === 'messages' ? item.kind === 'message' : item.kind === 'post').map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>}<div className="space-y-3"><Label>موعد التشغيل</Label><div className="flex flex-wrap gap-3"><label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm"><input type="radio" name="schedule" checked={form.scheduleMode === 'now'} onChange={() => setForm({ ...form, scheduleMode: 'now' })} className="accent-emerald-700" />تنشيط في بيئة العرض</label><label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm"><input type="radio" name="schedule" checked={form.scheduleMode === 'later'} onChange={() => setForm({ ...form, scheduleMode: 'later' })} className="accent-emerald-700" />تحديد موعد</label></div>{form.scheduleMode === 'later' && <Input type="datetime-local" value={form.schedule} onChange={event => setForm({ ...form, schedule: event.target.value })} className="h-11" dir="ltr" />}</div></div>}
          {step === 4 && <div><h3 className="font-semibold text-ink">راجع الحملة قبل الحفظ</h3><dl className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 px-4">{[
            ['اسم الحملة', form.name], ['النوع', campaignTypeLabels[form.type]], ['المنصة', platformLabels[form.platform]],
            ['الحسابات', data.accounts.filter(account => form.accountIds.includes(account.id)).map(account => account.name).join('، ')],
            ['الجمهور', selectedGroup?.name ?? ''], [form.type === 'extraction' ? 'المصدر' : 'المحتوى', form.type === 'extraction' ? form.content : data.contents.find(item => item.id === form.content)?.title ?? ''],
            ['الموعد', form.scheduleMode === 'later' ? formatDate(new Date(form.schedule).toISOString(), true) : 'تنشيط محلي فوري'],
          ].map(([label, value]) => <div key={label} className="grid gap-1 py-3 md:grid-cols-[140px_1fr]"><dt className="text-sm text-slate-500">{label}</dt><dd className="text-sm font-medium leading-6 text-ink">{value}</dd></div>)}</dl><p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm leading-6 text-sky-900">بالحفظ أنت تنشئ سجلًا تجريبيًا فقط. لن تُرسل رسائل ولن تُنفذ إجراءات خارجية.</p></div>}
          {error && <p role="alert" className="mt-5 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
        <DialogFooter className="border-t bg-white px-6 py-4"><Button type="button" variant="outline" disabled={step === 1} onClick={() => { setError(''); setStep(current => Math.max(1, current - 1)) }}><ArrowRight />السابق</Button>{step < 4 ? <Button type="button" className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={next}>التالي<ArrowLeft /></Button> : <Button type="button" className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={create}><Check />حفظ الحملة التجريبية</Button>}</DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={Boolean(details)} onOpenChange={value => !value && setDetailsId(null)}><DialogContent><DialogHeader><DialogTitle>{details?.name}</DialogTitle><DialogDescription>{details ? `${campaignTypeLabels[details.type]} · ${platformLabels[details.platform]}` : ''}</DialogDescription></DialogHeader>{details && <div className="space-y-5"><div className="flex items-center gap-2"><StatusBadge status={details.status} label={campaignStatusLabels[details.status]} /><PlatformBadge platform={details.platform} /></div><div><div className="mb-2 flex justify-between text-sm"><span className="text-slate-500">التقدم</span><span className="font-semibold">{details.progress}%</span></div><Progress value={details.progress} /></div><div className="grid grid-cols-3 gap-2 text-center">{[['الإجمالي', details.stats.total], ['الناجح', details.stats.success], ['الفاشل', details.stats.failed]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xl font-bold text-ink">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>)}</div><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">الجمهور</dt><dd className="font-medium">{details.audience}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">المحتوى/المصدر</dt><dd className="font-medium">{details.content}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">الموعد</dt><dd className="font-medium">{formatDate(details.schedule, true)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">الحسابات</dt><dd className="text-left font-medium">{data.accounts.filter(account => details.accountIds.includes(account.id)).map(account => account.name).join('، ') || 'لا توجد حسابات مرتبطة'}</dd></div></dl><Button variant="outline" className="w-full" onClick={() => exportReport(details)}><Download />تصدير التقرير</Button></div>}</DialogContent></Dialog>
      <AlertDialog open={Boolean(deleteId)} onOpenChange={value => !value && setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>حذف الحملة؟</AlertDialogTitle><AlertDialogDescription>سيُحذف سجل الحملة من هذا المتصفح. لا يؤثر ذلك على أي منصة خارجية.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={remove}>حذف الحملة</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}
