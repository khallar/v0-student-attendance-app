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
  getInformeByAlumno,
  getCategorias,
} from '@/lib/supabase/queries'
import { AlertCircle, Users, BookOpen, Calendar, TrendingUp, CheckCircle, Download, Folder, Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import * as XLSX from 'xlsx'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

function formatDateShort(fecha: string) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function getEstadoBadge(estado: string) {
  switch (estado?.toLowerCase()) {
    case 'presente':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs px-1.5">P</Badge>
    case 'ausente':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs px-1.5">A</Badge>
    case 'justificado':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs px-1.5">J</Badge>
    case 'tardanza':
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs px-1.5">T</Badge>
    default:
      return <Badge variant="outline" className="text-xs px-1.5">-</Badge>
  }
}

function getPorcentajeColor(p: number) {
  if (p >= 60) return 'text-green-600'
  return 'text-red-600'
}

function getRiskBadge(p: number) {
  if (p >= 60) return <Badge className="bg-green-100 text-green-800 font-semibold">Regular</Badge>
  return <Badge className="bg-red-100 text-red-800 font-semibold">Libre</Badge>
}

export default function InformesPage() {
  // --- Tab Por Materia ---
  const [materias, setMaterias] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas')
  const [selectedMateria, setSelectedMateria] = useState<string>('')
  const [clases, setClases] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [asistenciasMap, setAsistenciasMap] = useState<Map<string, Map<string, string>>>(new Map())
  const [loadingMateria, setLoadingMateria] = useState(false)

  // --- Tab Por Alumno ---
  const [allAlumnos, setAllAlumnos] = useState<any[]>([])
  const [selectedAlumno, setSelectedAlumno] = useState<string>('')
  const [alumnoData, setAlumnoData] = useState<any | null>(null)
  const [alumnoMaterias, setAlumnoMaterias] = useState<any[]>([])
  const [loadingAlumno, setLoadingAlumno] = useState(false)
  const [loadingAlumnosList, setLoadingAlumnosList] = useState(false)
  // Filtros por alumno
  const [searchAlumno, setSearchAlumno] = useState('')
  const [filterEstado, setFilterEstado] = useState<'todos' | 'regular' | 'libre'>('todos')
  const [filterMateria, setFilterMateria] = useState<string>('todas')

  useEffect(() => {
    loadInit()
  }, [])

  async function loadInit() {
    try {
      const [materiasData, categoriasData] = await Promise.all([
        getMaterias(),
        getCategorias()
      ])
      setMaterias(materiasData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  // Filter materias by selected categoria
  const filteredMaterias = selectedCategoria === 'todas' 
    ? materias 
    : selectedCategoria === 'sin-categoria'
    ? materias.filter(m => !m.categoria_id)
    : materias.filter(m => m.categoria_id === selectedCategoria)

  // Load alumnos list when Por Alumno tab is first opened
  async function loadAlumnosList() {
    if (allAlumnos.length > 0) return
    try {
      setLoadingAlumnosList(true)
      const data = await getAllAlumnosWithMaterias()
      setAllAlumnos(data)
    } catch (error) {
      console.error('Error loading alumnos:', error)
    } finally {
      setLoadingAlumnosList(false)
    }
  }

  // Load materia data when selectedMateria changes
  useEffect(() => {
    if (!selectedMateria) return
    loadMateriaData()
  }, [selectedMateria])

  async function loadMateriaData() {
    try {
      setLoadingMateria(true)
      const [clasesData, alumnosData] = await Promise.all([
        getClasesByMateria(selectedMateria),
        getAlumnosByMateria(selectedMateria),
      ])

      console.log('[v0] clasesData:', clasesData)
      console.log('[v0] alumnosData:', alumnosData)

      // Use all clases sorted by date
      const clasesHoy = clasesData.sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      console.log('[v0] clasesHoy (todas ordenadas):', clasesHoy)

      const map = new Map<string, Map<string, string>>()
      await Promise.all(
        clasesHoy.map(async (clase: any) => {
          const asistenciasData = await getAsistenciasByClase(clase.id)
          console.log('[v0] asistenciasData para clase', clase.id, ':', asistenciasData)
          const claseMap = new Map<string, string>()
          asistenciasData.forEach((a: any) => {
            claseMap.set(a.alumno_id, a.estado?.toLowerCase())
          })
          map.set(clase.id, claseMap)
        })
      )

      console.log('[v0] asistenciasMap size:', map.size)

      setClases(clasesHoy)
      setAlumnos(alumnosData)
      setAsistenciasMap(map)
    } catch (error) {
      console.error('Error loading materia data:', error)
    } finally {
      setLoadingMateria(false)
    }
  }

  // Load alumno informe when selectedAlumno changes
  useEffect(() => {
    if (!selectedAlumno) return
    loadAlumnoData()
  }, [selectedAlumno])

  async function loadAlumnoData() {
    try {
      setLoadingAlumno(true)
      setAlumnoMaterias([])
      const found = allAlumnos.find((a) => a.id === selectedAlumno)
      setAlumnoData(found || null)
      const stats = await getInformeByAlumno(selectedAlumno)
      setAlumnoMaterias(stats)
    } catch (error) {
      console.error('Error loading alumno data:', error)
    } finally {
      setLoadingAlumno(false)
    }
  }

  // --- Helpers for Por Materia ---
  function getAsistenciaStats(alumnoId: string) {
    let presente = 0, ausente = 0, justificado = 0, tardanza = 0
    asistenciasMap.forEach((claseMap) => {
      const estado = claseMap.get(alumnoId)?.toLowerCase()
      if (!estado) { ausente++; return }
      if (estado === 'presente') presente++
      else if (estado === 'ausente') ausente++
      else if (estado === 'justificado') justificado++
      else if (estado === 'tardanza') tardanza++
    })
    const total = clases.length
    const porcentajeAsistencia = total === 0 ? 0 : Math.round(((presente + justificado) / total) * 100)
    return { presente, ausente, justificado, tardanza, total, porcentajeAsistencia }
  }

  // Calculate average presentes per clase and overall attendance breakdown
  function getGlobalStats() {
    if (clases.length === 0 || alumnos.length === 0) {
      return { promedioPresentes: 0, totalPresente: 0, totalAusente: 0, totalJustificado: 0, totalTardanza: 0 }
    }

    let totalPresente = 0, totalAusente = 0, totalJustificado = 0, totalTardanza = 0

    asistenciasMap.forEach((claseMap) => {
      claseMap.forEach((estado) => {
        const s = estado?.toLowerCase()
        if (s === 'presente') totalPresente++
        else if (s === 'ausente') totalAusente++
        else if (s === 'justificado') totalJustificado++
        else if (s === 'tardanza') totalTardanza++
      })
    })

    // Count missing registrations as ausente
    const totalAsistencias = totalPresente + totalAusente + totalJustificado + totalTardanza
    const expectedTotal = clases.length * alumnos.length
    const missingAsistencias = expectedTotal - totalAsistencias
    totalAusente += missingAsistencias

    const promedioPresentes = clases.length > 0 ? Math.round(totalPresente / clases.length) : 0

    return { promedioPresentes, totalPresente, totalAusente, totalJustificado, totalTardanza }
  }

  // --- Filtrado de alumnos en tab Por Alumno ---
  // Extraer materias únicas de todos los alumnos para el filtro
  const materiasDeAlumnos = Array.from(
    new Map(
      allAlumnos.flatMap((a) => (a.materias || []).map((m: any) => [m.id, m]))
    ).values()
  ).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

  const filteredAlumnos = allAlumnos.filter((a) => {
    const texto = searchAlumno.toLowerCase()
    const matchTexto =
      !texto ||
      a.nombre?.toLowerCase().includes(texto) ||
      a.apellido?.toLowerCase().includes(texto) ||
      a.dni?.includes(texto)

    const matchMateria =
      filterMateria === 'todas' ||
      (a.materias || []).some((m: any) => m.id === filterMateria)

    return matchTexto && matchMateria
  })

  // --- Computed for Por Alumno ---
  const totalClasesAlumno = alumnoMaterias.reduce((s, m) => s + m.total, 0)
  const totalPresentesAlumno = alumnoMaterias.reduce((s, m) => s + m.presente + m.justificado, 0)
  const porcentajeTotalAlumno = totalClasesAlumno === 0 ? 0 : Math.round((totalPresentesAlumno / totalClasesAlumno) * 100)

  const currentMateria = materias.find((m) => m.id === selectedMateria)

  // Export Excel function
  function exportToExcel() {
    if (!currentMateria || clases.length === 0 || alumnos.length === 0) return

    // Build header row: Apellido, Nombre, DNI, then each class date
    const headers = ['Apellido', 'Nombre', 'DNI', ...clases.map((c) => formatDateShort(c.fecha)), '% Asistencia']

    // Build data rows
    const rows = alumnos.map((alumno) => {
      const stats = getAsistenciaStats(alumno.id)
      const row: (string | number)[] = [
        alumno.apellido,
        alumno.nombre,
        alumno.dni,
      ]
      // Add estado for each clase
      clases.forEach((clase) => {
        const estado = asistenciasMap.get(clase.id)?.get(alumno.id)
        let estadoText = 'A' // Default ausente
        if (estado === 'presente') estadoText = 'P'
        else if (estado === 'justificado') estadoText = 'J'
        else if (estado === 'tardanza') estadoText = 'T'
        row.push(estadoText)
      })
      row.push(`${stats.porcentajeAsistencia}%`)
      return row
    })

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Apellido
      { wch: 15 }, // Nombre
      { wch: 12 }, // DNI
      ...clases.map(() => ({ wch: 10 })), // Fechas
      { wch: 12 }, // % Asistencia
    ]

    // Create workbook and export
    const wb = XLSX.utils.book_new()
    const sheetName = currentMateria.codigo.slice(0, 31) // Excel sheet name max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `Asistencia_${currentMateria.codigo}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Informes de Asistencia</h1>
          <p className="text-muted-foreground">Reportes y estadísticas detalladas de todas las clases</p>
        </div>

        <Tabs defaultValue="por-materia" onValueChange={(v) => {
          if (v === 'por-alumno') loadAlumnosList()
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

          {/* ======================== TAB: Por Materia ======================== */}
          <TabsContent value="por-materia">
            <Card className="mb-6">
              <CardContent className="pt-6">
                {/* Categoria filter */}
                {categorias.length > 0 && (
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex flex-wrap items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground mr-1">Categoria:</span>
                      <Badge
                        variant={selectedCategoria === 'todas' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedCategoria('todas')}
                      >
                        Todas
                      </Badge>
                      {categorias.map((cat) => (
                        <Badge
                          key={cat.id}
                          variant={selectedCategoria === cat.id ? 'default' : 'outline'}
                          className="cursor-pointer"
                          style={selectedCategoria === cat.id ? { backgroundColor: cat.color } : {}}
                          onClick={() => setSelectedCategoria(cat.id)}
                        >
                          <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: selectedCategoria === cat.id ? '#fff' : cat.color }} />
                          {cat.nombre}
                        </Badge>
                      ))}
                      <Badge
                        variant={selectedCategoria === 'sin-categoria' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedCategoria('sin-categoria')}
                      >
                        Sin categoria
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <Select value={selectedMateria} onValueChange={setSelectedMateria}>
                    <SelectTrigger className="max-w-sm">
                      <SelectValue placeholder="Selecciona una materia..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredMaterias.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            {m.categorias && (
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.categorias.color }} />
                            )}
                            {m.nombre} — {m.codigo}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMateria && clases.length > 0 && alumnos.length > 0 && (
                    <Button onClick={exportToExcel} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Descargar Excel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {loadingMateria && (
              <div className="flex justify-center py-12 text-muted-foreground">Cargando datos...</div>
            )}

            {selectedMateria && !loadingMateria && (
              <>
                {/* Summary cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-3xl font-bold text-blue-600">{clases.length}</p>
                      <p className="text-sm text-muted-foreground">Clases dictadas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-foreground" />
                      <p className="text-3xl font-bold">{alumnos.length}</p>
                      <p className="text-sm text-muted-foreground">Alumnos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-3xl font-bold text-green-600">{getGlobalStats().promedioPresentes}</p>
                      <p className="text-sm text-muted-foreground">Presentes promedio/clase</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-3xl font-bold text-green-600">
                        {alumnos.length > 0
                          ? Math.round(alumnos.reduce((s, a) => s + getAsistenciaStats(a.id).porcentajeAsistencia, 0) / alumnos.length)
                          : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">Asistencia promedio</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Asistencia por Clase — grilla alumno x clase */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Asistencia por Clase</CardTitle>
                    <CardDescription>{currentMateria?.nombre} — todas las clases registradas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {clases.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No hay clases dictadas aun</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="sticky left-0 bg-background min-w-40">Alumno</TableHead>
                              {clases.map((clase) => (
                                <TableHead key={clase.id} className="text-center min-w-16 px-1">
                                  <div className="text-xs font-medium">{formatDateShort(clase.fecha)}</div>
                                  {clase.horario && (
                                    <div className="text-xs text-muted-foreground font-normal">{clase.horario.split(' - ')[0]}</div>
                                  )}
                                </TableHead>
                              ))}
                              <TableHead className="text-center min-w-20">%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alumnos.map((alumno) => {
                              const stats = getAsistenciaStats(alumno.id)
                              return (
                                <TableRow key={alumno.id} className={stats.porcentajeAsistencia < 60 ? 'bg-red-50/60' : ''}>
                                  <TableCell className="sticky left-0 bg-background font-medium whitespace-nowrap text-sm">
                                    {alumno.apellido}, {alumno.nombre}
                                  </TableCell>
                                  {clases.map((clase) => {
                                    const estado = asistenciasMap.get(clase.id)?.get(alumno.id) || ''
                                    return (
                                      <TableCell key={clase.id} className="text-center px-1">
                                        {getEstadoBadge(estado)}
                                      </TableCell>
                                    )
                                  })}
                                  <TableCell className="text-center">
                                    <span className={`font-bold text-sm ${getPorcentajeColor(stats.porcentajeAsistencia)}`}>
                                      {stats.porcentajeAsistencia}%
                                    </span>
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

                {/* Resumen por Alumno */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <CardTitle>Resumen por Alumno</CardTitle>
                        <CardDescription>Totales de asistencia en {currentMateria?.nombre}</CardDescription>
                      </div>
                      <div className="flex flex-col gap-1.5 text-sm border rounded-lg p-3 bg-muted/50 min-w-56">
                        <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-0.5">Criterio de regularidad</p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800 font-semibold">Regular</Badge>
                          <span className="text-muted-foreground text-xs">60% o mas de asistencia</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800 font-semibold">Libre</Badge>
                          <span className="text-muted-foreground text-xs">Menos del 60% de asistencia</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Se computan presentes y justificados</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Alumno</TableHead>
                            <TableHead>DNI</TableHead>
                            <TableHead className="text-center">Pres.</TableHead>
                            <TableHead className="text-center">Just.</TableHead>
                            <TableHead className="text-center">Tard.</TableHead>
                            <TableHead className="text-center">Aus.</TableHead>
                            <TableHead className="text-right w-52">% Asistencia</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {alumnos.map((alumno) => {
                            const stats = getAsistenciaStats(alumno.id)
                            return (
                                <TableRow key={alumno.id} className={stats.porcentajeAsistencia < 60 ? 'bg-red-50/60' : ''}>
                                  <TableCell className="font-medium">{alumno.apellido}, {alumno.nombre}</TableCell>
                                <TableCell className="text-muted-foreground font-mono text-sm">{alumno.dni}</TableCell>
                                <TableCell className="text-center text-green-700 font-semibold">{stats.presente}</TableCell>
                                <TableCell className="text-center text-yellow-700 font-semibold">{stats.justificado}</TableCell>
                                <TableCell className="text-center text-orange-700 font-semibold">{stats.tardanza}</TableCell>
                                <TableCell className="text-center text-red-700 font-semibold">{stats.ausente}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end gap-2">
                                    <Progress value={stats.porcentajeAsistencia} className="w-24 h-2" />
                                    <span className={`font-semibold w-10 text-right ${getPorcentajeColor(stats.porcentajeAsistencia)}`}>
                                      {stats.porcentajeAsistencia}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">{getRiskBadge(stats.porcentajeAsistencia)}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Distribution Chart */}
                {clases.length > 0 && alumnos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribución de Asistencia</CardTitle>
                      <CardDescription>Porcentaje de cada tipo de asistencia en {currentMateria?.nombre}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center w-full">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Presente', value: getGlobalStats().totalPresente, fill: '#22c55e' },
                                { name: 'Ausente', value: getGlobalStats().totalAusente, fill: '#ef4444' },
                                { name: 'Justificado', value: getGlobalStats().totalJustificado, fill: '#eab308' },
                                { name: 'Tardanza', value: getGlobalStats().totalTardanza, fill: '#f97316' },
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              <Cell fill="#22c55e" />
                              <Cell fill="#ef4444" />
                              <Cell fill="#eab308" />
                              <Cell fill="#f97316" />
                            </Pie>
                            <Tooltip formatter={(value) => `${value} registros`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!selectedMateria && !loadingMateria && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <BookOpen className="h-10 w-10 opacity-30" />
                <p>Selecciona una materia para ver el informe</p>
              </div>
            )}
          </TabsContent>

          {/* ======================== TAB: Por Alumno ======================== */}
          <TabsContent value="por-alumno">
            {/* Filtros y lista de alumnos */}
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="flex flex-col gap-3">
                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, apellido o DNI..."
                    value={searchAlumno}
                    onChange={(e) => setSearchAlumno(e.target.value)}
                    className="pl-9"
                  />
                  {searchAlumno && (
                    <button onClick={() => setSearchAlumno('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filtro por materia */}
                {materiasDeAlumnos.length > 0 && (
                  <Select value={filterMateria} onValueChange={setFilterMateria}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por materia..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas las materias</SelectItem>
                      {materiasDeAlumnos.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Chips de estado */}
                <div className="flex gap-2 flex-wrap">
                  {(['todos', 'regular', 'libre'] as const).map((estado) => (
                    <Badge
                      key={estado}
                      variant={filterEstado === estado ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => setFilterEstado(estado)}
                    >
                      {estado === 'todos' ? 'Todos' : estado === 'regular' ? 'Regular' : 'Libre'}
                    </Badge>
                  ))}
                </div>

                {/* Lista de alumnos */}
                {loadingAlumnosList ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Cargando alumnos...</p>
                ) : (
                  <Card className="overflow-hidden">
                    <div className="max-h-[60vh] overflow-y-auto divide-y">
                      {filteredAlumnos.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">Sin resultados</p>
                      ) : (
                        filteredAlumnos.map((a) => (
                          <button
                            key={a.id}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/60 ${selectedAlumno === a.id ? 'bg-muted font-medium' : ''}`}
                            onClick={() => setSelectedAlumno(a.id)}
                          >
                            <div className="font-medium">{a.apellido}, {a.nombre}</div>
                            <div className="text-xs text-muted-foreground">DNI {a.dni}</div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
                      {filteredAlumnos.length} alumno{filteredAlumnos.length !== 1 ? 's' : ''}
                    </div>
                  </Card>
                )}
              </div>

              {/* Panel derecho: informe del alumno seleccionado */}
              <div>
                {loadingAlumno && (
                  <div className="flex justify-center py-12 text-muted-foreground">Cargando informe...</div>
                )}

            {selectedAlumno && !loadingAlumno && alumnoData && (
              <>
                {/* Cabecera del alumno + % total destacado */}
                <div className="grid gap-4 sm:grid-cols-3 mb-6">
                  {/* % Total — card grande */}
                  <Card className="sm:col-span-1 border-2 flex flex-col items-center justify-center py-8"
                    style={{ borderColor: porcentajeTotalAlumno >= 75 ? '#16a34a' : porcentajeTotalAlumno >= 50 ? '#ca8a04' : '#dc2626' }}>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Asistencia total</p>
                    <p className={`text-7xl font-extrabold leading-none ${getPorcentajeColor(porcentajeTotalAlumno)}`}>
                      {porcentajeTotalAlumno}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {totalPresentesAlumno} de {totalClasesAlumno} clases
                    </p>
                    <div className="mt-3">{getRiskBadge(porcentajeTotalAlumno)}</div>
                  </Card>

                  {/* Info del alumno */}
                  <Card className="sm:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-xl">{alumnoData.apellido}, {alumnoData.nombre}</CardTitle>
                      <CardDescription>DNI {alumnoData.dni}{alumnoData.email ? ` — ${alumnoData.email}` : ''}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {alumnoMaterias.reduce((s, m) => s + m.presente, 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Presentes</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-600">
                            {alumnoMaterias.reduce((s, m) => s + m.justificado, 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Justificadas</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">
                            {alumnoMaterias.reduce((s, m) => s + m.ausente, 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Ausentes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* % por materia */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Asistencia por Materia</CardTitle>
                    <CardDescription>Porcentaje calculado sobre clases dictadas hasta hoy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {alumnoMaterias.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Sin materias inscriptas</p>
                    ) : (
                      <div className="space-y-4">
                        {alumnoMaterias.map((materia) => (
                          <div key={materia.id} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-sm">{materia.nombre}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{materia.codigo}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">
                                  {materia.presente + materia.justificado}/{materia.total} clases
                                </span>
                                <span className={`font-bold text-base w-12 text-right ${getPorcentajeColor(materia.porcentaje)}`}>
                                  {materia.porcentaje}%
                                </span>
                                {getRiskBadge(materia.porcentaje)}
                              </div>
                            </div>
                            <Progress value={materia.porcentaje} className="h-2" />
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span className="text-green-600">P: {materia.presente}</span>
                              <span className="text-yellow-600">J: {materia.justificado}</span>
                              <span className="text-orange-600">T: {materia.tardanza}</span>
                              <span className="text-red-600">A: {materia.ausente}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Detalle por clase dentro de cada materia */}
                {alumnoMaterias.map((materia) => (
                  materia.clases && materia.clases.length > 0 && (
                    <Card key={materia.id} className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{materia.nombre} — Detalle de clases</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {materia.clases.map((clase: any) => (
                            <div key={clase.id} className="flex flex-col items-center gap-0.5">
                              <span className="text-xs text-muted-foreground">{formatDateShort(clase.fecha)}</span>
                              {getEstadoBadge(clase.estado)}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                ))}
              </>
            )}

            {!selectedAlumno && !loadingAlumnosList && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <Users className="h-10 w-10 opacity-30" />
                  <p>Selecciona un alumno de la lista para ver su informe</p>
                </div>
              )}

              </div>{/* end panel derecho */}
            </div>{/* end grid */}
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  )
}
