import { useEffect, useState, type FormEvent } from 'react'
import { Database, RotateCcw, Save, ServerCog, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAppData } from '@/context/AppDataContext'
import { PageHeader } from '@/components/shared'
import type { AppSettings } from '@/types'

export default function Settings() {
  const { data, setData, addActivity, resetData } = useAppData()
  const [workspaceName, setWorkspaceName] = useState(data.workspaceName)
  const [form, setForm] = useState<AppSettings>(data.settings)
  const [error, setError] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  useEffect(() => { setWorkspaceName(data.workspaceName); setForm(data.settings) }, [data.workspaceName, data.settings])

  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!workspaceName.trim()) { setError('أدخل اسمًا لمساحة العمل.'); return }
    if (form.sendingDelayMin < 0 || form.sendingDelayMax < form.sendingDelayMin) { setError('الحد الأقصى للفاصل يجب أن يكون أكبر من أو يساوي الحد الأدنى.'); return }
    if (form.dailyLimit < 1) { setError('الحد اليومي يجب أن يكون رسالة واحدة على الأقل.'); return }
    if (form.workStart >= form.workEnd) { setError('وقت نهاية العمل يجب أن يكون بعد وقت البداية.'); return }
    setData(current => ({ ...current, workspaceName: workspaceName.trim(), settings: form }))
    addActivity('حفظ إعدادات الإرسال', `فاصل ${form.sendingDelayMin}–${form.sendingDelayMax} ثانية · حد ${form.dailyLimit} يوميًا`)
    setError(''); toast.success('تم حفظ الإعدادات على الخادم المحلي')
  }
  const reset = () => { resetData(); setResetOpen(false); toast.success('تمت استعادة بيانات العرض الأصلية') }
  const number = (value: string) => Number(value)

  return (
    <>
      <PageHeader title="الإعدادات" description="اضبط هوية مساحة العمل وسياسات الإرسال وساعات العمل وطريقة حفظ البيانات." />
      <form onSubmit={save} className="space-y-6">
        <Card className="border-slate-200/80 shadow-none"><CardHeader><CardTitle className="text-lg">مساحة العمل</CardTitle><CardDescription>الاسم الظاهر لفريقك داخل المنصة</CardDescription></CardHeader><CardContent><div className="max-w-lg space-y-2"><Label htmlFor="workspace-name">اسم مساحة العمل</Label><Input id="workspace-name" value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} className="h-11" /></div></CardContent></Card>
        <Card className="border-slate-200/80 shadow-none"><CardHeader><CardTitle className="text-lg">سياسة الإرسال</CardTitle><CardDescription>قواعد محافظة تُطبق عند ربط عامل التنفيذ الحقيقي لاحقًا</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><Label htmlFor="delay-min">أقل فاصل (ثانية)</Label><Input id="delay-min" type="number" min="0" value={form.sendingDelayMin} onChange={event => setForm({ ...form, sendingDelayMin: number(event.target.value) })} className="h-11" /></div><div className="space-y-2"><Label htmlFor="delay-max">أكبر فاصل (ثانية)</Label><Input id="delay-max" type="number" min="0" value={form.sendingDelayMax} onChange={event => setForm({ ...form, sendingDelayMax: number(event.target.value) })} className="h-11" /></div><div className="space-y-2"><Label htmlFor="daily-limit">الحد اليومي لكل حساب</Label><Input id="daily-limit" type="number" min="1" value={form.dailyLimit} onChange={event => setForm({ ...form, dailyLimit: number(event.target.value) })} className="h-11" /></div></div><div className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><Label htmlFor="work-start">بداية العمل</Label><Input id="work-start" type="time" value={form.workStart} onChange={event => setForm({ ...form, workStart: event.target.value })} className="h-11" dir="ltr" /></div><div className="space-y-2"><Label htmlFor="work-end">نهاية العمل</Label><Input id="work-end" type="time" value={form.workEnd} onChange={event => setForm({ ...form, workEnd: event.target.value })} className="h-11" dir="ltr" /></div><div className="space-y-2"><Label htmlFor="timezone">المنطقة الزمنية</Label><select id="timezone" value={form.timezone} onChange={event => setForm({ ...form, timezone: event.target.value })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="Asia/Amman">الأردن (عمّان)</option><option value="Asia/Riyadh">السعودية (الرياض)</option><option value="UTC">UTC</option></select></div></div><div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-4"><div><Label htmlFor="weekend-pause" className="font-medium">إيقاف التنفيذ في عطلة نهاية الأسبوع</Label><p className="mt-1 text-sm text-slate-500">تُحفظ الحملات المجدولة حتى بداية أسبوع العمل.</p></div><Switch id="weekend-pause" checked={form.weekendPause} onCheckedChange={checked => setForm({ ...form, weekendPause: checked })} /></div></CardContent></Card>
        {error && <p role="alert" className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end"><Button type="submit" className="h-11 bg-emerald-700 text-white hover:bg-emerald-800"><Save />حفظ الإعدادات</Button></div>
      </form>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Database className="size-5 text-emerald-700" />حفظ البيانات</CardTitle><CardDescription>سلوك النسخة الحالية بوضوح</CardDescription></CardHeader><CardContent className="space-y-4 text-sm leading-7 text-slate-600"><p>التعديلات محفوظة في <strong className="text-ink">SQLite على الخادم المحلي</strong> وتبقى بعد مسح بيانات المتصفح. توجد نسخة احتياطية محلية في localStorage للمساعدة فقط.</p><div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="font-medium text-ink">عند التوسع الإنتاجي:</p><p className="mt-1">يمكن ترحيل البيانات إلى PostgreSQL وإضافة Redis لطابور المهام دون تغيير الواجهة.</p></div><Button variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => setResetOpen(true)}><RotateCcw />استعادة بيانات العرض الأصلية</Button></CardContent></Card>
        <Card className="border-slate-200/80 shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ServerCog className="size-5 text-emerald-700" />جاهزية التشغيل الذاتي</CardTitle><CardDescription>الطبقات المخطط ربطها بالواجهة</CardDescription></CardHeader><CardContent><div className="space-y-3">{[
          ['واجهة الويب العربية', 'جاهزة ومتصلة بالخادم'], ['SQLite وتسجيل الدخول', 'يعملان محليًا'], ['عامل الحملات والجدولة', 'غير مفعّل في هذه النسخة'], ['Facebook Login', 'جاهز للإعداد والاختبار'],
        ].map(([title, status]) => <div key={title} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-400" /><div><p className="text-sm font-medium text-ink">{title}</p><p className="mt-1 text-xs text-slate-500">{status}</p></div></div>)}</div></CardContent></Card>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>استعادة بيانات العرض؟</AlertDialogTitle><AlertDialogDescription>سيُحذف كل ما أضفته أو عدّلته على الخادم المحلي وتعود البيانات التوضيحية الأصلية.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={reset}>استعادة البيانات</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}
