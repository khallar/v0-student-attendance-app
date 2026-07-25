'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth-mock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Logo } from '@/components/logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await login(email, password)
      if (user) {
        router.push('/dashboard')
      } else {
        setError('Email o contraseña incorrectos.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Error al iniciar sesión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold">AsistApp</CardTitle>
            <CardDescription>Sistema de control de asistencia</CardDescription>
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
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
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
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-3">Acerca de AsistApp</p>
            <p className="text-xs text-blue-800 leading-relaxed mb-3">
              AsistApp es un sistema integral de control y gestión de asistencia de alumnos. Diseñado para facilitar la toma de asistencia mediante código QR de autoasistencia, generación automática de reportes y análisis de estadísticas en tiempo real.
            </p>
            <p className="text-xs text-blue-700 font-medium">
              Desarrollado por <span className="font-bold">Karim</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
