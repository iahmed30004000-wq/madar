import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { CheckCircle2, Link2, MoreHorizontal, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppData } from '@/context/AppDataContext'
import { facebookApi, type RealSocialAccount } from '@/lib/api'
import { formatDate, nowIso, platformLabels, uid } from '@/lib/demo'
import { cn } from '@/lib/utils'
import FacebookConnect from '@/components/facebook/FacebookConnect'
import { DemoNotice, EmptyState, PageHeader, PlatformBadge, PlatformIcon, StatusBadge } from '@/components/shared'
import type { AccountStatus, Platform, SocialAccount } from '@/types'

const statusLabels: Record<AccountStatus, string> = { active: 'متصل', attention: 'يحتاج مراجعة', offline: 'غير متصل' }

export default function Accounts() {
  const { data, setData, addActivity, refreshRealAccounts } = useAppData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'real' | 'demo'>('real')
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState<'all' | Platform>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pagesAccount, setPagesAccount] = useState<SocialAccount | null>(null)
  const [pages, setPages] = useState<Array<{ id: string; name: string; tasks: string[] }>>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [form, setForm] = useState<{ name: string; handle: string; platform: Platform }>({ name: '', handle: '', platform: 'facebook' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams.get('new') === '1') setOpen(true)
    if (searchParams.get('connected') === '1') {
      void refreshRealAccounts().then(() => toast.success('تم ربط حساب فيسبوك بنجاح'))
      setSearchParams({})
    }
    if (searchParams.get('oauthError')) {
      toast.error(searchParams.get('oauthError'))
      setSearchParams({})
    }
  }, [searchParams, refreshRealAccounts, setSearchParams])

  const changeOpen = (value: boolean) => { setOpen(value); if (!value) { setSearchParams({}); setError('') } }
  const accounts = useMemo(() => data.accounts.filter(account =>
    (platform === 'all' || account.platform === platform) && `${account.name} ${account.handle}`.toLowerCase().includes(query.toLowerCase()),
  ), [data.accounts, platform, query])

  const connected = (account: RealSocialAccount) => {
    setData(current => ({
      ...current,
      accounts: [...current.accounts.filter(item => item.id !== account.id), {
        id: account.id, name: account.name, handle: account.handle, platform: 'facebook',
        status: account.status, lastSync: account.lastSync, campaigns: 0,
        real: true, externalId: account.externalId, connectionType: 'official',
      }],
    }))
    addActivity('ربط حساب فيسبوك', account.name)
    toast.success('تم ربط حساب فيسبوك وحفظ الرمز مشفّرًا على الخادم')
    changeOpen(false)
  }

  const addAccount = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !form.handle.trim()) { setError('أدخل اسم الحساب والمعرف للمتابعة.'); return }
    const account: SocialAccount = { id: uid('acc'), ...form, name: form.name.trim(), handle: form.handle.trim(), status: 'active', lastSync: nowIso(), campaigns: 0, connectionType: 'demo' }
    setData(current => ({ ...current, accounts: [account, ...current.accounts] }))
    addActivity('إضافة حساب تجريبي', `${account.name} على ${platformLabels[account.platform]}`)
    toast.success('تمت إضافة الحساب التجريبي', { description: 'لم يتم الاتصال بالمنصة الخارجية.' })
    setForm({ name: '', handle: '', platform: 'facebook' }); changeOpen(false)
  }

  const refresh = async (account: SocialAccount) => {
    if (account.real) {
      try {
        const { account: verified } = await facebookApi.verify(account.id)
        setData(current => ({ ...current, accounts: current.accounts.map(item => item.id === verified.id ? { ...item, status: verified.status, lastSync: verified.lastSync } : item) }))
        toast.success('تم التحقق من الربط مع فيسبوك بنجاح')
      } catch (reason) {
        setData(current => ({ ...current, accounts: current.accounts.map(item => item.id === account.id ? { ...item, status: 'attention' } : item) }))
        toast.error(reason instanceof Error ? reason.message : 'فشل التحقق من الربط.')
      }
      return
    }
    setData(current => ({ ...current, accounts: current.accounts.map(item => item.id === account.id ? { ...item, lastSync: nowIso() } : item) }))
    toast.info('تم تحديث بيانات العرض فقط', { description: `لا يوجد فحص اتصال حقيقي مع ${platformLabels[account.platform]}.` })
  }

  const showPages = async (account: SocialAccount) => {
    setPagesAccount(account); setPages([]); setPagesLoading(true)
    try {
      const result = await facebookApi.pages(account.id)
      setPages(result.pages)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'تعذر جلب الصفحات.')
      setPagesAccount(null)
    } finally { setPagesLoading(false) }
  }

  const remove = async () => {
    if (!deleteId) return
    const account = data.accounts.find(item => item.id === deleteId)
    try {
      if (account?.real) await facebookApi.remove(account.id)
      setData(current => ({
        ...current,
        accounts: current.accounts.filter(item => item.id !== deleteId),
        campaigns: current.campaigns.map(campaign => ({ ...campaign, accountIds: campaign.accountIds.filter(id => id !== deleteId) })),
      }))
      if (account) addActivity(account.real ? 'حذف ربط حساب' : 'حذف حساب تجريبي', account.name)
      toast.success(account?.real ? 'تم حذف الربط والرمز المحلي' : 'تم حذف الحساب من مساحة العمل')
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'تعذر حذف الحساب.') }
    setDeleteId(null)
  }

  return (
    <>
      <PageHeader title="الحسابات" description="اربط حساباتك الرسمية أو أضف بيانات تجريبية لتصميم الحملات ومراجعتها." actions={<Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => setOpen(true)}><Plus />إضافة حساب</Button>} />
      <DemoNotice>الحسابات الموسومة «ربط فعلي» تستخدم API وخادمًا محليًا مشفّرًا. الحسابات التجريبية لا تتصل بأي منصة.</DemoNotice>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-sm"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث باسم الحساب أو المعرف..." className="h-11 bg-white pr-10" /></div>
        <div className="flex flex-wrap gap-2">{(['all', 'facebook', 'instagram', 'whatsapp', 'telegram'] as const).map(value => <button key={value} type="button" onClick={() => setPlatform(value)} className={cn('min-h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', platform === value ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>{value === 'all' ? 'كل المنصات' : platformLabels[value]}</button>)}</div>
      </div>
      {accounts.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{accounts.map(account => <Card key={account.id} className="border-slate-200/80 shadow-none transition-colors hover:border-slate-300">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><PlatformIcon platform={account.platform} className="size-5" /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-semibold text-ink">{account.name}</h3>{account.real && <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}</div><p className="mt-1 truncate text-sm text-slate-500" dir="ltr">{account.handle}</p></div>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`إجراءات ${account.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer" onSelect={() => refresh(account)}><RefreshCw />{account.real ? 'فحص الربط' : 'تحديث الحالة'}</DropdownMenuItem>{account.real && <DropdownMenuItem className="cursor-pointer" onSelect={() => showPages(account)}>عرض الصفحات</DropdownMenuItem>}<DropdownMenuItem className="cursor-pointer text-rose-600 focus:text-rose-600" onSelect={() => setDeleteId(account.id)}><Trash2 />{account.real ? 'حذف الربط' : 'حذف الحساب'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><PlatformBadge platform={account.platform} /><div className="flex items-center gap-2"><Badge variant="outline" className={account.real ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}>{account.real ? 'ربط فعلي' : 'تجريبي'}</Badge><StatusBadge status={account.status} label={statusLabels[account.status]} /></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm"><div><p className="text-slate-500">الحملات المرتبطة</p><p className="mt-1 font-semibold text-ink">{data.campaigns.filter(campaign => campaign.accountIds.includes(account.id)).length}</p></div><div><p className="text-slate-500">آخر تحديث</p><p className="mt-1 text-xs font-medium text-ink">{formatDate(account.lastSync, true)}</p></div></div>
          <div className="mt-5 flex gap-2"><Button variant="outline" className="h-10 flex-1" onClick={() => refresh(account)}><RefreshCw />{account.real ? 'فحص الربط' : 'تحديث حالة العرض'}</Button>{account.real && <Button variant="outline" className="h-10 flex-1" onClick={() => showPages(account)}>الصفحات</Button>}</div>
        </CardContent>
      </Card>)}</div> : <EmptyState title="لا توجد حسابات مطابقة" description="جرّب تغيير البحث أو المنصة، أو أضف حسابًا جديدًا إلى مساحة العمل." actionLabel="إضافة حساب" onAction={() => setOpen(true)} />}

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>إضافة حساب جديد</DialogTitle><DialogDescription>{form.platform === 'facebook' && mode === 'real' ? 'اربط فيسبوك بطريقة رسمية دون مشاركة كلمة المرور.' : 'أدخل بيانات تعريفية لتصميم مسار العمل.'}</DialogDescription></DialogHeader>
          {form.platform === 'facebook' && <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setMode('real')} className={cn('min-h-10 rounded-md text-sm font-medium', mode === 'real' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500')}>ربط حساب حقيقي</button><button type="button" onClick={() => setMode('demo')} className={cn('min-h-10 rounded-md text-sm font-medium', mode === 'demo' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500')}>بيانات تجريبية</button></div>}
          {form.platform === 'facebook' && mode === 'real' ? <FacebookConnect onConnected={connected} /> : <form onSubmit={addAccount} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="account-platform">المنصة</Label><select id="account-platform" value={form.platform} onChange={event => setForm({ ...form, platform: event.target.value as Platform })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">{Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="account-name">اسم الحساب</Label><Input id="account-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="مثال: متجر الأفق" className="h-11" /></div>
            <div className="space-y-2"><Label htmlFor="account-handle">المعرف أو رقم الحساب</Label><Input id="account-handle" value={form.handle} onChange={event => setForm({ ...form, handle: event.target.value })} placeholder="username أو رقم الهاتف" className="h-11" /></div>
            {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => changeOpen(false)}>إلغاء</Button><Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800"><Link2 />إضافة للبيئة التجريبية</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pagesAccount)} onOpenChange={value => !value && setPagesAccount(null)}><DialogContent><DialogHeader><DialogTitle>صفحات {pagesAccount?.name}</DialogTitle><DialogDescription>الصفحات التي أعادتها Meta. رموز الصفحات محفوظة على الخادم ولا تظهر هنا.</DialogDescription></DialogHeader>{pagesLoading ? <p className="py-8 text-center text-sm text-slate-500">جاري تحميل الصفحات...</p> : pages.length ? <div className="space-y-2">{pages.map(page => <div key={page.id} className="rounded-lg border p-3"><p className="font-medium text-ink">{page.name}</p><p className="mt-1 text-xs text-slate-500" dir="ltr">ID: {page.id}</p><p className="mt-2 text-xs text-slate-500">{page.tasks.length ? `الصلاحيات: ${page.tasks.join('، ')}` : 'لا توجد صلاحيات معروضة'}</p></div>)}</div> : <p className="py-8 text-center text-sm text-slate-500">لم ترجع Meta صفحات لهذا الحساب.</p>}</DialogContent></Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={value => !value && setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{data.accounts.find(item => item.id === deleteId)?.real ? 'حذف ربط الحساب؟' : 'حذف الحساب؟'}</AlertDialogTitle><AlertDialogDescription>سيُحذف الربط والرمز المحلي وتُزال علاقته بالحملات. لا يؤثر ذلك على الحساب الخارجي أو يُلغي الإذن من إعدادات فيسبوك.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-rose-600 text-white hover:bg-rose-700">تأكيد الحذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  )
}
