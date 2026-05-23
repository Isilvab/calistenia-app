import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { resetStorage } from '@/lib/storage'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  init: () => () => void
  signInWithMagicLink: (email: string) => Promise<{ ok: boolean; error?: string }>
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  init() {
    supabase.auth.getSession().then(({ data }) => {
      set({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
      })
    })

    return () => subscription.unsubscribe()
  },

  async signInWithPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message.toLowerCase()
      const friendly = msg.includes('invalid') || msg.includes('credentials') || msg.includes('wrong')
        ? 'Email o contraseña incorrectos.'
        : msg.includes('email not confirmed')
          ? 'Confirmá tu email antes de ingresar.'
          : 'No se pudo iniciar sesión. Intentá de nuevo.'
      return { ok: false, error: friendly }
    }
    return { ok: true }
  },

  async signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  },

  async signOut() {
    await supabase.auth.signOut()
    resetStorage()
  },
}))
