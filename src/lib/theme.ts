export type ThemeName = 'light' | 'dark' | 'system'

export function applyTheme(tema: ThemeName): void {
  const isDark =
    tema === 'dark' ||
    (tema === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  // Kill all transitions before toggling so nothing animates mid-switch
  document.documentElement.classList.add('no-transition')
  document.documentElement.classList.toggle('dark', isDark)
  // Two rAFs: first lets the class paint, second lets the browser composite — then re-enable
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transition')
    })
  })
  try { localStorage.setItem('calisteniapp::ui:theme', tema) } catch { /* ignore */ }
}

export function getStoredTheme(): ThemeName {
  try {
    const t = localStorage.getItem('calisteniapp::ui:theme')
    if (t === 'light' || t === 'dark' || t === 'system') return t
  } catch { /* ignore */ }
  return 'system'
}
