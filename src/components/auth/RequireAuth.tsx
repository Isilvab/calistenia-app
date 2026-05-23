import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Login from '@/pages/Login'
import { Spinner } from '@/components/ui'

interface RequireAuthProps {
  children: ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { loading, session } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Spinner size={40}/>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return <>{children}</>
}
