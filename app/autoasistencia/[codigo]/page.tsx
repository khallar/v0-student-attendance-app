'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getClaseByCode, getAlumnoByDni, upsertAsistencia } from '@/lib/supabase/queries'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'

type Status = 'initial' | 'loading' | 'success' | 'error'

export default function AutoAsistenciaPage() {
  const params = useParams()
  const codigo = params.codigo as string
  const [clase, setClase] = useState<any>(null)
  const [dni, setDni] = useState('')
  const [status, setStatus] = useState<Status>('initial')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClase()
  }, [codigo])

  async function loadClase() {
    try {
      const data = await getClaseByCode(codigo)
      setClase(data)
      setLoading(false)
    } catch (error) {
      setMessage('Código de autoasistencia inválido')
      setStatus('error')
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!dni.trim()) return

    try {
      setStatus('loading')
      setMessage('')

      const alumno = await getAlumnoByDni(dni)
      if (!alumno) {
        setStatus('error')
        setMessage('DNI no encontrado en el sistema')
        return
      }

      await upsertAsistencia(clase.id, alumno.id, 'PRESENTE')

      setStatus('success')
      setMessage(`¡Presente registrado! ${alumno.nombre} ${alumno.apellido}`)
      setDni('')

      setTimeout(() => {
        setStatus('initial')
        setMessage('')
      }, 3000)
    } catch (error) {
      setStatus('error')
      setMessage('Error al registrar asistencia. Intenta nuevamente.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex justify-center py-8">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error' && !clase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardTitle className="text-2xl">Autoasistencia</CardTitle>
          <CardDescription className="text-blue-100">
            {clase?.materias?.nombre}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {status === 'success' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}

          {status === 'error' && message && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="dni" className="text-sm font-medium block mb-2">
                Ingresa tu DNI
              </label>
              <Input
                id="dni"
                type="text"
                inputMode="numeric"
                placeholder="12345678"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                disabled={status === 'loading'}
                className="text-center text-lg"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={!dni || status === 'loading'}
            >
              {status === 'loading' ? 'Registrando...' : 'Registrar Presente'}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>Código de clase: <span className="font-mono font-bold">{clase?.codigo_autoasistencia}</span></p>
            <p>Fecha: {new Date(clase?.fecha).toLocaleDateString('es-AR')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
