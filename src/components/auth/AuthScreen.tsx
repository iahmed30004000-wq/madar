import { useState, type FormEvent } from 'react'
import { LockKeyhole, Server, ShieldCheck, Waypoints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppData } from '@/context/AppDataContext'

export default function AuthScreen() {
  const { authState, authenticate } = useAppData()
  const setup = authState === 'setup'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (setup && !form.name.trim()) { setError('أدخل اسم المدير.'); return }
    if (!form.email.includes('@')) { setError('أدخل بريدًا إلكترونيًا صالحًا.'); return }
    if (form.password.length < 10) { setError('كلمة المرور يجب أن تكون 10 أحرف على الأقل.'); return }
    if (setup && form.password !== form.confirm) { setError('تأكيد كلمة المرور غير متطابق.'); return }
    setBusy(true)
    try {
      await authenticate(setup ? 'setup' : 'login', { name: form.name.trim(), email: form.email.trim(), password: form.password })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تسجيل الدخول.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div dir="rtl" className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#142725] p-4 text-foreground">
      <img src="/assets/generated/02-login-background.webp" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-35" />
      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl md:grid-cols-[0.85fr_1.15fr]">
        <div className="hidden bg-[#1b3531]/95 p-8 text-white md:block">
          <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-emerald-400 text-[#142725]"><Waypoints /></div><span className="text-2xl font-bold">مدار</span></div>
          <h2 className="mt-12 text-2xl font-bold leading-10">مساحة عمل فريقك، على خادمك أنت.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">حسابات وحملات وبيانات الفريق محفوظة في قاعدة SQLite على الخادم المحلي، وليست معتمدة على خدمة سحابية خارجية.</p>
          <div className="mt-8 space-y-4 text-sm text-slate-200"><div className="flex items-center gap-3"><ShieldCheck className="text-emerald-300" />جلسات HttpOnly وكلمات مرور مشفّرة</div><div className="flex items-center gap-3"><Server className="text-emerald-300" />قاعدة بيانات مملوكة لفريقك</div><div className="flex items-center gap-3"><LockKeyhole className="text-emerald-300" />رموز Meta لا تظهر في المتصفح</div></div>
        </div>
        <Card className="rounded-none border-0 shadow-none"><CardHeader className="p-6 pb-2 md:p-8"><CardTitle className="text-2xl">{setup ? 'إعداد مدير مساحة العمل' : 'تسجيل الدخول إلى مدار'}</CardTitle><CardDescription className="leading-6">{setup ? 'أنشئ الحساب الإداري الأول لبدء استخدام النظام بأمان.' : 'أدخل بيانات حسابك للوصول إلى مساحة العمل.'}</CardDescription></CardHeader><CardContent className="p-6 pt-4 md:p-8 md:pt-4">
          <form onSubmit={submit} className="space-y-4">
            {setup && <div className="space-y-2"><Label htmlFor="auth-name">اسم المدير</Label><Input id="auth-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} autoComplete="name" className="h-11" placeholder="الاسم الكامل" /></div>}
            <div className="space-y-2"><Label htmlFor="auth-email">البريد الإلكتروني</Label><Input id="auth-email" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} autoComplete="email" className="h-11" dir="ltr" placeholder="admin@company.com" /></div>
            <div className="space-y-2"><Label htmlFor="auth-password">كلمة المرور</Label><Input id="auth-password" type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} autoComplete={setup ? 'new-password' : 'current-password'} className="h-11" placeholder="10 أحرف على الأقل" /></div>
            {setup && <div className="space-y-2"><Label htmlFor="auth-confirm">تأكيد كلمة المرور</Label><Input id="auth-confirm" type="password" value={form.confirm} onChange={event => setForm({ ...form, confirm: event.target.value })} autoComplete="new-password" className="h-11" /></div>}
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-700">{error}</p>}
            <Button type="submit" disabled={busy} className="h-11 w-full bg-emerald-700 text-white hover:bg-emerald-800">{busy ? 'جاري التحقق...' : setup ? 'إنشاء المدير وبدء العمل' : 'تسجيل الدخول'}</Button>
          </form>
        </CardContent></Card>
      </div>
    </div>
  )
}
