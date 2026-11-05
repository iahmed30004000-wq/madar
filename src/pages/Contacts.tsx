import { useMemo, useState, type FormEvent } from 'react'
import { Download, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAppData } from '@/context/AppDataContext'
import { downloadCsv, nowIso, platformLabels, uid } from '@/lib/demo'
import { cn } from '@/lib/utils'
import { DemoNotice, EmptyState, PageHeader } from '@/components/shared'
import type { Contact, ContactGroup, Platform } from '@/types'

export default function Contacts() {
  const { data, setData, addActivity } = useAppData()
  const [selectedId, setSelectedId] = useState(data.groups[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'new' | 'append'>('new')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState<Platform>('facebook')
  const [raw, setRaw] = useState('')
  const [error, setError] = useState('')
  const selected = data.groups.find(group => group.id === selectedId) ?? data.groups[0]
  const contacts = useMemo(() => (selected?.contacts ?? []).filter(contact => `${contact.name} ${contact.phone} ${contact.email ?? ''}`.toLowerCase().includes(query.toLowerCase())), [selected, query])

  const openDialog = (nextMode: 'new' | 'append') => { setMode(nextMode); setOpen(true); setError(''); setRaw(''); setName(nextMode === 'append' ? selected?.name ?? '' : '') }
  const importContacts = (event: FormEvent) => {
    event.preventDefault()
    const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    if (!name.trim() || !lines.length) { setError('أدخل اسم المجموعة وجهة اتصال واحدة على الأقل.'); return }
    const imported: Contact[] = lines.map((line, index) => {
      const parts = line.split(',').map(part => part.trim())
      const identifier = parts.length > 1 ? parts[1] : parts[0]
      return {
        id: uid('contact'),
        name: parts.length > 1 ? parts[0] : `جهة مستوردة ${index + 1}`,
        phone: identifier.includes('@') ? 'غير متوفر' : identifier,
        email: identifier.includes('@') ? identifier : (parts[2] || undefined),
        source: 'استيراد يدوي', tags: ['مستورد'],
      }
    })
    if (mode === 'new') {
      const group: ContactGroup = { id: uid('grp'), name: name.trim(), platform, updatedAt: nowIso(), contacts: imported }
      setData(current => ({ ...current, groups: [group, ...current.groups] }))
      setSelectedId(group.id)
      addActivity('إنشاء مجموعة جهات', `${group.name} · ${imported.length} جهة`)
    } else if (selected) {
      setData(current => ({ ...current, groups: current.groups.map(group => group.id === selected.id ? { ...group, contacts: [...group.contacts, ...imported], updatedAt: nowIso() } : group) }))
      addActivity('إضافة جهات اتصال', `${imported.length} جهة إلى ${selected.name}`)
    }
    toast.success(`تم استيراد ${imported.length} جهة اتصال محليًا`)
    setOpen(false); setRaw(''); setName('')
  }

  const exportGroup = () => {
    if (!selected) return
    downloadCsv(`${selected.name}.csv`, ['الاسم', 'رقم الهاتف أو المعرف', 'البريد الإلكتروني', 'المصدر', 'الوسوم'], selected.contacts.map(contact => [contact.name, contact.phone, contact.email, contact.source, contact.tags.join(' | ')]))
    toast.success('تم تجهيز ملف CSV')
  }

  const deleteGroup = () => {
    if (!selected) return
    const remaining = data.groups.filter(group => group.id !== selected.id)
    setData(current => ({ ...current, groups: remaining }))
    addActivity('حذف مجموعة جهات', selected.name)
    setSelectedId(remaining[0]?.id ?? ''); setDeleteOpen(false); toast.success('تم حذف المجموعة')
  }

  return (
    <>
      <PageHeader title="جهات الاتصال" description="أنشئ مجموعات جمهور منظمة، واستورد البيانات، واستخدمها في الحملات والتقارير." actions={<><Button variant="outline" className="h-11" onClick={exportGroup} disabled={!selected}><Download />تصدير CSV</Button><Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => openDialog('new')}><Plus />مجموعة جديدة</Button></>} />
      <DemoNotice>الاستيراد والتصدير هنا يعملان على بيانات محلية توضيحية، بدون جلب بيانات من أي منصة.</DemoNotice>
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit border-slate-200/80 shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">مجموعات الجمهور</CardTitle><Badge variant="secondary">{data.groups.length}</Badge></CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            {data.groups.map(group => <button key={group.id} type="button" onClick={() => setSelectedId(group.id)} className={cn('flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', selected?.id === group.id ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50')}><span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', selected?.id === group.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}><Users className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{group.name}</span><span className="mt-1 block text-xs text-slate-500">{group.contacts.length} جهة اتصال</span></span></button>)}
            {!data.groups.length && <p className="p-4 text-center text-sm text-slate-500">لا توجد مجموعات بعد</p>}
          </CardContent>
        </Card>
        <div className="min-w-0">
          {selected ? <Card className="border-slate-200/80 shadow-none">
            <CardHeader className="gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between md:space-y-0"><div><CardTitle className="text-lg">{selected.name}</CardTitle><p className="mt-2 text-sm text-slate-500">{selected.contacts.length} جهة · {selected.platform === 'mixed' ? 'منصات متعددة' : platformLabels[selected.platform]}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openDialog('append')}><UserPlus />إضافة جهات</Button><Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setDeleteOpen(true)}><Trash2 />حذف المجموعة</Button></div></CardHeader>
            <div className="p-4 pb-0"><div className="relative md:max-w-sm"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث داخل المجموعة..." className="h-11 pr-10" /></div></div>
            <CardContent className="px-0 pb-0 pt-4">
              {contacts.length ? <Table><TableHeader><TableRow><TableHead className="pr-6">الاسم</TableHead><TableHead>الهاتف أو المعرف</TableHead><TableHead>البريد الإلكتروني</TableHead><TableHead>المصدر</TableHead><TableHead className="pl-6">الوسوم</TableHead></TableRow></TableHeader><TableBody>{contacts.map(contact => <TableRow key={contact.id}><TableCell className="pr-6 font-medium text-ink">{contact.name}</TableCell><TableCell dir="ltr" className="text-right text-slate-600">{contact.phone}</TableCell><TableCell dir="ltr" className="text-right text-slate-500">{contact.email ?? '—'}</TableCell><TableCell className="text-slate-500">{contact.source}</TableCell><TableCell className="pl-6"><div className="flex gap-1">{contact.tags.map(tag => <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>)}</div></TableCell></TableRow>)}</TableBody></Table> : <div className="p-6"><EmptyState title="لا توجد نتائج" description="لم نجد جهة مطابقة للبحث داخل هذه المجموعة." /></div>}
            </CardContent>
          </Card> : <EmptyState title="ابدأ بإنشاء مجموعة" description="أضف مجموعة جهات اتصال لتظهر هنا وتستخدمها في الحملات." actionLabel="مجموعة جديدة" onAction={() => openDialog('new')} />}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl" dir="rtl"><DialogHeader><DialogTitle>{mode === 'new' ? 'إنشاء مجموعة جهات اتصال' : `إضافة جهات إلى ${selected?.name}`}</DialogTitle><DialogDescription>أدخل كل جهة في سطر. يمكنك استخدام: الاسم، الهاتف أو المعرف، البريد الإلكتروني.</DialogDescription></DialogHeader>
          <form onSubmit={importContacts} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="group-name">اسم المجموعة</Label><Input id="group-name" value={name} onChange={event => setName(event.target.value)} disabled={mode === 'append'} placeholder="مثال: عملاء حملة الشتاء" className="h-11" /></div><div className="space-y-2"><Label htmlFor="group-platform">المنصة</Label><select id="group-platform" value={platform} onChange={event => setPlatform(event.target.value as Platform)} disabled={mode === 'append'} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-60">{Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
            <div className="space-y-2"><Label htmlFor="contact-lines">جهات الاتصال</Label><Textarea id="contact-lines" value={raw} onChange={event => setRaw(event.target.value)} placeholder={'ليان خالد، +962790000000، layan@example.com\n+962790000001\nuser@example.com'} className="min-h-40 leading-7" /></div>
            {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800"><Plus />استيراد محلي</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف مجموعة جهات الاتصال؟</AlertDialogTitle><AlertDialogDescription>سيُحذف سجل المجموعة وجهاتها من هذا المتصفح فقط.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={deleteGroup}>حذف المجموعة</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}
