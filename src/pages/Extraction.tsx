import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Database, Download, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAppData } from '@/context/AppDataContext'
import { downloadCsv, formatDate, nowIso, platformLabels, uid } from '@/lib/demo'
import { cn } from '@/lib/utils'
import { DemoNotice, EmptyState, PageHeader, PlatformBadge } from '@/components/shared'
import type { ExtractionJob, ExtractionResult, Platform } from '@/types'

const sampleNames = ['أمل ناصر', 'باسل سامي', 'رنا فؤاد', 'خالد منير', 'سلمى عادل', 'يوسف نبيل']

export default function Extraction() {
  const { data, setData, addActivity } = useAppData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(data.jobs[0]?.id ?? '')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [method, setMethod] = useState<'ids' | 'keywords'>('keywords')
  const [platform, setPlatform] = useState<Platform>('facebook')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const selected = data.jobs.find(job => job.id === selectedId) ?? data.jobs[0]

  useEffect(() => { if (searchParams.get('new') === '1') setOpen(true) }, [searchParams])
  const changeOpen = (value: boolean) => { setOpen(value); if (!value) { setSearchParams({}); setError('') } }
  const createJob = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !query.trim()) { setError('أدخل اسم العملية ومصدر الاستخراج.'); return }
    const count = Math.min(6, Math.max(3, query.trim().split(/\r?\n/).filter(Boolean).length + 2))
    const results: ExtractionResult[] = sampleNames.slice(0, count).map((sampleName, index) => ({
      id: uid('res'), name: sampleName, handle: `sample.user${index + 1}`,
      email: index % 2 === 0 ? `sample${index + 1}@example.com` : undefined,
      source: method === 'ids' ? 'معرف مستهدف' : 'كلمة بحث',
    }))
    const job: ExtractionJob = { id: uid('job'), name: name.trim(), method, query: query.trim(), platform, status: 'completed', createdAt: nowIso(), results }
    setData(current => ({ ...current, jobs: [job, ...current.jobs] }))
    setSelectedId(job.id); addActivity('إنشاء عملية استخراج تجريبية', `${job.name} · ${results.length} نتائج`)
    toast.success('تم تجهيز نتائج توضيحية', { description: 'لم يتم جلب أي بيانات من منصة خارجية.' })
    setName(''); setQuery(''); changeOpen(false)
  }
  const exportResults = (job: ExtractionJob) => {
    downloadCsv(`${job.name}-results.csv`, ['الاسم', 'المعرف', 'البريد الإلكتروني', 'المصدر'], job.results.map(result => [result.name, result.handle, result.email, result.source]))
    toast.success('تم تصدير النتائج بصيغة CSV')
  }
  const saveAsGroup = (job: ExtractionJob) => {
    const group = { id: uid('grp'), name: `نتائج: ${job.name}`, platform: job.platform, updatedAt: nowIso(), contacts: job.results.map(result => ({ id: uid('contact'), name: result.name, phone: result.handle, email: result.email, source: job.name, tags: ['نتائج استخراج'] })) }
    setData(current => ({ ...current, groups: [group, ...current.groups] }))
    addActivity('حفظ نتائج كمجموعة', group.name)
    toast.success('تم حفظ النتائج كمجموعة جهات اتصال')
  }
  const deleteJob = (id: string) => {
    const remaining = data.jobs.filter(job => job.id !== id)
    setData(current => ({ ...current, jobs: remaining }))
    setSelectedId(remaining[0]?.id ?? ''); toast.success('تم حذف سجل الاستخراج')
  }

  return (
    <>
      <PageHeader title="استخراج البيانات" description="أنشئ عمليات استخراج عبر المعرفات أو الكلمات، وراجع النتائج واستخدمها كمجموعات جمهور." actions={<Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => setOpen(true)}><Plus />عملية جديدة</Button>} />
      <DemoNotice>كل النتائج المعروضة عينات اصطناعية لتجربة مسار العمل. لا يوجد كشط أو جلب بيانات من المنصات.</DemoNotice>
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-fit border-slate-200/80 shadow-none"><CardHeader><CardTitle className="text-base">سجل العمليات</CardTitle><CardDescription>{data.jobs.length} عمليات محفوظة</CardDescription></CardHeader><CardContent className="space-y-2 px-3 pb-3">{data.jobs.map(job => <div key={job.id} className={cn('flex items-center gap-1 rounded-lg', selected?.id === job.id ? 'bg-emerald-50' : 'hover:bg-slate-50')}><button type="button" onClick={() => setSelectedId(job.id)} className="min-h-16 min-w-0 flex-1 cursor-pointer rounded-lg px-3 py-2 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><span className="block truncate text-sm font-medium text-ink">{job.name}</span><span className="mt-1 block text-xs text-slate-500">{job.results.length} نتائج · {formatDate(job.createdAt)}</span></button><Button variant="ghost" size="icon" aria-label={`حذف ${job.name}`} className="shrink-0 text-rose-600" onClick={() => deleteJob(job.id)}><Trash2 /></Button></div>)}{!data.jobs.length && <p className="p-6 text-center text-sm text-slate-500">لا توجد عمليات محفوظة</p>}</CardContent></Card>
        <div className="min-w-0">{selected ? <Card className="border-slate-200/80 shadow-none"><CardHeader className="gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between md:space-y-0"><div><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-lg">{selected.name}</CardTitle><PlatformBadge platform={selected.platform} /></div><CardDescription className="mt-2 leading-6">{selected.method === 'ids' ? 'عبر المعرفات' : 'عبر الكلمات'} · {selected.query}</CardDescription></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => saveAsGroup(selected)}><Save />حفظ كمجموعة</Button><Button variant="outline" size="sm" onClick={() => exportResults(selected)}><Download />تصدير</Button></div></CardHeader><CardContent className="px-0 pb-0 pt-0"><Table><TableHeader><TableRow><TableHead className="pr-6">الاسم</TableHead><TableHead>المعرف</TableHead><TableHead>البريد الإلكتروني</TableHead><TableHead className="pl-6">المصدر</TableHead></TableRow></TableHeader><TableBody>{selected.results.map(result => <TableRow key={result.id}><TableCell className="pr-6 font-medium text-ink">{result.name}</TableCell><TableCell dir="ltr" className="text-right text-slate-600">{result.handle}</TableCell><TableCell dir="ltr" className="text-right text-slate-500">{result.email ?? '—'}</TableCell><TableCell className="pl-6 text-slate-500">{result.source}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card> : <EmptyState title="ابدأ عملية استخراج" description="حدد طريقة الاستخراج والمصدر لتظهر النتائج التوضيحية هنا." actionLabel="عملية جديدة" onAction={() => setOpen(true)} />}</div>
      </div>

      <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="sm:max-w-2xl" dir="rtl"><DialogHeader><DialogTitle>عملية استخراج جديدة</DialogTitle><DialogDescription>سيتم توليد سجلات اصطناعية واضحة لتوضيح شكل النتائج ومسار الاستخدام.</DialogDescription></DialogHeader><form onSubmit={createJob} className="space-y-4"><div className="space-y-2"><Label htmlFor="job-name">اسم العملية</Label><Input id="job-name" value={name} onChange={event => setName(event.target.value)} placeholder="مثال: المتفاعلون مع منشور المنتج" className="h-11" /></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="job-method">طريقة الاستخراج</Label><select id="job-method" value={method} onChange={event => setMethod(event.target.value as 'ids' | 'keywords')} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="keywords">عبر الكلمات</option><option value="ids">عبر المعرفات</option></select></div><div className="space-y-2"><Label htmlFor="job-platform">المنصة</Label><select id="job-platform" value={platform} onChange={event => setPlatform(event.target.value as Platform)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm">{Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div><div className="space-y-2"><Label htmlFor="job-query">{method === 'ids' ? 'المعرفات أو الروابط' : 'الكلمات أو وصف المصدر'}</Label><Textarea id="job-query" value={query} onChange={event => setQuery(event.target.value)} placeholder={method === 'ids' ? 'أدخل كل معرف أو رابط في سطر' : 'أدخل كلمة البحث أو وصف المنشور أو المجموعة'} className="min-h-32 leading-7" /></div>{error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => changeOpen(false)}>إلغاء</Button><Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800"><Database />توليد نتائج توضيحية</Button></DialogFooter></form></DialogContent></Dialog>
    </>
  )
}
