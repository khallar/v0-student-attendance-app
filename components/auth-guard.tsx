'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth-mock'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    const authed = isAuthenticated()
    setIsAuthed(authed)
    setIsChecking(false)
    
    if (!authed) {
      router.push('/login')
    }
  }, [router])

  if (isChecking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!isAuthed) {
    return null
  }

  return <>{children}</>
}
