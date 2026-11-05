import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import {
  Bell, Bot, ChevronDown, FileText, LayoutDashboard, Link2, Megaphone, Menu,
  MessageSquare, Plus, Search, Settings, Sparkles, UserCog, Users, Waypoints,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/sonner'
import AssistantPanel from '@/components/assistant/AssistantPanel'
import { useAppData } from '@/context/AppDataContext'
import { cn } from '@/lib/utils'
import { campaignTypeLabels } from '@/lib/demo'

const navigation = [
  { label: 'الرئيسية', path: '/', icon: LayoutDashboard },
  { label: 'الحسابات والصفحات', path: '/accounts', icon: Link2 },
  { label: 'المحادثات', path: '/inbox', icon: MessageSquare },
  { label: 'الحملات', path: '/campaigns', icon: Megaphone },
  { label: 'مكتبة المحتوى', path: '/content', icon: FileText },
  { label: 'الجمهور', path: '/contacts', icon: Users },
  { label: 'الأتمتة', path: '/automation', icon: Bot },
  { label: 'الإعدادات', path: '/settings', icon: Settings },
]
const utilityNavigation = [
  { label: 'استخراج البيانات', path: '/extraction', icon: Search },
  { label: 'الفريق والصلاحيات', path: '/team', icon: UserCog },
]
const pageTitles: Record<string, string> = Object.fromEntries([...navigation, ...utilityNavigation].map(item => [item.path, item.label]))

function Brand() {
  const { data } = useAppData()
  return (
    <div className="flex items-center gap-3">
      <div className="islamic-mark flex size-11 shrink-0 items-center justify-center bg-emerald-400 text-[#102f2b]"><Waypoints className="size-5" strokeWidth={2.2} /></div>
      <div className="min-w-0"><div className="text-2xl font-bold tracking-tight text-white">مدار</div><div className="truncate text-[11px] text-emerald-100/60">{data.workspaceName}</div></div>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const go = (path: string) => { navigate(path); onNavigate?.() }
  return (
    <div className="islamic-sidebar flex h-full flex-col bg-[#102f2b]">
      <div className="flex h-24 items-center border-b border-white/10 px-5"><Brand /></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="التنقل الرئيسي">
        {navigation.map(item => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return <button key={item.path} type="button" onClick={() => go(item.path)} aria-current={active ? 'page' : undefined} className={cn('flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-right text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400', active ? 'bg-emerald-400 text-[#102f2b]' : 'text-emerald-50/75 hover:bg-white/7 hover:text-white')}>
            <Icon className="size-[18px] shrink-0" /><span>{item.label}</span>{active && <span className="mr-auto size-1.5 rounded-full bg-[#102f2b]" />}
          </button>
        })}
      </nav>
      <div className="m-3 rounded-2xl border border-emerald-200/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-300"><span className="size-2 rounded-full bg-emerald-400" />الخادم متصل</div>
        <p className="mt-2 text-[11px] leading-5 text-emerald-100/55">بيانات فريقك محفوظة في SQLite على خادمك، وليست عرضًا سحابيًا.</p>
      </div>
    </div>
  )
}

interface SearchResult { title: string; subtitle: string; path: string }

export default function AppLayout() {
  const { data, user, logout } = useAppData()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [notificationsRead, setNotificationsRead] = useState(false)

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  useEffect(() => {
    const openAssistant = () => setAssistantOpen(true)
    window.addEventListener('madar:assistant', openAssistant)
    return () => window.removeEventListener('madar:assistant', openAssistant)
  }, [])

  const notifications = useMemo(() => [
    ...data.accounts.filter(account => account.status === 'attention').map(account => ({ id: `account-${account.id}`, title: 'حساب يحتاج مراجعة', detail: `راجع الاتصال بحساب ${account.name}`, path: '/accounts' })),
    ...data.campaigns.filter(campaign => campaign.status === 'scheduled').map(campaign => ({ id: `campaign-${campaign.id}`, title: 'حملة مجدولة', detail: campaign.name, path: '/campaigns' })),
  ], [data.accounts, data.campaigns])

  const results = useMemo<SearchResult[]>(() => {
    const all: SearchResult[] = [
      ...[...navigation, ...utilityNavigation].map(item => ({ title: item.label, subtitle: 'الانتقال إلى صفحة', path: item.path })),
      ...data.campaigns.map(item => ({ title: item.name, subtitle: `حملة · ${campaignTypeLabels[item.type]}`, path: '/campaigns' })),
      ...data.accounts.map(item => ({ title: item.name, subtitle: `حساب · ${item.handle}`, path: '/accounts' })),
      ...data.groups.map(item => ({ title: item.name, subtitle: `مجموعة جمهور · ${item.contacts.length} جهة`, path: '/contacts' })),
      ...data.contents.map(item => ({ title: item.title, subtitle: 'محتوى محفوظ', path: '/content' })),
    ]
    const normalized = query.trim().toLowerCase()
    return (normalized ? all.filter(item => `${item.title} ${item.subtitle}`.toLowerCase().includes(normalized)) : all).slice(0, 10)
  }, [data, query])

  const go = (path: string) => { navigate(path); setSearchOpen(false); setQuery('') }

  return (
    <div className="min-h-[100dvh] bg-paper text-foreground">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 lg:block"><SidebarContent /></aside>
      <div className="min-h-[100dvh] lg:mr-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-emerald-900/10 bg-[#f7faf8]/95 px-3 backdrop-blur md:h-20 md:gap-3 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="فتح القائمة"><Menu /></Button></SheetTrigger>
            <SheetContent side="right" className="w-72 border-0 p-0" aria-describedby="mobile-nav-description">
              <SheetHeader className="sr-only"><SheetTitle>قائمة التنقل</SheetTitle><SheetDescription id="mobile-nav-description">التنقل بين أقسام مساحة العمل</SheetDescription></SheetHeader>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="hidden min-w-0 md:block"><p className="truncate text-sm font-semibold text-ink">{pageTitles[location.pathname] ?? 'مدار'}</p><p className="mt-0.5 text-[11px] text-slate-500">خطوة واضحة، ثم الخطوة التالية</p></div>
          <button type="button" onClick={() => setSearchOpen(true)} className="flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-3 text-right text-sm text-slate-500 transition-colors hover:border-emerald-700/30 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 md:mr-auto md:max-w-sm">
            <Search className="size-4 shrink-0" /><span className="truncate">بحث في مساحة العمل...</span><kbd className="mr-auto hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400 md:inline">Ctrl K</kbd>
          </button>
          <Button variant="outline" className="h-11 border-emerald-700/25 bg-emerald-50 px-3 text-emerald-900 hover:bg-emerald-100" onClick={() => setAssistantOpen(true)} aria-label="فتح وكيل مدار"><Sparkles className="size-4" /><span className="hidden md:inline">وكيل مدار</span></Button>
          <Button className="hidden h-11 bg-emerald-700 px-4 text-white hover:bg-emerald-800 md:inline-flex" onClick={() => navigate('/campaigns?new=1')}><Plus />حملة جديدة</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative size-11" aria-label="الإشعارات"><Bell />{!notificationsRead && notifications.length > 0 && <span className="absolute left-2 top-2 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white">{notifications.length}</span>}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between"><span>الإشعارات الفعلية</span>{notifications.length > 0 && <button type="button" onClick={() => setNotificationsRead(true)} className="cursor-pointer text-xs font-normal text-emerald-700 hover:underline">تحديد الكل كمقروء</button>}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length ? notifications.map(item => <DropdownMenuItem key={item.id} className="flex cursor-pointer flex-col items-start gap-1 py-3" onSelect={() => navigate(item.path)}><span className="font-medium">{item.title}</span><span className="text-xs text-slate-500">{item.detail}</span></DropdownMenuItem>) : <div className="px-3 py-6 text-center text-sm text-slate-500">لا توجد حسابات متعثرة أو حملات مجدولة.</div>}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-11 gap-2 px-2" aria-label="قائمة المستخدم"><span className="flex size-8 items-center justify-center rounded-full bg-[#dcebe4] text-xs font-bold text-emerald-800">{user?.name?.split(' ').map(part => part[0]).slice(0, 2).join('') || 'م'}</span><span className="hidden text-sm font-medium md:inline">{user?.name?.split(' ')[0] || 'مستخدم'}</span><ChevronDown className="size-3.5 text-slate-400" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{user?.email || 'حساب مساحة العمل'}</DropdownMenuLabel><DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate('/team')}>الفريق والصلاحيات</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate('/settings')}>إعدادات مساحة العمل</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-rose-600 focus:text-rose-600" onSelect={() => { void logout() }}>تسجيل الخروج</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8"><Outlet /></main>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="sr-only"><DialogTitle>البحث في مساحة العمل</DialogTitle><DialogDescription>ابحث عن صفحة أو حملة أو حساب أو مجموعة</DialogDescription></DialogHeader>
          <div className="flex items-center gap-2 border-b px-4 py-3"><Search className="size-5 text-slate-400" /><Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="اكتب للبحث..." className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0" /></div>
          <div className="max-h-80 overflow-y-auto p-2">{results.length ? results.map((result, index) => <button key={`${result.path}-${result.title}-${index}`} type="button" onClick={() => go(result.path)} className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-right transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{result.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{result.subtitle}</span></span><span className="text-xs text-slate-400">انتقال</span></button>) : <p className="p-8 text-center text-sm text-slate-500">لا توجد نتائج مطابقة</p>}</div>
        </DialogContent>
      </Dialog>
      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />
      <Toaster position="bottom-left" closeButton />
    </div>
  )
}
