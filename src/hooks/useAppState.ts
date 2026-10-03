import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from '../types'
import { loadState, saveState } from '../lib/storage'

export type Updater = (recipe: (state: AppState) => AppState) => void

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [saved, setSaved] = useState(true)
  const firstRender = useRef(true)

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
    return () => clearTimeout(timer)
  }, [state])

  const update = useCallback<Updater>((recipe) => {
    setState((prev) => recipe(prev))
  }, [])

  const replace = useCallback((next: AppState) => setState(next), [])

  return { state, update, replace, saved }
}
