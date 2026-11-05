import { useState, type FormEvent } from 'react'
import { Bot, Plus, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAppData } from '@/context/AppDataContext'
import { platformLabels, uid } from '@/lib/demo'
import { DemoNotice, EmptyState, PageHeader, PlatformBadge } from '@/components/shared'
import type { AutomationRule, Platform } from '@/types'

export default function Automation() {
  const { data, setData, addActivity } = useAppData()
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: string; trigger: string; response: string; platform: Platform }>({ name: '', trigger: '', response: '', platform: 'facebook' })
  const [error, setError] = useState('')

  const toggle = (rule: AutomationRule) => {
    setData(current => ({ ...current, rules: current.rules.map(item => item.id === rule.id ? { ...item, enabled: !item.enabled } : item) }))
    addActivity(rule.enabled ? 'تعطيل رد تلقائي' : 'تفعيل رد تلقائي', rule.name)
  }
  const addRule = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !form.trigger.trim() || !form.response.trim()) { setError('أكمل اسم القاعدة وشرطها والرد.'); return }
    const rule: AutomationRule = { id: uid('rule'), ...form, name: form.name.trim(), trigger: form.trigger.trim(), response: form.response.trim(), enabled: true, matches: 0 }
    setData(current => ({ ...current, rules: [rule, ...current.rules] }))
    addActivity('إنشاء قاعدة رد تلقائي', rule.name)
    toast.success('تم حفظ القاعدة في بيئة العرض')
    setForm({ name: '', trigger: '', response: '', platform: 'facebook' }); setOpen(false); setError('')
  }
  const remove = () => {
    if (!deleteId) return
    setData(current => ({ ...current, rules: current.rules.filter(rule => rule.id !== deleteId) }))
    setDeleteId(null); toast.success('تم حذف القاعدة')
  }

  return (
    <>
      <PageHeader title="الردود التلقائية" description="أنشئ قواعد واضحة للرد على الرسائل والكلمات المفتاحية، وتحكم بتفعيلها لكل منصة." actions={<Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => setOpen(true)}><Plus />قاعدة جديدة</Button>} />
      <DemoNotice>القواعد لا تراقب الرسائل ولا ترسل ردودًا حقيقية في هذه النسخة. تفعيلها يغيّر الحالة المحلية فقط.</DemoNotice>
      <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">قواعد مفعّلة</p><p className="mt-2 text-2xl font-bold text-ink">{data.rules.filter(rule => rule.enabled).length}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">إجمالي القواعد</p><p className="mt-2 text-2xl font-bold text-ink">{data.rules.length}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">مطابقات توضيحية</p><p className="mt-2 text-2xl font-bold text-ink">{data.rules.reduce((sum, rule) => sum + rule.matches, 0)}</p></div></div>
      {data.rules.length ? <div className="space-y-3">{data.rules.map(rule => <Card key={rule.id} className="border-slate-200/80 shadow-none"><CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-center"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Bot className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink">{rule.name}</h3><PlatformBadge platform={rule.platform} /></div><div className="mt-3 grid gap-3 text-sm md:grid-cols-2"><p className="text-slate-600"><span className="font-medium text-slate-400">عندما: </span>{rule.trigger}</p><p className="text-slate-600"><span className="font-medium text-slate-400">الرد: </span>{rule.response}</p></div></div><div className="flex items-center justify-between gap-4 border-t pt-4 md:min-w-48 md:justify-end md:border-0 md:pt-0"><div className="text-left"><p className="text-sm font-semibold text-ink">{rule.matches}</p><p className="text-xs text-slate-400">مطابقة</p></div><Switch checked={rule.enabled} onCheckedChange={() => toggle(rule)} aria-label={`تفعيل ${rule.name}`} /><Button variant="ghost" size="icon" className="text-rose-600" aria-label={`حذف ${rule.name}`} onClick={() => setDeleteId(rule.id)}><Trash2 /></Button></div></CardContent></Card>)}</div> : <EmptyState title="لا توجد قواعد" description="أنشئ أول قاعدة رد تلقائي لفريقك." actionLabel="قاعدة جديدة" onAction={() => setOpen(true)} />}

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-2xl" dir="rtl"><DialogHeader><DialogTitle>قاعدة رد تلقائي جديدة</DialogTitle><DialogDescription>حدد متى تُطابق القاعدة وما الرد الذي ينبغي تجهيزه.</DialogDescription></DialogHeader><form onSubmit={addRule} className="space-y-4"><div className="grid gap-4 md:grid-cols-[1fr_180px]"><div className="space-y-2"><Label htmlFor="rule-name">اسم القاعدة</Label><Input id="rule-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="مثال: الاستفسار عن التوصيل" className="h-11" /></div><div className="space-y-2"><Label htmlFor="rule-platform">المنصة</Label><select id="rule-platform" value={form.platform} onChange={event => setForm({ ...form, platform: event.target.value as Platform })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm">{Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div><div className="space-y-2"><Label htmlFor="rule-trigger">شرط المطابقة</Label><Input id="rule-trigger" value={form.trigger} onChange={event => setForm({ ...form, trigger: event.target.value })} placeholder="كلمات مفصولة بفاصلة أو توقيت" className="h-11" /></div><div className="space-y-2"><Label htmlFor="rule-response">نص الرد</Label><Textarea id="rule-response" value={form.response} onChange={event => setForm({ ...form, response: event.target.value })} placeholder="اكتب الرد الذي سيتم استخدامه..." className="min-h-32 leading-7" /></div>{error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800"><Zap />حفظ القاعدة</Button></DialogFooter></form></DialogContent></Dialog>
      <AlertDialog open={Boolean(deleteId)} onOpenChange={value => !value && setDeleteId(null)}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف القاعدة؟</AlertDialogTitle><AlertDialogDescription>ستُحذف قاعدة الرد التلقائي من مساحة العمل المحلية.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={remove}>حذف القاعدة</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}
