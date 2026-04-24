'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail, canLogin } from '@/lib/auth-mock'
import { getAuthorizedEmails } from '@/config/bedeles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!canLogin(email)) {
        setError('Email no autorizado. Contacta al administrador.')
        return
      }
      
      const user = loginWithEmail(email)
      if (user) {
        router.push('/dashboard')
      } else {
        setError('Error al iniciar sesión.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold">UTN Asistencia</CardTitle>
            <CardDescription>Sistema de gestión de asistencias</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email institucional
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="tu@universidad.edu.ar"
                required
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Ingresar'}
            </Button>
          </form>
          <div className="mt-6 p-3 bg-muted rounded-md">
            <p className="text-xs font-medium mb-2">Emails autorizados:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {getAuthorizedEmails().map((e) => (
                <li key={e} className="font-mono">{e}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
