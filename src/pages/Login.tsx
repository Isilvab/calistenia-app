import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'password' | 'magic'
type UIState = 'idle' | 'enviando' | 'enviado' | 'error'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

const inputClass = 'w-full h-12 px-4 rounded-xl border border-[var(--line)] bg-white text-[var(--ink)] text-[15px] outline-none focus:border-[var(--ink)] transition-colors'

export default function Login() {
  const { signInWithMagicLink, signInWithPassword } = useAuth()

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [uiState, setUiState] = useState<UIState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const resetError = () => { if (uiState === 'error') setUiState('idle') }

  const switchMode = (next: Mode) => {
    setMode(next)
    setUiState('idle')
    setErrorMsg('')
  }

  const handlePassword = async () => {
    if (!isValidEmail(email)) { setErrorMsg('Ingresá un email válido.'); setUiState('error'); return }
    if (!password.trim()) { setErrorMsg('Ingresá tu contraseña.'); setUiState('error'); return }
    setUiState('enviando')
    const result = await signInWithPassword(email.trim(), password)
    if (!result.ok) { setErrorMsg(result.error ?? 'Error desconocido'); setUiState('error') }
    // En éxito: onAuthStateChange actualiza sesión → RequireAuth deja pasar automáticamente
  }

  const handleMagicLink = async () => {
    if (!isValidEmail(email)) { setErrorMsg('Ingresá un email válido.'); setUiState('error'); return }
    setUiState('enviando')
    const result = await signInWithMagicLink(email.trim())
    if (result.ok) { setUiState('enviado') }
    else { setErrorMsg(result.error ?? 'Error desconocido'); setUiState('error') }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium mb-1">Bienvenido</div>
          <div className="text-[28px] font-semibold tracking-tight text-[var(--ink)]">Calisteniapp</div>
        </div>

        <div className="card flex flex-col gap-4">

          {/* Mode selector */}
          <div className="flex gap-1 p-1 bg-[var(--bg)] rounded-xl">
            {([['password', 'Contraseña'], ['magic', 'Enlace mágico']] as [Mode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`press flex-1 h-9 rounded-lg text-[13px] font-medium transition-colors ${
                  mode === m
                    ? 'bg-white text-[var(--on-light)] shadow-sm'
                    : 'text-[var(--muted)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Magic link — enviado */}
          {mode === 'magic' && uiState === 'enviado' ? (
            <div className="text-center py-2">
              <div className="text-2xl mb-3">📬</div>
              <div className="text-[15px] font-medium text-[var(--ink)]">Revisá tu correo</div>
              <div className="text-sm text-[var(--muted)] mt-1">
                Te enviamos un enlace para entrar. Puede tardar unos segundos.
              </div>
              <button
                className="press mt-4 text-xs text-[var(--muted)] underline underline-offset-2"
                onClick={() => { setUiState('idle'); setEmail('') }}
              >
                Usar otro email
              </button>
            </div>
          ) : (
            <>
              {/* Email */}
              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 font-medium uppercase tracking-wide block">Email</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); resetError() }}
                  onKeyDown={(e) => { if (e.key === 'Enter') void (mode === 'password' ? handlePassword() : handleMagicLink()) }}
                  className={inputClass}
                />
              </div>

              {/* Password (solo en modo contraseña) */}
              {mode === 'password' && (
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 font-medium uppercase tracking-wide block">Contraseña</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); resetError() }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handlePassword() }}
                    className={inputClass}
                  />
                </div>
              )}

              {/* Error */}
              {uiState === 'error' && (
                <div className="text-xs text-red-500 -mt-2">{errorMsg}</div>
              )}

              {/* Submit */}
              <button
                className={`press w-full h-12 rounded-xl font-semibold text-[15px] transition-colors ${
                  uiState === 'enviando'
                    ? 'bg-[var(--ink)]/60 text-[var(--bg)] cursor-not-allowed'
                    : 'bg-[var(--ink)] text-[var(--bg)]'
                }`}
                onClick={() => { void (mode === 'password' ? handlePassword() : handleMagicLink()) }}
                disabled={uiState === 'enviando'}
              >
                {uiState === 'enviando'
                  ? 'Entrando…'
                  : mode === 'password' ? 'Entrar' : 'Enviar enlace mágico'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
