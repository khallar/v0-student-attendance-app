'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getClaseByCode, getAlumnoEnrolledByDni, upsertAsistencia, isQRValid, getQRRemainingTime } from '@/lib/supabase/queries'
import { CheckCircle, AlertCircle, Loader, Clock } from 'lucide-react'

type Status = 'initial' | 'loading' | 'success' | 'error'

export default function AutoAsistenciaPage() {
  const params = useParams()
  const codigo = params.codigo as string
  const [clase, setClase] = useState<any>(null)
  const [dni, setDni] = useState('')
  const [status, setStatus] = useState<Status>('initial')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [qrExpired, setQrExpired] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  useEffect(() => {
    loadClase()
  }, [codigo])

  async function loadClase() {
    try {
      const data = await getClaseByCode(codigo)
      setClase(data)
      
      // Check if QR is valid
      if (!isQRValid(data.qr_activo_desde, data.qr_duracion_minutos)) {
        setQrExpired(true)
      } else {
        setRemainingTime(getQRRemainingTime(data.qr_activo_desde, data.qr_duracion_minutos))
      }
      
      setLoading(false)
    } catch (error) {
      setMessage('Código de autoasistencia inválido')
      setStatus('error')
      setLoading(false)
    }
  }

  // Update remaining time every second
  useEffect(() => {
    if (!clase || qrExpired) return
    
    const interval = setInterval(() => {
      const remaining = getQRRemainingTime(clase.qr_activo_desde, clase.qr_duracion_minutos)
      setRemainingTime(remaining)
      
      if (remaining <= 0) {
        setQrExpired(true)
        clearInterval(interval)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [clase, qrExpired])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!dni.trim() || !clase) return

    try {
      setStatus('loading')
      setMessage('')

      // Check if alumno exists AND is enrolled in this materia
      const alumno = await getAlumnoEnrolledByDni(clase.materia_id, dni)
      if (!alumno) {
        setStatus('error')
        setMessage('DNI no encontrado o no estás inscripto en esta materia')
        return
      }

      await upsertAsistencia(clase.id, alumno.id, 'presente')

      setStatus('success')
      setMessage(`Presente registrado para ${alumno.nombre} ${alumno.apellido}`)
      setDni('')

      setTimeout(() => {
        setStatus('initial')
        setMessage('')
      }, 5000)
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

  if (qrExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
            <div className="text-center">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-80" />
              <CardTitle className="text-2xl">Tiempo Expirado</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              El tiempo para registrar asistencia con este QR ha expirado.
            </p>
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Contacta al bedel para que registre tu asistencia manualmente.
              </AlertDescription>
            </Alert>
            <div className="pt-4 text-sm text-muted-foreground">
              <p>Materia: <span className="font-medium text-foreground">{clase?.materias?.nombre}</span></p>
              <p>Clase: {new Date(clase?.fecha).toLocaleDateString('es-AR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="text-center">
            <p className="text-sm text-blue-200 uppercase tracking-wide mb-1">AsistApp - Autoasistencia</p>
            <CardTitle className="text-2xl mb-2">{clase?.materias?.nombre}</CardTitle>
            <div className="text-blue-100 space-y-1">
              <p className="text-lg font-medium">
                {new Date(clase?.fecha).toLocaleDateString('es-AR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
              {clase?.horario && (
                <p className="text-xl font-bold">{clase.horario}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {remainingTime > 0 && (
            <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg ${
              remainingTime <= 60 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              <Clock className="h-5 w-5" />
              <span className="font-mono font-bold text-lg">
                {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-sm">restantes</span>
            </div>
          )}

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
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
              disabled={!dni || status === 'loading'}
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <Loader className="h-5 w-5 animate-spin" />
                  Registrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Dar Presente
                </span>
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>Codigo de clase: <span className="font-mono font-bold text-foreground">{clase?.codigo_autoasistencia}</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
