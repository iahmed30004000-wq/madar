import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Copy, FileText, MessageSquareText, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAppData } from '@/context/AppDataContext'
import { formatDate, nowIso, uid } from '@/lib/demo'
import { cn } from '@/lib/utils'
import { EmptyState, PageHeader } from '@/components/shared'
import type { ContentItem, ContentKind } from '@/types'

const kindLabels: Record<ContentKind, string> = { message: 'رسالة', post: 'منشور', reply: 'رد تلقائي' }

export default function ContentLibrary() {
  const { data, setData, addActivity } = useAppData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'all' | ContentKind>('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<{ title: string; body: string; kind: ContentKind }>({ title: '', body: '', kind: 'message' })
  const [error, setError] = useState('')

  useEffect(() => { if (searchParams.get('new') === '1') setOpen(true) }, [searchParams])
  const items = useMemo(() => data.contents.filter(item => (kind === 'all' || item.kind === kind) && `${item.title} ${item.body}`.toLowerCase().includes(query.toLowerCase())), [data.contents, query, kind])
  const changeOpen = (value: boolean) => { setOpen(value); if (!value) { setEditing(null); setSearchParams({}); setError(''); setForm({ title: '', body: '', kind: 'message' }) } }
  const edit = (item: ContentItem) => { setEditing(item); setForm({ title: item.title, body: item.body, kind: item.kind }); setOpen(true) }
  const duplicate = (item: ContentItem) => {
    const copy = { ...item, id: uid('cnt'), title: `${item.title} — نسخة`, usage: 0, updatedAt: nowIso() }
    setData(current => ({ ...current, contents: [copy, ...current.contents] }))
    toast.success('تم إنشاء نسخة من المحتوى')
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.body.trim()) { setError('أدخل عنوانًا ونصًا للمحتوى.'); return }
    if (editing) {
      setData(current => ({ ...current, contents: current.contents.map(item => item.id === editing.id ? { ...item, ...form, title: form.title.trim(), body: form.body.trim(), updatedAt: nowIso() } : item) }))
      addActivity('تعديل محتوى', form.title)
      toast.success('تم حفظ التعديلات')
    } else {
      const item: ContentItem = { id: uid('cnt'), ...form, title: form.title.trim(), body: form.body.trim(), updatedAt: nowIso(), usage: 0 }
      setData(current => ({ ...current, contents: [item, ...current.contents] }))
      addActivity('إنشاء محتوى', item.title)
      toast.success('تم حفظ المحتوى في المكتبة')
    }
    changeOpen(false)
  }

  const remove = () => {
    if (!deleteId) return
    const item = data.contents.find(content => content.id === deleteId)
    setData(current => ({ ...current, contents: current.contents.filter(content => content.id !== deleteId) }))
    if (item) addActivity('حذف محتوى', item.title)
    setDeleteId(null); toast.success('تم حذف المحتوى')
  }

  return (
    <>
      <PageHeader title="مكتبة المحتوى" description="احفظ الرسائل والمنشورات والردود الجاهزة وأعد استخدامها في حملات الفريق." actions={<Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => setOpen(true)}><Plus />محتوى جديد</Button>} />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-sm"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث في العناوين والنصوص..." className="h-11 bg-white pr-10" /></div>
        <div className="flex flex-wrap gap-2">{(['all', 'message', 'post', 'reply'] as const).map(value => <button key={value} type="button" onClick={() => setKind(value)} className={cn('min-h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', kind === value ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>{value === 'all' ? 'كل المحتوى' : kindLabels[value]}</button>)}</div>
      </div>
      {items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(item => <Card key={item.id} className="flex flex-col border-slate-200/80 shadow-none">
        <CardContent className="flex flex-1 flex-col p-5"><div className="flex items-start justify-between gap-3"><Badge variant="outline" className="gap-1.5 border-slate-200 bg-slate-50 text-slate-600">{item.kind === 'reply' ? <MessageSquareText /> : <FileText />}{kindLabels[item.kind]}</Badge><span className="text-xs text-slate-400">استخدم {item.usage} مرة</span></div><h3 className="mt-4 text-lg font-semibold text-ink">{item.title}</h3><p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-7 text-slate-600">{item.body}</p><div className="mt-5 flex items-center justify-between border-t pt-4"><span className="text-xs text-slate-400">{formatDate(item.updatedAt)}</span><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`نسخ ${item.title}`} onClick={() => duplicate(item)}><Copy /></Button><Button variant="ghost" size="icon" aria-label={`تعديل ${item.title}`} onClick={() => edit(item)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={`حذف ${item.title}`} className="text-rose-600" onClick={() => setDeleteId(item.id)}><Trash2 /></Button></div></div></CardContent>
      </Card>)}</div> : <EmptyState title="لا يوجد محتوى مطابق" description="غيّر البحث أو النوع، أو أنشئ أول محتوى جديد للفريق." actionLabel="محتوى جديد" onAction={() => setOpen(true)} />}

      <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="sm:max-w-2xl" dir="rtl"><DialogHeader><DialogTitle>{editing ? 'تعديل المحتوى' : 'إنشاء محتوى جديد'}</DialogTitle><DialogDescription>استخدم نصًا واضحًا، ويمكنك تضمين متغيرات مثل {'{{الاسم}}'} لتخصيص الرسالة لاحقًا.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-4"><div className="grid gap-4 md:grid-cols-[1fr_180px]"><div className="space-y-2"><Label htmlFor="content-title">العنوان</Label><Input id="content-title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="اسم واضح للمحتوى" className="h-11" /></div><div className="space-y-2"><Label htmlFor="content-kind">النوع</Label><select id="content-kind" value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value as ContentKind })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm">{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div><div className="space-y-2"><Label htmlFor="content-body">النص</Label><Textarea id="content-body" value={form.body} onChange={event => setForm({ ...form, body: event.target.value })} placeholder="اكتب النص الذي سيستخدمه الفريق..." className="min-h-44 leading-7" /></div>{error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => changeOpen(false)}>إلغاء</Button><Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800">حفظ المحتوى</Button></DialogFooter></form>
      </DialogContent></Dialog>
      <AlertDialog open={Boolean(deleteId)} onOpenChange={value => !value && setDeleteId(null)}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف المحتوى؟</AlertDialogTitle><AlertDialogDescription>سيُحذف هذا القالب من مكتبة المحتوى على المتصفح. الحملات السابقة تحتفظ باسم القالب المستخدم.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={remove}>حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}
