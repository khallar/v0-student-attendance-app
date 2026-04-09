'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getMaterias, getClasesByMateria, getAlumnosByMateria, getAsistenciasByClase } from '@/lib/supabase/queries'
import { AlertCircle, TrendingDown } from 'lucide-react'

interface AsistenciaStats {
  presente: number
  ausente: number
  justificado: number
  tardanza: number
  total: number
  porcentajeAsistencia: number
}

export default function InformesPage() {
  const [materias, setMaterias] = useState<any[]>([])
  const [selectedMateria, setSelectedMateria] = useState<string>('')
  const [clases, setClases] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [asistenciasMap, setAsistenciasMap] = useState<Map<string, Map<string, string>>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMaterias()
  }, [])

  useEffect(() => {
    if (selectedMateria) {
      loadData()
    }
  }, [selectedMateria])

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

  async function loadData() {
    try {
      setLoading(true)
      const clasesData = await getClasesByMateria(selectedMateria)
      const alumnosData = await getAlumnosByMateria(selectedMateria)

      const map = new Map<string, Map<string, string>>()
      for (const clase of clasesData) {
        const asistenciasData = await getAsistenciasByClase(clase.id)
        const claseMap = new Map<string, string>()
        asistenciasData.forEach((a: any) => {
          claseMap.set(a.alumno_id, a.estado)
        })
        map.set(clase.id, claseMap)
      }

      setClases(clasesData)
      setAlumnos(alumnosData)
      setAsistenciasMap(map)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function getAsistenciaStats(alumnoId: string): AsistenciaStats {
    let presente = 0
    let ausente = 0
    let justificado = 0
    let tardanza = 0

    asistenciasMap.forEach((claseMap) => {
      const estado = claseMap.get(alumnoId)
      if (!estado) return
      if (estado === 'PRESENTE') presente++
      else if (estado === 'AUSENTE') ausente++
      else if (estado === 'JUSTIFICADO') justificado++
      else if (estado === 'TARDANZA') tardanza++
    })

    const total = clases.length
    const porcentajeAsistencia = total === 0 ? 0 : Math.round(((presente + justificado) / total) * 100)

    return { presente, ausente, justificado, tardanza, total, porcentajeAsistencia }
  }

  function getRiskLevel(porcentaje: number): { color: string; label: string } {
    if (porcentaje >= 75) return { color: 'text-green-600', label: 'Bajo' }
    if (porcentaje >= 50) return { color: 'text-yellow-600', label: 'Medio' }
    return { color: 'text-red-600', label: 'Alto' }
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
          <h1 className="text-3xl font-bold">Informes de Asistencia</h1>
          <p className="text-muted-foreground">Reportes y estadísticas por materia</p>
        </div>

        {/* Selector de materia */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Selecciona una materia</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMateria} onValueChange={setSelectedMateria}>
              <SelectTrigger className="max-w-xs">
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
          </CardContent>
        </Card>

        {selectedMateria && (
          <>
            {/* Resumen general */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-blue-600">{clases.length}</p>
                  <p className="text-sm text-muted-foreground">Clases registradas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-green-600">{alumnos.length}</p>
                  <p className="text-sm text-muted-foreground">Alumnos inscriptos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {Math.round(
                      alumnos.reduce((sum, a) => sum + getAsistenciaStats(a.id).porcentajeAsistencia, 0) /
                        (alumnos.length || 1)
                    )}
                    %
                  </p>
                  <p className="text-sm text-muted-foreground">Asistencia promedio</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {alumnos.filter(
                      (a) => getAsistenciaStats(a.id).porcentajeAsistencia < 75
                    ).length}
                  </p>
                  <p className="text-sm text-muted-foreground">En riesgo {'(<75%)' }</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabla de alumnos */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle por alumno</CardTitle>
                <CardDescription>
                  Estadísticas de asistencia de cada alumno
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alumno</TableHead>
                        <TableHead className="text-center">Presente</TableHead>
                        <TableHead className="text-center">Justificado</TableHead>
                        <TableHead className="text-center">Tardanza</TableHead>
                        <TableHead className="text-center">Ausente</TableHead>
                        <TableHead className="text-right w-48">% Asistencia</TableHead>
                        <TableHead className="text-center">Riesgo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alumnos.map((alumno) => {
                        const stats = getAsistenciaStats(alumno.id)
                        const risk = getRiskLevel(stats.porcentajeAsistencia)
                        return (
                          <TableRow key={alumno.id} className={stats.porcentajeAsistencia < 75 ? 'bg-red-50' : ''}>
                            <TableCell className="font-medium">
                              <div>
                                {alumno.apellido}, {alumno.nombre}
                              </div>
                              <div className="text-xs text-muted-foreground">{alumno.dni}</div>
                            </TableCell>
                            <TableCell className="text-center text-green-600 font-semibold">
                              {stats.presente}
                            </TableCell>
                            <TableCell className="text-center text-yellow-600 font-semibold">
                              {stats.justificado}
                            </TableCell>
                            <TableCell className="text-center text-orange-600 font-semibold">
                              {stats.tardanza}
                            </TableCell>
                            <TableCell className="text-center text-red-600 font-semibold">
                              {stats.ausente}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={stats.porcentajeAsistencia}
                                  className="w-32"
                                />
                                <span className="font-semibold whitespace-nowrap">
                                  {stats.porcentajeAsistencia}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {stats.porcentajeAsistencia < 75 && (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                <Badge
                                  variant={
                                    stats.porcentajeAsistencia >= 75
                                      ? 'default'
                                      : 'destructive'
                                  }
                                >
                                  {risk.label}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AuthGuard>
  )
}
