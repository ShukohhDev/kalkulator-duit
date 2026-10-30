let lockCount = 0
let originalOverflow = ''
let originalPaddingRight = ''

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {}

  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow
    originalPaddingRight = document.body.style.paddingRight
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }
    document.body.style.overflow = 'hidden'
  }
  lockCount++

  let unlocked = false
  return () => {
    if (unlocked) return
    unlocked = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }
}
