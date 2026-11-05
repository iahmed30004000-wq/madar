import { useState, type FormEvent } from 'react'
import { Mail, Plus, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAppData } from '@/context/AppDataContext'
import { formatDate, nowIso, uid } from '@/lib/demo'
import { PageHeader } from '@/components/shared'
import type { TeamMember } from '@/types'

export default function Team() {
  const { data, setData, addActivity } = useAppData()
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: string; email: string; role: TeamMember['role'] }>({ name: '', email: '', role: 'موظف' })
  const [error, setError] = useState('')

  const invite = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !form.email.includes('@')) { setError('أدخل اسم العضو وبريدًا إلكترونيًا صالحًا.'); return }
    if (data.members.some(member => member.email.toLowerCase() === form.email.toLowerCase())) { setError('هذا البريد موجود بالفعل في الفريق.'); return }
    const member: TeamMember = { id: uid('mem'), ...form, name: form.name.trim(), email: form.email.trim(), status: 'invited', lastActive: nowIso() }
    setData(current => ({ ...current, members: [...current.members, member] }))
    addActivity('دعوة عضو للفريق', `${member.name} · ${member.role}`)
    toast.success('تمت إضافة الدعوة إلى بيئة العرض', { description: 'لم يُرسل بريد إلكتروني فعلي.' })
    setForm({ name: '', email: '', role: 'موظف' }); setOpen(false); setError('')
  }
  const remove = () => {
    if (!deleteId) return
    const member = data.members.find(item => item.id === deleteId)
    setData(current => ({ ...current, members: current.members.filter(item => item.id !== deleteId) }))
    if (member) addActivity('إزالة عضو من الفريق', member.name)
    setDeleteId(null); toast.success('تمت إزالة العضو')
  }

  return (
    <>
      <PageHeader title="الفريق والصلاحيات" description="أدر أعضاء الفريق وأدوارهم، وراجع سجل النشاط لمعرفة من قام بكل إجراء." actions={<Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => setOpen(true)}><Plus />دعوة عضو</Button>} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">{[
        { role: 'مدير', description: 'كل الصلاحيات، بما فيها الفريق والإعدادات', icon: ShieldCheck },
        { role: 'مشرف', description: 'إدارة الحملات والمحتوى والجمهور والتقارير', icon: UserCog },
        { role: 'موظف', description: 'تنفيذ المهام ومتابعة المحادثات المسندة', icon: Users },
      ].map(item => <Card key={item.role} className="border-slate-200/80 shadow-none"><CardContent className="flex gap-3 p-5"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><item.icon className="size-5" /></div><div><h3 className="font-semibold text-ink">{item.role}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p></div></CardContent></Card>)}</div>
      <Card className="border-slate-200/80 shadow-none"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-lg">أعضاء الفريق</CardTitle><CardDescription className="mt-1.5">{data.members.length} أعضاء ودعوات</CardDescription></div><Badge variant="secondary">{data.members.filter(member => member.status === 'active').length} نشط</Badge></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead className="pr-6">العضو</TableHead><TableHead>الدور</TableHead><TableHead>الحالة</TableHead><TableHead>آخر نشاط</TableHead><TableHead className="pl-6"><span className="sr-only">إجراءات</span></TableHead></TableRow></TableHeader><TableBody>{data.members.map(member => <TableRow key={member.id}><TableCell className="pr-6"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{member.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><p className="font-medium text-ink">{member.name}</p><p className="mt-0.5 text-xs text-slate-500" dir="ltr">{member.email}</p></div></div></TableCell><TableCell><Badge variant="outline" className="bg-slate-50">{member.role}</Badge></TableCell><TableCell><Badge variant="outline" className={member.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-200 bg-sky-50 text-sky-700'}>{member.status === 'active' ? 'نشط' : 'دعوة'}</Badge></TableCell><TableCell className="text-xs text-slate-500">{formatDate(member.lastActive, true)}</TableCell><TableCell className="pl-6"><Button variant="ghost" size="icon" className="text-rose-600" aria-label={`إزالة ${member.name}`} onClick={() => setDeleteId(member.id)}><Trash2 /></Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

      <Card className="mt-6 border-slate-200/80 shadow-none"><CardHeader><CardTitle className="text-lg">سجل تدقيق الفريق</CardTitle><CardDescription>آخر العمليات المحفوظة في مساحة العمل</CardDescription></CardHeader><CardContent><div className="space-y-0">{data.activities.slice(0, 8).map(activity => <div key={activity.id} className="grid gap-2 border-b py-4 last:border-0 md:grid-cols-[180px_1fr_180px]"><span className="text-sm font-medium text-ink">{activity.action}</span><span className="text-sm leading-6 text-slate-600">{activity.detail}</span><span className="text-xs text-slate-400 md:text-left">{activity.actor} · {formatDate(activity.time, true)}</span></div>)}</div></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent dir="rtl"><DialogHeader><DialogTitle>دعوة عضو إلى الفريق</DialogTitle><DialogDescription>ستُحفظ الدعوة محليًا. ربط البريد والدعوات الفعلية يحتاج خدمة Backend لاحقًا.</DialogDescription></DialogHeader><form onSubmit={invite} className="space-y-4"><div className="space-y-2"><Label htmlFor="member-name">اسم العضو</Label><Input id="member-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="الاسم الكامل" className="h-11" /></div><div className="space-y-2"><Label htmlFor="member-email">البريد الإلكتروني</Label><Input id="member-email" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="name@company.com" className="h-11" dir="ltr" /></div><div className="space-y-2"><Label htmlFor="member-role">الدور</Label><select id="member-role" value={form.role} onChange={event => setForm({ ...form, role: event.target.value as TeamMember['role'] })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option>موظف</option><option>مشرف</option><option>مدير</option></select></div>{error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800"><Mail />حفظ الدعوة</Button></DialogFooter></form></DialogContent></Dialog>
      <AlertDialog open={Boolean(deleteId)} onOpenChange={value => !value && setDeleteId(null)}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>إزالة العضو؟</AlertDialogTitle><AlertDialogDescription>سيُزال العضو من قائمة الفريق على هذا المتصفح.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={remove}>إزالة</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}
