'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  getMaterias, 
  getClasesByMateria, 
  getAlumnosByMateria, 
  getAsistenciasByClase,
  getAllAlumnosWithMaterias,
  getAsistenciasByAlumno
} from '@/lib/supabase/queries'
import { AlertCircle, Users, BookOpen, Calendar } from 'lucide-react'

interface AsistenciaStats {
  presente: number
  ausente: number
  justificado: number
  tardanza: number
  total: number
  porcentajeAsistencia: number
}

function formatDateShort(fecha: string) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
}

function getEstadoBadge(estado: string) {
  const estadoLower = estado?.toLowerCase() || ''
  switch (estadoLower) {
    case 'presente':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">P</Badge>
    case 'ausente':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">A</Badge>
    case 'justificado':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">J</Badge>
    case 'tardanza':
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">T</Badge>
    default:
      return <Badge variant="outline">-</Badge>
  }
}

export default function InformesPage() {
  const [materias, setMaterias] = useState<any[]>([])
  const [selectedMateria, setSelectedMateria] = useState<string>('')
  const [clases, setClases] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [asistenciasMap, setAsistenciasMap] = useState<Map<string, Map<string, string>>>(new Map())
  const [loading, setLoading] = useState(true)
  
  // For "Por Alumno" tab
  const [allAlumnos, setAllAlumnos] = useState<any[]>([])
  const [alumnosAsistencias, setAlumnosAsistencias] = useState<Map<string, any[]>>(new Map())
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)

  useEffect(() => {
    loadMaterias()
  }, [])

  useEffect(() => {
    if (selectedMateria) {
      loadMateriaData()
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

  async function loadMateriaData() {
    try {
      setLoading(true)
      const [clasesData, alumnosData] = await Promise.all([
        getClasesByMateria(selectedMateria),
        getAlumnosByMateria(selectedMateria)
      ])

      // Load asistencias for each clase
      const map = new Map<string, Map<string, string>>()
      await Promise.all(
        clasesData.map(async (clase: any) => {
          const asistenciasData = await getAsistenciasByClase(clase.id)
          const claseMap = new Map<string, string>()
          asistenciasData.forEach((a: any) => {
            claseMap.set(a.alumno_id, a.estado)
          })
          map.set(clase.id, claseMap)
        })
      )

      setClases(clasesData)
      setAlumnos(alumnosData)
      setAsistenciasMap(map)
    } catch (error) {
      console.error('Error loading materia data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAlumnosData() {
    try {
      setLoadingAlumnos(true)
      const alumnosWithMaterias = await getAllAlumnosWithMaterias()
      setAllAlumnos(alumnosWithMaterias)

      // Load asistencias for each alumno
      const asistMap = new Map<string, any[]>()
      await Promise.all(
        alumnosWithMaterias.map(async (alumno: any) => {
          const asistencias = await getAsistenciasByAlumno(alumno.id)
          asistMap.set(alumno.id, asistencias)
        })
      )
      setAlumnosAsistencias(asistMap)
    } catch (error) {
      console.error('Error loading alumnos data:', error)
    } finally {
      setLoadingAlumnos(false)
    }
  }

  function getAsistenciaStats(alumnoId: string): AsistenciaStats {
    let presente = 0
    let ausente = 0
    let justificado = 0
    let tardanza = 0

    asistenciasMap.forEach((claseMap) => {
      const estado = claseMap.get(alumnoId)?.toLowerCase()
      if (!estado) return
      if (estado === 'presente') presente++
      else if (estado === 'ausente') ausente++
      else if (estado === 'justificado') justificado++
      else if (estado === 'tardanza') tardanza++
    })

    const total = clases.length
    const porcentajeAsistencia = total === 0 ? 0 : Math.round(((presente + justificado) / total) * 100)

    return { presente, ausente, justificado, tardanza, total, porcentajeAsistencia }
  }

  function getAlumnoMateriaStats(alumnoId: string, materiaId: string) {
    const asistencias = alumnosAsistencias.get(alumnoId) || []
    const materiaAsistencias = asistencias.filter((a: any) => a.clases?.materia_id === materiaId)
    
    let presente = 0
    let ausente = 0
    let justificado = 0
    let tardanza = 0

    materiaAsistencias.forEach((a: any) => {
      const estado = a.estado?.toLowerCase()
      if (estado === 'presente') presente++
      else if (estado === 'ausente') ausente++
      else if (estado === 'justificado') justificado++
      else if (estado === 'tardanza') tardanza++
    })

    const total = materiaAsistencias.length
    const porcentaje = total === 0 ? 0 : Math.round(((presente + justificado) / total) * 100)

    return { presente, ausente, justificado, tardanza, total, porcentaje }
  }

  function getRiskBadge(porcentaje: number) {
    if (porcentaje >= 75) {
      return <Badge className="bg-green-100 text-green-800">OK</Badge>
    }
    if (porcentaje >= 50) {
      return <Badge className="bg-yellow-100 text-yellow-800">Alerta</Badge>
    }
    return <Badge className="bg-red-100 text-red-800">Riesgo</Badge>
  }

  const currentMateria = materias.find(m => m.id === selectedMateria)

  return (
    <AuthGuard>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Informes de Asistencia</h1>
          <p className="text-muted-foreground">Reportes y estadisticas detalladas</p>
        </div>

        <Tabs defaultValue="por-materia" onValueChange={(v) => {
          if (v === 'por-alumno' && allAlumnos.length === 0) {
            loadAlumnosData()
          }
        }}>
          <TabsList className="mb-6">
            <TabsTrigger value="por-materia" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Por Materia
            </TabsTrigger>
            <TabsTrigger value="por-alumno" className="gap-2">
              <Users className="h-4 w-4" />
              Por Alumno
            </TabsTrigger>
          </TabsList>

          {/* TAB: Por Materia */}
          <TabsContent value="por-materia">
            {/* Selector de materia */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Selecciona una materia</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedMateria} onValueChange={setSelectedMateria}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Selecciona una materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {materias.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre} ({m.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedMateria && !loading && (
              <>
                {/* Resumen general */}
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-3xl font-bold text-blue-600">{clases.length}</p>
                      <p className="text-sm text-muted-foreground">Clases</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-3xl font-bold text-green-600">{alumnos.length}</p>
                      <p className="text-sm text-muted-foreground">Alumnos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-foreground">
                        {alumnos.length > 0
                          ? Math.round(
                              alumnos.reduce((sum, a) => sum + getAsistenciaStats(a.id).porcentajeAsistencia, 0) /
                                alumnos.length
                            )
                          : 0}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">Asistencia Promedio</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                      <p className="text-3xl font-bold text-red-600">
                        {alumnos.filter(a => getAsistenciaStats(a.id).porcentajeAsistencia < 75).length}
                      </p>
                      <p className="text-sm text-muted-foreground">{'En Riesgo (<75%)'}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detalle por Clase */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Asistencia por Clase</CardTitle>
                    <CardDescription>
                      Detalle de asistencia en cada clase de {currentMateria?.nombre}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {clases.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No hay clases registradas</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="sticky left-0 bg-background">Alumno</TableHead>
                              {clases.slice().reverse().map((clase) => (
                                <TableHead key={clase.id} className="text-center min-w-16">
                                  <div className="text-xs">
                                    {formatDateShort(clase.fecha)}
                                  </div>
                                  {clase.horario && (
                                    <div className="text-xs text-muted-foreground">{clase.horario}</div>
                                  )}
                                </TableHead>
                              ))}
                              <TableHead className="text-center">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alumnos.map((alumno) => {
                              const stats = getAsistenciaStats(alumno.id)
                              return (
                                <TableRow key={alumno.id} className={stats.porcentajeAsistencia < 75 ? 'bg-red-50' : ''}>
                                  <TableCell className="sticky left-0 bg-background font-medium whitespace-nowrap">
                                    {alumno.apellido}, {alumno.nombre}
                                  </TableCell>
                                  {clases.slice().reverse().map((clase) => {
                                    const estado = asistenciasMap.get(clase.id)?.get(alumno.id)
                                    return (
                                      <TableCell key={clase.id} className="text-center">
                                        {getEstadoBadge(estado || '')}
                                      </TableCell>
                                    )
                                  })}
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="font-semibold">{stats.porcentajeAsistencia}%</span>
                                      {stats.porcentajeAsistencia < 75 && (
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tabla resumen por alumno */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen por Alumno</CardTitle>
                    <CardDescription>Estadisticas totales de cada alumno</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Alumno</TableHead>
                            <TableHead>DNI</TableHead>
                            <TableHead className="text-center">P</TableHead>
                            <TableHead className="text-center">J</TableHead>
                            <TableHead className="text-center">T</TableHead>
                            <TableHead className="text-center">A</TableHead>
                            <TableHead className="text-right w-48">% Asistencia</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {alumnos.map((alumno) => {
                            const stats = getAsistenciaStats(alumno.id)
                            return (
                              <TableRow key={alumno.id} className={stats.porcentajeAsistencia < 75 ? 'bg-red-50' : ''}>
                                <TableCell className="font-medium">
                                  {alumno.apellido}, {alumno.nombre}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{alumno.dni}</TableCell>
                                <TableCell className="text-center text-green-600 font-semibold">{stats.presente}</TableCell>
                                <TableCell className="text-center text-yellow-600 font-semibold">{stats.justificado}</TableCell>
                                <TableCell className="text-center text-orange-600 font-semibold">{stats.tardanza}</TableCell>
                                <TableCell className="text-center text-red-600 font-semibold">{stats.ausente}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={stats.porcentajeAsistencia} className="w-24" />
                                    <span className="font-semibold">{stats.porcentajeAsistencia}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {getRiskBadge(stats.porcentajeAsistencia)}
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

            {loading && selectedMateria && (
              <div className="flex justify-center py-8">
                <div className="text-muted-foreground">Cargando datos...</div>
              </div>
            )}
          </TabsContent>

          {/* TAB: Por Alumno */}
          <TabsContent value="por-alumno">
            {loadingAlumnos ? (
              <div className="flex justify-center py-8">
                <div className="text-muted-foreground">Cargando datos de alumnos...</div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Asistencia por Alumno</CardTitle>
                  <CardDescription>
                    Porcentaje de asistencia de cada alumno en todas sus materias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allAlumnos.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No hay alumnos registrados</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background">Alumno</TableHead>
                            <TableHead>DNI</TableHead>
                            {materias.map((materia) => (
                              <TableHead key={materia.id} className="text-center min-w-28">
                                <div className="text-xs font-medium">{materia.codigo}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-24">{materia.nombre}</div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allAlumnos.map((alumno) => {
                            const enrolledMaterias = alumno.materia_alumnos?.map((ma: any) => ma.materia_id) || []
                            return (
                              <TableRow key={alumno.id}>
                                <TableCell className="sticky left-0 bg-background font-medium whitespace-nowrap">
                                  {alumno.apellido}, {alumno.nombre}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{alumno.dni}</TableCell>
                                {materias.map((materia) => {
                                  const isEnrolled = enrolledMaterias.includes(materia.id)
                                  if (!isEnrolled) {
                                    return (
                                      <TableCell key={materia.id} className="text-center">
                                        <span className="text-muted-foreground text-xs">-</span>
                                      </TableCell>
                                    )
                                  }
                                  const stats = getAlumnoMateriaStats(alumno.id, materia.id)
                                  return (
                                    <TableCell key={materia.id} className="text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <span className={`font-semibold ${stats.porcentaje < 75 ? 'text-red-600' : 'text-green-600'}`}>
                                          {stats.total > 0 ? `${stats.porcentaje}%` : 'N/A'}
                                        </span>
                                        {stats.total > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            {stats.presente + stats.justificado}/{stats.total}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                  )
                                })}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  )
}
