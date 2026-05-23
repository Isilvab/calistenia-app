import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// NOTE: On iOS Safari the browser already owns the left-edge swipe for native back.
// That native gesture usually takes priority, so this hook is most effective on
// Android or when the native gesture is disabled.  It is still registered so it
// fires on devices / contexts where the native gesture is absent.

const EDGE_THRESHOLD = 28  // px from left edge — must start inside this band
const MIN_SWIPE_X   = 60   // px minimum rightward travel to trigger
const MAX_SWIPE_Y   = 80   // px max vertical deviation before gesture is cancelled

export function useEdgeSwipeBack() {
  const navigate = useNavigate()

  useEffect(() => {
    let startX = 0
    let startY = 0
    let tracking = false

    const onTouchStart = (e: TouchEvent) => {
      // Only track touches that start in the left-edge band
      const t = e.touches[0]
      if (t && t.clientX <= EDGE_THRESHOLD) {
        startX = t.clientX
        startY = t.clientY
        tracking = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return
      const t = e.touches[0]
      if (!t) return
      const dx = t.clientX - startX
      const dy = Math.abs(t.clientY - startY)
      // Cancel if vertical movement dominates (user is scrolling, not swiping)
      if (dy > 40 && dy > dx) tracking = false
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - startX
      const dy = Math.abs(t.clientY - startY)
      if (dx >= MIN_SWIPE_X && dy <= MAX_SWIPE_Y) {
        navigate(-1)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchend',   onTouchEnd,   { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [navigate])
}
