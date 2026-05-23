import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      session: s.session,
      user: s.user,
      loading: s.loading,
      signInWithMagicLink: s.signInWithMagicLink,
      signInWithPassword: s.signInWithPassword,
      signOut: s.signOut,
    }))
  )
}
