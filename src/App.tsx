import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import AppLayout from '@/components/layout/AppLayout'
import AuthScreen from '@/components/auth/AuthScreen'
import { AppDataProvider, useAppData } from '@/context/AppDataContext'
import Inbox from '@/pages/Inbox'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Accounts = lazy(() => import('@/pages/Accounts'))
const Contacts = lazy(() => import('@/pages/Contacts'))
const ContentLibrary = lazy(() => import('@/pages/ContentLibrary'))
const Campaigns = lazy(() => import('@/pages/Campaigns'))
const Extraction = lazy(() => import('@/pages/Extraction'))
const Automation = lazy(() => import('@/pages/Automation'))
const Team = lazy(() => import('@/pages/Team'))
const Settings = lazy(() => import('@/pages/Settings'))

function AppContent() {
  const { authState } = useAppData()
  if (authState === 'loading') return <div className="flex min-h-[100dvh] items-center justify-center bg-paper" role="status"><span className="rounded-lg bg-white px-4 py-3 text-sm text-slate-500">جاري الاتصال بالخادم المحلي...</span></div>
  if (authState === 'setup' || authState === 'login') return <AuthScreen />
  return (
    <Suspense fallback={<div className="flex min-h-72 items-center justify-center" role="status"><span className="rounded-lg bg-white px-4 py-3 text-sm text-slate-500">جاري تحميل الصفحة...</span></div>}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="content" element={<ContentLibrary />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="extraction" element={<Extraction />} />
          <Route path="automation" element={<Automation />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="team" element={<Team />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return <AppDataProvider><AppContent /></AppDataProvider>
}
