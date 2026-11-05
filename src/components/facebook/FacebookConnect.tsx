import { useEffect, useState, type FormEvent } from 'react'
import { Check, Clipboard, ExternalLink, KeyRound, Settings, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { facebookApi, type FacebookConfig, type RealSocialAccount } from '@/lib/api'

export default function FacebookConnect({ onConnected }: { onConnected: (account: RealSocialAccount) => void }) {
  const [config, setConfig] = useState<FacebookConfig | null>(null)
  const [editing, setEditing] = useState(false)
  const [manual, setManual] = useState(false)
  const [form, setForm] = useState({ appId: '', appSecret: '', publicUrl: window.location.origin })
  const [accessToken, setAccessToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void facebookApi.config().then(value => {
      setConfig(value)
      setForm(current => ({ ...current, appId: value.appId, publicUrl: value.publicUrl || window.location.origin }))
      setEditing(!value.configured)
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'تعذر قراءة الإعدادات.'))
  }, [])

  const saveConfig = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const value = await facebookApi.saveConfig(form)
      setConfig(value); setEditing(false); setForm(current => ({ ...current, appSecret: '' }))
      toast.success('تم حفظ إعدادات Meta مشفّرة على الخادم')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الإعدادات.') } finally { setBusy(false) }
  }
  const connectToken = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const { account } = await facebookApi.connectToken(accessToken)
      setAccessToken(''); onConnected(account)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر التحقق من الرمز.') } finally { setBusy(false) }
  }
  const copyRedirect = async () => {
    if (!config?.redirectUri) return
    await navigator.clipboard.writeText(config.redirectUri)
    toast.success('تم نسخ رابط Callback')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><p>لا تدخل كلمة مرور فيسبوك هنا. الربط يتم عبر Facebook Login أو Access Token، وتُحفظ الرموز مشفّرة على الخادم المحلي.</p></div></div>
      {editing || !config?.configured ? <form onSubmit={saveConfig} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <div><h3 className="font-semibold text-ink">إعداد تطبيق Meta</h3><p className="mt-1 text-sm leading-6 text-slate-500">أنشئ تطبيقًا من Meta for Developers وأضف منتج Facebook Login. أدخل بياناته هنا لتفعيل الربط.</p></div>
        <div className="space-y-2"><Label htmlFor="meta-app-id">App ID</Label><Input id="meta-app-id" value={form.appId} onChange={event => setForm({ ...form, appId: event.target.value })} required className="h-11" dir="ltr" /></div>
        <div className="space-y-2"><Label htmlFor="meta-app-secret">App Secret</Label><Input id="meta-app-secret" type="password" value={form.appSecret} onChange={event => setForm({ ...form, appSecret: event.target.value })} required className="h-11" autoComplete="off" /></div>
        <div className="space-y-2"><Label htmlFor="meta-public-url">رابط الموقع العام</Label><Input id="meta-public-url" type="url" value={form.publicUrl} onChange={event => setForm({ ...form, publicUrl: event.target.value })} required className="h-11" dir="ltr" /><p className="text-xs leading-5 text-slate-500">استخدم HTTPS في الإنتاج. `http://localhost` أو `127.0.0.1` مناسب للاختبار المحلي فقط.</p></div>
        <Button type="submit" disabled={busy} className="h-11 w-full bg-emerald-700 text-white hover:bg-emerald-800"><Settings />{busy ? 'جاري الحفظ...' : 'حفظ إعدادات Meta'}</Button>
      </form> : <div className="space-y-4 rounded-lg border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-ink">تطبيق Meta جاهز</h3><p className="mt-1 text-sm text-slate-500">App ID: <span dir="ltr">{config.appId}</span></p></div><Button variant="ghost" size="sm" onClick={() => setEditing(true)}>تغيير الإعدادات</Button></div>
        <div className="space-y-2"><Label>Valid OAuth Redirect URI</Label><div className="flex gap-2"><Input value={config.redirectUri} readOnly className="h-11 text-xs" dir="ltr" /><Button type="button" variant="outline" size="icon" className="size-11 shrink-0" onClick={copyRedirect} aria-label="نسخ رابط Callback"><Clipboard /></Button></div><p className="text-xs leading-5 text-slate-500">انسخ هذا الرابط إلى إعدادات Facebook Login في تطبيق Meta.</p></div>
        <Button type="button" className="h-11 w-full bg-[#1877f2] text-white hover:bg-[#1465c0]" onClick={() => window.location.assign('/api/facebook/oauth/start')}><ExternalLink />بدء Facebook Login</Button>
      </div>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-700">{error}</p>}
      <div className="border-t pt-3"><button type="button" onClick={() => setManual(!manual)} className="flex min-h-11 w-full cursor-pointer items-center justify-between text-sm font-medium text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><span className="flex items-center gap-2"><KeyRound className="size-4" />لديك Access Token وتريد التحقق منه؟</span><span>{manual ? 'إخفاء' : 'إظهار'}</span></button>{manual && <form onSubmit={connectToken} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3"><div className="space-y-2"><Label htmlFor="facebook-access-token">Access Token</Label><Input id="facebook-access-token" type="password" value={accessToken} onChange={event => setAccessToken(event.target.value)} required minLength={20} autoComplete="off" className="h-11" dir="ltr" /></div><p className="text-xs leading-5 text-slate-500">سيتم استدعاء `/me` للتحقق من الهوية فقط، ثم تشفير الرمز على الخادم. لن يُحفظ في React أو localStorage.</p><Button type="submit" disabled={busy} variant="outline" className="h-11 w-full"><Check />{busy ? 'جاري التحقق...' : 'التحقق وربط الحساب'}</Button></form>}</div>
    </div>
  )
}
