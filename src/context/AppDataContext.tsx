import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { seedData } from '@/data/seed'
import type { Activity, AppData } from '@/types'
import { nowIso, uid } from '@/lib/demo'
import { authApi, workspaceApi, facebookApi, type ApiUser, type RealSocialAccount } from '@/lib/api'

const STORAGE_KEY = 'madar-workspace-v1'
type AuthState = 'loading' | 'setup' | 'login' | 'ready'

interface AppDataContextValue {
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
  addActivity: (action: string, detail: string, actor?: string) => void
  resetData: () => void
  authState: AuthState
  backendReady: boolean
  user: ApiUser | null
  authenticate: (mode: 'setup' | 'login', value: { name?: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refreshRealAccounts: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

function loadData(): AppData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...seedData, ...JSON.parse(saved) } as AppData
  } catch {
    // A damaged local draft must not block the workspace.
  }
  return structuredClone(seedData)
}

function withoutRealAccounts(data: AppData): AppData {
  return { ...data, accounts: data.accounts.filter(account => !account.real) }
}

function mergeRealAccounts(current: AppData, realAccounts: RealSocialAccount[]): AppData {
  const mapped = realAccounts.map(account => ({
    id: account.id, name: account.name, handle: account.handle, platform: 'facebook' as const,
    status: account.status, lastSync: account.lastSync, campaigns: 0,
    real: true, externalId: account.externalId, connectionType: 'official' as const,
  }))
  return { ...current, accounts: [...current.accounts.filter(account => !account.real), ...mapped] }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData)
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [backendReady, setBackendReady] = useState(false)
  const [user, setUser] = useState<ApiUser | null>(null)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshRealAccounts = useCallback(async () => {
    const { accounts } = await facebookApi.accounts()
    setData(current => mergeRealAccounts(current, accounts))
  }, [])

  const initialize = useCallback(async () => {
    setAuthState('loading')
    try {
      const status = await authApi.status()
      if (status.setupRequired) { setAuthState('setup'); return }
      if (!status.authenticated) { setAuthState('login'); return }
      setUser(status.user)
      const bootstrap = await workspaceApi.bootstrap()
      if (bootstrap.workspace) {
        setData(mergeRealAccounts({ ...seedData, ...bootstrap.workspace } as AppData, bootstrap.facebookAccounts))
      } else {
        setData(current => {
          const merged = mergeRealAccounts(current, bootstrap.facebookAccounts)
          void workspaceApi.save(withoutRealAccounts(merged)).catch(() => undefined)
          return merged
        })
      }
      setBackendReady(true)
      setAuthState('ready')
    } catch {
      setAuthState('login')
    }
  }, [])

  useEffect(() => { void initialize() }, [initialize])
  useEffect(() => {
    const unauthorized = () => { setBackendReady(false); setUser(null); setAuthState('login') }
    window.addEventListener('madar:unauthorized', unauthorized)
    return () => window.removeEventListener('madar:unauthorized', unauthorized)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    if (!backendReady) return
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      void workspaceApi.save(withoutRealAccounts(data)).catch(() => undefined)
    }, 450)
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current) }
  }, [data, backendReady])

  useEffect(() => {
    if (!backendReady) return
    const flush = () => {
      void fetch('/api/workspace', {
        method: 'PUT', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: withoutRealAccounts(data) }),
      })
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [data, backendReady])

  const authenticate = useCallback(async (mode: 'setup' | 'login', value: { name?: string; email: string; password: string }) => {
    if (mode === 'setup') await authApi.setup(value as { name: string; email: string; password: string })
    else await authApi.login(value)
    await initialize()
  }, [initialize])

  const logout = useCallback(async () => {
    await authApi.logout()
    setBackendReady(false); setUser(null); setData(structuredClone(seedData)); setAuthState('login')
  }, [])

  const value = useMemo<AppDataContextValue>(() => ({
    data,
    setData,
    addActivity: (action, detail, actor = user?.name?.split(' ')[0] || 'أحمد') => {
      const activity: Activity = { id: uid('act'), action, detail, actor, time: nowIso() }
      setData(current => ({ ...current, activities: [activity, ...current.activities].slice(0, 30) }))
    },
    resetData: () => setData(structuredClone(seedData)),
    authState,
    backendReady,
    user,
    authenticate,
    logout,
    refreshRealAccounts,
  }), [data, authState, backendReady, user, authenticate, logout, refreshRealAccounts])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used inside AppDataProvider')
  return context
}
