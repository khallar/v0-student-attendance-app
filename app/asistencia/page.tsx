'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMaterias, getClasesByMateria, getAlumnosByMateria, getAsistenciasByClase, upsertAsistencia, createClase } from '@/lib/supabase/queries'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Save } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type AsistenciaEstado = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO' | 'TARDANZA'

interface Alumno {
  id: string
  nombre: string
  apellido: string
  dni: string
  email: string
}

interface AsistenciaRow {
  alumnoId: string
  alumno: Alumno
  estado: AsistenciaEstado | null
}

export default function AsistenciaPage() {
  const [materias, setMaterias] = useState<any[]>([])
  const [selectedMateria, setSelectedMateria] = useState<string>('')
  const [clases, setClases] = useState<any[]>([])
  const [selectedClase, setSelectedClase] = useState<string>('')
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [asistencias, setAsistencias] = useState<Map<string, AsistenciaEstado>>(new Map())
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMaterias()
  }, [])

  useEffect(() => {
    if (selectedMateria) {
      loadClasesAndAlumnos()
    }
  }, [selectedMateria])

  useEffect(() => {
    if (selectedClase) {
      loadAsistencias()
    }
  }, [selectedClase])

  async function loadMaterias() {
    try {
      setLoading(true)
      const data = await getMaterias()
      setMaterias(data)
    } catch (error) {
      console.error('Error loading materias:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadClasesAndAlumnos() {
    try {
      setLoading(true)
      const clasesData = await getClasesByMateria(selectedMateria)
      setClases(clasesData)
      const alumnosData = await getAlumnosByMateria(selectedMateria)
      setAlumnos(alumnosData)
      setSelectedClase('')
      setAsistencias(new Map())
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAsistencias() {
    try {
      const data = await getAsistenciasByClase(selectedClase)
      const map = new Map<string, AsistenciaEstado>()
      data.forEach((a: any) => {
        map.set(a.alumno_id, a.estado as AsistenciaEstado)
      })
      setAsistencias(map)
    } catch (error) {
      console.error('Error loading asistencias:', error)
    }
  }

  async function handleCreateClase() {
    try {
      const clase = await createClase(selectedMateria, new Date().toISOString())
      await loadClasesAndAlumnos()
      setSelectedClase(clase.id)
    } catch (error) {
      console.error('Error creating clase:', error)
    }
  }

  async function handleSaveAsistencias() {
    try {
      setSaving(true)
      for (const [alumnoId, estado] of asistencias.entries()) {
        await upsertAsistencia(selectedClase, alumnoId, estado)
      }
      setSaving(false)
      alert('Asistencias guardadas exitosamente')
    } catch (error) {
      console.error('Error saving asistencias:', error)
      setSaving(false)
    }
  }

  function toggleAsistencia(alumnoId: string, nuevoEstado: AsistenciaEstado) {
    const newMap = new Map(asistencias)
    if (newMap.get(alumnoId) === nuevoEstado) {
      newMap.delete(alumnoId)
    } else {
      newMap.set(alumnoId, nuevoEstado)
    }
    setAsistencias(newMap)
  }

  function marcarTodos(estado: AsistenciaEstado) {
    const newMap = new Map<string, AsistenciaEstado>()
    alumnosFiltrados.forEach((alumno) => {
      newMap.set(alumno.id, estado)
    })
    setAsistencias(newMap)
  }

  const alumnosFiltrados = alumnos.filter(
    (a) =>
      `${a.nombre} ${a.apellido}`.toLowerCase().includes(searchText.toLowerCase()) ||
      a.dni.includes(searchText)
  )

  const estadoColors: Record<AsistenciaEstado, string> = {
    PRESENTE: 'bg-green-100 text-green-800',
    AUSENTE: 'bg-red-100 text-red-800',
    JUSTIFICADO: 'bg-yellow-100 text-yellow-800',
    TARDANZA: 'bg-orange-100 text-orange-800',
  }

  const estadoLabels: Record<AsistenciaEstado, string> = {
    PRESENTE: 'P',
    AUSENTE: 'A',
    JUSTIFICADO: 'J',
    TARDANZA: 'T',
  }

  if (loading && materias.length === 0) {
    return (
      <AuthGuard>
        <div className="flex justify-center py-8">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Tomar Asistencia</h1>
          <p className="text-muted-foreground">Registro rápido y eficiente de asistencias</p>
        </div>

        {/* Selectors */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Selecciona materia y clase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Materia</label>
                <Select value={selectedMateria} onValueChange={setSelectedMateria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {materias.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMateria && (
                <div>
                  <label className="text-sm font-medium">Clase</label>
                  <Select value={selectedClase} onValueChange={setSelectedClase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una clase" />
                    </SelectTrigger>
                    <SelectContent>
                      {clases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {new Date(c.fecha).toLocaleDateString('es-AR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedMateria && (
                <div className="flex items-end">
                  <Button onClick={handleCreateClase} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva clase
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedClase && (
          <>
            {/* Acciones masivas */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm">Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => marcarTodos('PRESENTE')}
                    className="bg-green-50"
                  >
                    Marcar todos PRESENTE
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => marcarTodos('AUSENTE')}
                    className="bg-red-50"
                  >
                    Marcar todos AUSENTE
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAsistencias(new Map())}
                  >
                    Limpiar todo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Busqueda */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o DNI"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Grilla de asistencia */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {alumnosFiltrados.length} alumno{alumnosFiltrados.length !== 1 ? 's' : ''}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {asistencias.size} registro{asistencias.size !== 1 ? 's' : ''} cargado{asistencias.size !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Button onClick={handleSaveAsistencias} disabled={saving || asistencias.size === 0}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {alumnosFiltrados.map((alumno) => {
                    const estado = asistencias.get(alumno.id)
                    return (
                      <div
                        key={alumno.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">
                            {alumno.apellido}, {alumno.nombre}
                          </p>
                          <p className="text-xs text-muted-foreground">{alumno.dni}</p>
                        </div>
                        <div className="flex gap-1 ml-4">
                          {(['PRESENTE', 'TARDANZA', 'JUSTIFICADO', 'AUSENTE'] as AsistenciaEstado[]).map(
                            (est) => (
                              <button
                                key={est}
                                onClick={() => toggleAsistencia(alumno.id, est)}
                                className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                                  estado === est
                                    ? `${estadoColors[est]} ring-2 ring-offset-2`
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {estadoLabels[est]}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AuthGuard>
  )
}
