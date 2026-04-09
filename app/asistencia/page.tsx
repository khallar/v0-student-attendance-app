'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth-guard'
import { AsistenciaGrid } from '@/components/asistencia-grid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  getClasesByMateria, 
  getMaterias, 
  getAlumnosByMateria,
  getAsistenciasByClase,
  upsertAsistencia,
  createClase,
  getClaseById
} from '@/lib/supabase/queries'
import { formatDateShort } from '@/lib/utils-attendance'
import { ArrowLeft, Download, Plus, Save } from 'lucide-react'
import Link from 'next/link'

export default function AsistenciaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const materiaIdParam = searchParams.get('materia')
  const claseIdParam = searchParams.get('clase')

  const [materias, setMaterias] = useState<any[]>([])
  const [clases, setClases] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [asistencias, setAsistencias] = useState<Record<string, string>>({})

  const [selectedMateria, setSelectedMateria] = useState(materiaIdParam || '')
  const [selectedClase, setSelectedClase] = useState(claseIdParam || '')
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creatingClase, setCreatingClase] = useState(false)

  // Load materias on mount
  useEffect(() => {
    loadMaterias()
  }, [])

  // Load clases when materia changes
  useEffect(() => {
    if (selectedMateria) {
      loadClases(selectedMateria)
      loadAlumnos(selectedMateria)
    }
  }, [selectedMateria])

  // Load asistencias when clase changes
  useEffect(() => {
    if (selectedClase && selectedMateria) {
      loadAsistencias(selectedClase)
    }
  }, [selectedClase, selectedMateria])

  async function loadMaterias() {
    try {
      setLoading(true)
      const data = await getMaterias()
      setMaterias(data)
      if (materiaIdParam) {
        setSelectedMateria(materiaIdParam)
      }
    } catch (error) {
      console.error('Error loading materias:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadClases(materiaId: string) {
    try {
      const data = await getClasesByMateria(materiaId)
      setClases(data)
      if (claseIdParam && data.find((c: any) => c.id === claseIdParam)) {
        setSelectedClase(claseIdParam)
      }
    } catch (error) {
      console.error('Error loading clases:', error)
    }
  }

  async function loadAlumnos(materiaId: string) {
    try {
      const data = await getAlumnosByMateria(materiaId)
      setAlumnos(data)
      // Initialize asistencias to ausente
      const newAsistencias: Record<string, string> = {}
      data.forEach((alumno: any) => {
        newAsistencias[alumno.id] = 'ausente'
      })
      setAsistencias(newAsistencias)
    } catch (error) {
      console.error('Error loading alumnos:', error)
    }
  }

  async function loadAsistencias(claseId: string) {
    try {
      const data = await getAsistenciasByClase(claseId)
      const newAsistencias: Record<string, string> = {}
      alumnos.forEach((alumno: any) => {
        const asistencia = data.find((a: any) => a.alumno_id === alumno.id)
        newAsistencias[alumno.id] = asistencia?.estado || 'ausente'
      })
      setAsistencias(newAsistencias)
    } catch (error) {
      console.error('Error loading asistencias:', error)
    }
  }

  async function handleCreateClase() {
    if (!selectedMateria) return
    try {
      setCreatingClase(true)
      const now = new Date()
      const fecha = now.toISOString()
      await createClase(selectedMateria, fecha)
      await loadClases(selectedMateria)
    } catch (error) {
      console.error('Error creating clase:', error)
    } finally {
      setCreatingClase(false)
    }
  }

  async function handleSaveAsistencias() {
    if (!selectedClase || !selectedMateria) return
    try {
      setSaving(true)
      // Save all asistencias
      for (const [alumnoId, estado] of Object.entries(asistencias)) {
        await upsertAsistencia(selectedClase, alumnoId, estado)
      }
    } catch (error) {
      console.error('Error saving asistencias:', error)
    } finally {
      setSaving(false)
    }
  }

  function handleAsistenciaChange(alumnoId: string, estado: string) {
    setAsistencias(prev => ({
      ...prev,
      [alumnoId]: estado
    }))
  }

  function handleMarcaRapida(estado: string) {
    const newAsistencias: Record<string, string> = {}
    alumnos.forEach((alumno: any) => {
      newAsistencias[alumno.id] = estado
    })
    setAsistencias(newAsistencias)
  }

  const currentClase = clases.find((c: any) => c.id === selectedClase)
  const currentMateria = materias.find((m: any) => m.id === selectedMateria)

  return (
    <AuthGuard>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tomar Asistencia</h1>
            <p className="text-muted-foreground">Rápido y simple para la clase</p>
          </div>
        </div>

        <Card className="mb-8 p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Seleccionar Materia */}
            <div>
              <label className="block text-sm font-medium mb-2">Materia</label>
              <Select value={selectedMateria} onValueChange={setSelectedMateria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar materia..." />
                </SelectTrigger>
                <SelectContent>
                  {materias.map((materia) => (
                    <SelectItem key={materia.id} value={materia.id}>
                      {materia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleccionar Clase */}
            <div>
              <label className="block text-sm font-medium mb-2">Clase</label>
              <Select value={selectedClase} onValueChange={setSelectedClase}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar clase..." />
                </SelectTrigger>
                <SelectContent>
                  {clases.map((clase) => (
                    <SelectItem key={clase.id} value={clase.id}>
                      {formatDateShort(clase.fecha)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botón crear clase */}
            <div className="flex items-end">
              <Button 
                onClick={handleCreateClase} 
                disabled={!selectedMateria || creatingClase}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva clase
              </Button>
            </div>
          </div>
        </Card>

        {selectedClase && alumnos.length > 0 && (
          <>
            <Card className="mb-6">
              <div className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{currentMateria?.nombre}</h2>
                    <p className="text-sm text-muted-foreground">
                      {alumnos.length} alumnos - {formatDateShort(currentClase?.fecha)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMarcaRapida('presente')}
                    >
                      Marcar todos Presente
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMarcaRapida('ausente')}
                    >
                      Marcar todos Ausente
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="mb-8">
              <div className="p-6">
                <AsistenciaGrid
                  alumnos={alumnos}
                  asistencias={asistencias}
                  onAsistenciaChange={handleAsistenciaChange}
                  loading={loading}
                />
              </div>
            </Card>

            <div className="flex gap-2">
              <Button 
                onClick={handleSaveAsistencias}
                disabled={saving}
                size="lg"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar Asistencias'}
              </Button>
              <Button variant="outline" size="lg">
                <Download className="mr-2 h-4 w-4" />
                Descargar Reporte
              </Button>
            </div>
          </>
        )}

        {!selectedClase && selectedMateria && (
          <Card className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Selecciona una clase o crea una nueva</p>
              <Button onClick={handleCreateClase}>
                <Plus className="mr-2 h-4 w-4" />
                Crear nueva clase
              </Button>
            </div>
          </Card>
        )}

        {!selectedMateria && (
          <Card className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Selecciona una materia para comenzar</p>
          </Card>
        )}
      </div>
    </AuthGuard>
  )
}
