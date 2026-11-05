import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowLeft, Database, FileText, Link2, Megaphone, Pause, Play, Plus, Send, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAppData } from '@/context/AppDataContext'
import { campaignStatusLabels, campaignTypeLabels, formatDate } from '@/lib/demo'
import { DemoNotice, MetricCard, PageHeader, PlatformBadge, StatusBadge } from '@/components/shared'

const weekly = [
  { day: 'السبت', sent: 86, success: 79 }, { day: 'الأحد', sent: 112, success: 101 },
  { day: 'الاثنين', sent: 74, success: 69 }, { day: 'الثلاثاء', sent: 136, success: 121 },
  { day: 'الأربعاء', sent: 118, success: 108 }, { day: 'الخميس', sent: 154, success: 139 },
  { day: 'الجمعة', sent: 62, success: 58 },
]
const pieColors = ['#0f766e', '#0284c7', '#d97706', '#64748b', '#94a3b8']

export default function Dashboard() {
  const { data, setData, addActivity } = useAppData()
  const navigate = useNavigate()
  const totalContacts = data.groups.reduce((sum, group) => sum + group.contacts.length, 0)
  const activeAccounts = data.accounts.filter(account => account.status === 'active').length
  const totalSuccess = data.campaigns.reduce((sum, campaign) => sum + campaign.stats.success, 0)
  const running = data.campaigns.filter(campaign => ['active', 'scheduled', 'paused'].includes(campaign.status))
  const statusData = useMemo(() => (['active', 'scheduled', 'paused', 'completed', 'draft'] as const).map(status => ({
    name: campaignStatusLabels[status], value: data.campaigns.filter(campaign => campaign.status === status).length,
  })).filter(item => item.value > 0), [data.campaigns])

  const toggleCampaign = (id: string) => {
    const campaign = data.campaigns.find(item => item.id === id)
    if (!campaign) return
    const nextStatus = campaign.status === 'active' ? 'paused' : 'active'
    setData(current => ({ ...current, campaigns: current.campaigns.map(item => item.id === id ? { ...item, status: nextStatus } : item) }))
    addActivity(nextStatus === 'paused' ? 'إيقاف حملة مؤقتًا' : 'استئناف حملة', campaign.name)
  }

  return (
    <>
      <PageHeader
        title="أهلًا أحمد، هذا ملخص العمل اليوم"
        description="تابع الحملات والحسابات والجمهور من مكان واحد، مع سجل واضح لكل إجراء يقوم به الفريق."
        actions={<Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => navigate('/campaigns?new=1')}><Plus />إنشاء حملة</Button>}
      />
      <DemoNotice>الأرقام والحملات هنا بيانات توضيحية لمراجعة تجربة العمل. لا يوجد اتصال أو إرسال فعلي لأي منصة.</DemoNotice>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="حملات قيد العمل" value={running.length} detail={`${data.campaigns.filter(c => c.status === 'scheduled').length} حملات مجدولة قادمة`} icon={<Megaphone className="size-5" />} />
        <MetricCard label="حسابات متصلة" value={`${activeAccounts}/${data.accounts.length}`} detail={`${data.accounts.filter(a => a.status === 'attention').length} حساب يحتاج إلى مراجعة`} icon={<Link2 className="size-5" />} />
        <MetricCard label="إجمالي الجمهور" value={totalContacts} detail={`${data.groups.length} مجموعات جهات اتصال`} icon={<Users className="size-5" />} />
        <MetricCard label="إجراءات ناجحة" value={totalSuccess} detail="ضمن الحملات التوضيحية الحالية" icon={<Send className="size-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <Card className="border-slate-200/80 shadow-none">
          <CardHeader><CardTitle className="text-lg">أداء الرسائل هذا الأسبوع</CardTitle><CardDescription>الرسائل المستهدفة مقارنة بالعمليات الناجحة</CardDescription></CardHeader>
          <CardContent className="h-72 pe-0 ps-2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barGap={3}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Sans Arabic' }} />
                <Bar name="المستهدفة" dataKey="sent" fill="#c7d2ce" radius={[5, 5, 0, 0]} maxBarSize={22} />
                <Bar name="الناجحة" dataKey="success" fill="#0f766e" radius={[5, 5, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-none">
          <CardHeader><CardTitle className="text-lg">توزيع حالات الحملات</CardTitle><CardDescription>لقطة مباشرة لمساحة العمل</CardDescription></CardHeader>
          <CardContent>
            <div className="h-44" dir="ltr"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" innerRadius={52} outerRadius={75} paddingAngle={3} stroke="none">{statusData.map((entry, index) => <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Sans Arabic' }} /></PieChart></ResponsiveContainer></div>
            <div className="mt-2 grid grid-cols-2 gap-3">{statusData.map((item, index) => <div key={item.name} className="flex items-center gap-2 text-sm"><span className="size-2.5 rounded-sm" style={{ background: pieColors[index % pieColors.length] }} /><span className="text-slate-500">{item.name}</span><span className="mr-auto font-semibold text-ink">{item.value}</span></div>)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <Card className="border-slate-200/80 shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-lg">الحملات الحالية</CardTitle><CardDescription className="mt-1.5">إدارة سريعة للحملات النشطة والمجدولة</CardDescription></div><Button variant="ghost" className="text-emerald-700" onClick={() => navigate('/campaigns')}>عرض الكل<ArrowLeft /></Button></CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pr-6">الحملة</TableHead><TableHead>المنصة</TableHead><TableHead>الحالة</TableHead><TableHead>التقدم</TableHead><TableHead className="pl-6"><span className="sr-only">إجراء</span></TableHead></TableRow></TableHeader>
              <TableBody>{running.map(campaign => <TableRow key={campaign.id}>
                <TableCell className="pr-6"><div className="max-w-56"><p className="truncate font-medium text-ink">{campaign.name}</p><p className="mt-1 text-xs text-slate-500">{campaignTypeLabels[campaign.type]}</p></div></TableCell>
                <TableCell><PlatformBadge platform={campaign.platform} /></TableCell>
                <TableCell><StatusBadge status={campaign.status} label={campaignStatusLabels[campaign.status]} /></TableCell>
                <TableCell><div className="flex min-w-24 items-center gap-2"><Progress value={campaign.progress} className="h-1.5" /><span className="text-xs text-slate-500">{campaign.progress}%</span></div></TableCell>
                <TableCell className="pl-6"><Button variant="ghost" size="icon" aria-label={campaign.status === 'active' ? `إيقاف ${campaign.name}` : `استئناف ${campaign.name}`} onClick={() => toggleCampaign(campaign.id)}>{campaign.status === 'active' ? <Pause /> : <Play />}</Button></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-none">
          <CardHeader><CardTitle className="text-lg">إجراءات سريعة</CardTitle><CardDescription>ابدأ المهام الأكثر استخدامًا</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="h-12 w-full justify-start" onClick={() => navigate('/extraction?new=1')}><Database className="text-emerald-700" />استخراج بيانات جديد</Button>
            <Button variant="outline" className="h-12 w-full justify-start" onClick={() => navigate('/content?new=1')}><FileText className="text-emerald-700" />إنشاء محتوى</Button>
            <Button variant="outline" className="h-12 w-full justify-start" onClick={() => navigate('/accounts?new=1')}><Link2 className="text-emerald-700" />إضافة حساب</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-slate-200/80 shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="size-5 text-emerald-700" />آخر نشاطات الفريق</CardTitle><CardDescription>سجل تدقيق واضح لكل تغيير</CardDescription></CardHeader>
        <CardContent><div className="space-y-0">{data.activities.slice(0, 5).map(activity => <div key={activity.id} className="flex gap-4 border-b py-4 last:border-0 last:pb-0 first:pt-0"><div className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-600" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{activity.action}</p><p className="mt-1 text-sm leading-6 text-slate-500">{activity.detail}</p></div><div className="shrink-0 text-left text-xs text-slate-400"><p>{activity.actor}</p><p className="mt-1">{formatDate(activity.time, true)}</p></div></div>)}</div></CardContent>
      </Card>
    </>
  )
}
