import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from '../types'
import { loadState, saveState } from '../lib/storage'
import { MAX_ACTIVITY, diffActivity } from '../lib/activity'
import { currentUser } from '../lib/auth'
import { pushStateToCloud, pullStateFromCloud } from '../lib/cloudSync'
import { getSupabaseClient } from '../lib/supabase'

export type Updater = (recipe: (state: AppState) => AppState) => void
export type CloudStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'disabled'

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [saved, setSaved] = useState(true)
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const firstRender = useRef(true)
  const cloudDebounceRef = useRef<number | undefined>(undefined)

  const user = currentUser()

  // On mount: jika cloud aktif dan ada user, periksa apakah data cloud ada & lebih lengkap (misal login di HP)
  useEffect(() => {
    if (!user || !getSupabaseClient()) {
      setCloudStatus('disabled')
      return
    }

    let isMounted = true
    setCloudStatus('syncing')

    pullStateFromCloud(user)
      .then((res) => {
        if (!isMounted) return
        if (res.success && res.state) {
          const local = loadState()
          const isLocalEmpty =
            local.mode === null ||
            (local.expenses.length === 0 && local.incomes.length === 0 && local.allowance === 0)
          const cloudHasData =
            res.state.mode !== null ||
            res.state.expenses.length > 0 ||
            res.state.incomes.length > 0 ||
            res.state.allowance > 0

          const cloudHasMore =
            res.state.expenses.length > local.expenses.length ||
            res.state.incomes.length > local.incomes.length ||
            (res.state.activity?.length ?? 0) > (local.activity?.length ?? 0)

          if ((isLocalEmpty && cloudHasData) || cloudHasMore) {
            saveState(res.state)
            setState(res.state)
          }
          setCloudStatus('synced')
          if (res.updatedAt) setLastSyncTime(res.updatedAt)
        } else {
          // Belum ada data di cloud untuk user ini, unggah snapshot lokal awal
          pushStateToCloud(user, loadState()).then((pushRes) => {
            if (!isMounted) return
            if (pushRes.success) {
              setCloudStatus('synced')
              if (pushRes.updatedAt) setLastSyncTime(pushRes.updatedAt)
            } else {
              setCloudStatus('idle')
            }
          })
        }
      })
      .catch(() => {
        if (isMounted) setCloudStatus('idle')
      })

    return () => {
      isMounted = false
    }
  }, [user])

  // Simpan ke localStorage (350ms) & otomatis sinkron ke cloud (1200ms)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaved(false)
    const timer = setTimeout(() => {
      saveState(state)
      setSaved(true)
    }, 350)

    if (user && getSupabaseClient()) {
      window.clearTimeout(cloudDebounceRef.current)
      cloudDebounceRef.current = window.setTimeout(() => {
        setCloudStatus('syncing')
        pushStateToCloud(user, state)
          .then((res) => {
            if (res.success) {
              setCloudStatus('synced')
              if (res.updatedAt) setLastSyncTime(res.updatedAt)
            } else {
              setCloudStatus('error')
            }
          })
          .catch(() => {
            setCloudStatus('error')
          })
      }, 1200)
    }

    return () => {
      clearTimeout(timer)
      window.clearTimeout(cloudDebounceRef.current)
    }
  }, [state, user])

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!user || !getSupabaseClient()) return false
    setCloudStatus('syncing')
    const res = await pushStateToCloud(user, state)
    if (res.success) {
      setCloudStatus('synced')
      if (res.updatedAt) setLastSyncTime(res.updatedAt)
      return true
    }
    setCloudStatus('error')
    return false
  }, [user, state])

  const pullNow = useCallback(async (): Promise<boolean> => {
    if (!user || !getSupabaseClient()) return false
    setCloudStatus('syncing')
    const res = await pullStateFromCloud(user)
    if (res.success && res.state) {
      saveState(res.state)
      setState(res.state)
      setCloudStatus('synced')
      if (res.updatedAt) setLastSyncTime(res.updatedAt)
      return true
    }
    setCloudStatus('error')
    return false
  }, [user])

  const update = useCallback<Updater>((recipe) => {
    setState((prev) => {
      const next = recipe(prev)
      const added = diffActivity(prev, next)
      if (added.length === 0) return next
      return { ...next, activity: [...added, ...next.activity].slice(0, MAX_ACTIVITY) }
    })
  }, [])

  const replace = useCallback((next: AppState) => setState(next), [])

  return { state, update, replace, saved, cloudStatus, lastSyncTime, syncNow, pullNow }
}
