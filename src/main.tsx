import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from '@/store/authStore'
import { applyTheme, getStoredTheme } from '@/lib/theme'

// Apply stored theme before first render (backup for inline script in index.html)
applyTheme(getStoredTheme())

// Keep in sync when OS preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getStoredTheme() === 'system') applyTheme('system')
})

function Root() {
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init()
    return unsubscribe
  }, [])

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
