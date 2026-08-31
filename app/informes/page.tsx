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
  getAsistenciaDocentes,
  getDocentesFromMateria,
  getClasesConAsistenciaDocentes,
} from '@/lib/supabase/queries'
import { getMockUser, isAdmin } from '@/lib/auth-mock'
import { AlertCircle, Users, BookOpen, Calendar, TrendingUp, CheckCircle, Download, Folder, Search, Filter, X, GraduationCap, CalendarX, CalendarCheck, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import * as XLSX from 'xlsx'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { todayStableFecha } from '@/lib/utils-attendance'

// Normalize a name for grouping (accent- and case-insensitive)
function normalizeName(s: string) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function formatDateShort(fecha: string) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
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
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [assignedCategoriaIds, setAssignedCategoriaIds] = useState<string[]>([])

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

  // --- Tab Por Docente ---
  const [selectedDocente, setSelectedDocente] = useState<string>('todos')
  const [selectedDocenteMateria, setSelectedDocenteMateria] = useState<string>('todas')
  const [docenteClases, setDocenteClases] = useState<any[]>([])
  const [docenteAsistencias, setDocenteAsistencias] = useState<any[]>([])
  const [docenteDataLoaded, setDocenteDataLoaded] = useState(false)
  const [loadingDocentes, setLoadingDocentes] = useState(false)

  // Pestaña activa (Tabs controlado). Se usa junto a un useEffect para
  // disparar la carga de cada pestaña de forma robusta, evitando la condición
  // de carrera que se daba al depender solo del onValueChange (que podía
  // ejecutarse antes de que `materias` terminara de cargar y no reintentaba).
  const [activeTab, setActiveTab] = useState<string>('por-materia')

  useEffect(() => {
    loadInit()
  }, [])

  // Cargar los datos de la pestaña activa cuando corresponda. A diferencia del
  // onValueChange, este effect vuelve a evaluarse cuando `materias` termina de
  // cargar, así el informe Por Docente siempre obtiene sus clases/asistencias.
  useEffect(() => {
    if (activeTab === 'por-alumno') {
      loadAlumnosList()
    } else if (activeTab === 'por-docente' && materias.length > 0) {
      loadDocentesData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, materias])

  async function loadInit() {
    try {
      const user = getMockUser()
      const admin = isAdmin(user)
      const assigned = user?.categoriaIds || []
      setIsUserAdmin(admin)
      setAssignedCategoriaIds(assigned)

      const [materiasData, categoriasData] = await Promise.all([
        getMaterias(),
        getCategorias()
      ])

      if (admin) {
        setMaterias(materiasData)
        setCategorias(categoriasData)
      } else {
        // Los usuarios no-admin solo ven sus categorías asignadas
        const assignedSet = new Set(assigned)
        setCategorias(categoriasData.filter((c: any) => assignedSet.has(c.id)))
        setMaterias(materiasData.filter((m: any) => m.categoria_id && assignedSet.has(m.categoria_id)))
      }
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

      // Sort all clases by date
      const todasLasClases = clasesData.sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

      const map = new Map<string, Map<string, string>>()
      await Promise.all(
        todasLasClases.map(async (clase: any) => {
          const asistenciasData = await getAsistenciasByClase(clase.id)
          const claseMap = new Map<string, string>()
          asistenciasData.forEach((a: any) => {
            claseMap.set(a.alumno_id, a.estado?.toLowerCase())
          })
          map.set(clase.id, claseMap)
        })
      )

      setClases(todasLasClases)
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

  // Load clases + teacher-attendance for all visible materias (Por Docente tab)
  async function loadDocentesData() {
    if (docenteDataLoaded || materias.length === 0) return
    try {
      setLoadingDocentes(true)
      const { clases, asistencias } = await getClasesConAsistenciaDocentes(
        materias.map((m) => m.id)
      )
      setDocenteClases(clases)
      setDocenteAsistencias(asistencias)
      setDocenteDataLoaded(true)
    } catch (error) {
      console.error('Error loading docentes data:', error)
    } finally {
      setLoadingDocentes(false)
    }
  }

  // --- Helpers for Por Materia ---
  // Filter clases up to today for statistics calculation.
  // "today" = fin del día calendario argentino (las clases se guardan al
  // mediodía UTC, así la clase de hoy siempre entra sin depender de la TZ).
  const today = new Date(new Date(todayStableFecha()).getTime() + 18 * 60 * 60 * 1000)
  const clasesPasadas = clases.filter((c: any) => new Date(c.fecha) <= today)

  function getAsistenciaStats(alumnoId: string) {
    let presente = 0, ausente = 0, justificado = 0, tardanza = 0
    // Only count clases that have already occurred
    clasesPasadas.forEach((clase: any) => {
      const claseMap = asistenciasMap.get(clase.id)
      const estado = claseMap?.get(alumnoId)?.toLowerCase()
      if (!estado) { ausente++; return }
      if (estado === 'presente') presente++
      else if (estado === 'ausente') ausente++
      else if (estado === 'justificado') justificado++
      else if (estado === 'tardanza') tardanza++
    })
    const total = clasesPasadas.length
    const porcentajeAsistencia = total === 0 ? 0 : Math.round(((presente + justificado) / total) * 100)
    return { presente, ausente, justificado, tardanza, total, porcentajeAsistencia }
  }

  // Calculate average presentes per clase and overall attendance breakdown
  function getGlobalStats() {
    if (clasesPasadas.length === 0 || alumnos.length === 0) {
      return { promedioPresentes: 0, totalPresente: 0, totalAusente: 0, totalJustificado: 0, totalTardanza: 0 }
    }

    let totalPresente = 0, totalAusente = 0, totalJustificado = 0, totalTardanza = 0

    clasesPasadas.forEach((clase: any) => {
      const claseMap = asistenciasMap.get(clase.id)
      if (claseMap) {
        claseMap.forEach((estado) => {
          const s = estado?.toLowerCase()
          if (s === 'presente') totalPresente++
          else if (s === 'ausente') totalAusente++
          else if (s === 'justificado') totalJustificado++
          else if (s === 'tardanza') totalTardanza++
        })
      }
    })

    // Count missing registrations as ausente
    const totalAsistencias = totalPresente + totalAusente + totalJustificado + totalTardanza
    const expectedTotal = clasesPasadas.length * alumnos.length
    const missingAsistencias = expectedTotal - totalAsistencias
    totalAusente += missingAsistencias

    const promedioPresentes = clasesPasadas.length > 0 ? Math.round(totalPresente / clasesPasadas.length) : 0

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

  // --- Por Docente: build docentes list and report rows ---
  // Group docentes across all visible materias by normalized name. A single
  // teacher may appear in several materias with different roles.
  const docentesList = (() => {
    const map = new Map<
      string,
      { key: string; nombre: string; materias: { materiaId: string; rol: string; label: string; materia: any }[] }
    >()
    materias.forEach((materia) => {
      getDocentesFromMateria(materia).forEach((d) => {
        const key = normalizeName(d.nombre)
        if (!key) return
        if (!map.has(key)) map.set(key, { key, nombre: d.nombre, materias: [] })
        map.get(key)!.materias.push({ materiaId: materia.id, rol: d.rol, label: d.label, materia })
      })
    })
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  })()

  // Materias associated with the selected docente (second dropdown)
  const docenteMateriasOptions =
    selectedDocente === 'todos'
      ? []
      : docentesList.find((d) => d.key === selectedDocente)?.materias || []

  // Build one row per docente/materia combination, counting only clases dadas
  // hasta hoy (fecha <= today). "Asistencia registrada" = clase donde el docente
  // fue marcado presente.
  const docenteRows = (() => {
    const groups =
      selectedDocente === 'todos' ? docentesList : docentesList.filter((d) => d.key === selectedDocente)

    // clases (up to today) grouped by materia, ordenadas por fecha asc
    const clasesByMateria = new Map<string, any[]>()
    docenteClases.forEach((c) => {
      if (new Date(c.fecha) > today) return
      if (!clasesByMateria.has(c.materia_id)) clasesByMateria.set(c.materia_id, [])
      clasesByMateria.get(c.materia_id)!.push(c)
    })
    clasesByMateria.forEach((arr) =>
      arr.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    )
    // presente lookup keyed by clase + rol (solo registros explícitos)
    const asistenciaLookup = new Map<string, boolean>()
    docenteAsistencias.forEach((a) => {
      asistenciaLookup.set(`${a.clase_id}::${a.rol}`, a.presente)
    })

    const rows: {
      docente: string
      materia: string
      codigo: string
      label: string
      clasesDadas: number
      clasesRegistradas: number
      inasistencias: number
      porcentaje: number
      inasistenciasDetalle: { fecha: string; comentario: string }[]
    }[] = []

    groups.forEach((group) => {
      group.materias.forEach((entry) => {
        if (
          selectedDocente !== 'todos' &&
          selectedDocenteMateria !== 'todas' &&
          entry.materiaId !== selectedDocenteMateria
        )
          return
        const clases = clasesByMateria.get(entry.materiaId) || []
        const clasesDadas = clases.length
        let clasesRegistradas = 0
        const inasistenciasDetalle: { fecha: string; comentario: string }[] = []
        clases.forEach((c) => {
          // Igual que en el resto de la app (registro de asistencia y export
          // a Excel): si no existe un registro explícito de asistencia_docentes
          // para esta clase/rol, el docente se considera presente por defecto.
          // Antes esto se contaba como "no registrada" (0), lo que subestimaba
          // el % de asistencia de docentes cuyas clases nunca fueron marcadas
          // manualmente.
          const presente = asistenciaLookup.get(`${c.id}::${entry.rol}`) ?? true
          if (presente) {
            clasesRegistradas++
          } else {
            // Inasistencia explícita del docente: se adjunta el comentario de
            // la clase (si lo hubiera) para dar contexto de la ausencia.
            inasistenciasDetalle.push({
              fecha: c.fecha,
              comentario: (c.comentario || '').trim(),
            })
          }
        })
        const inasistencias = inasistenciasDetalle.length
        const porcentaje = clasesDadas === 0 ? 0 : Math.round((clasesRegistradas / clasesDadas) * 100)
        rows.push({
          docente: group.nombre,
          materia: entry.materia.nombre,
          codigo: entry.materia.codigo,
          label: entry.label,
          clasesDadas,
          clasesRegistradas,
          inasistencias,
          porcentaje,
          inasistenciasDetalle,
        })
      })
    })

    return rows.sort((a, b) => a.docente.localeCompare(b.docente) || a.materia.localeCompare(b.materia))
  })()

  // Totales agregados sobre las filas visibles (para las tarjetas resumen).
  const docenteTotals = docenteRows.reduce(
    (acc, r) => {
      acc.clasesDadas += r.clasesDadas
      acc.clasesRegistradas += r.clasesRegistradas
      acc.inasistencias += r.inasistencias
      return acc
    },
    { clasesDadas: 0, clasesRegistradas: 0, inasistencias: 0 }
  )
  const docentePorcentajeGlobal =
    docenteTotals.clasesDadas === 0
      ? 0
      : Math.round((docenteTotals.clasesRegistradas / docenteTotals.clasesDadas) * 100)
  // Filas que tienen al menos una inasistencia con detalle (para la sección
  // de comentarios de inasistencias).
  const filasConInasistencias = docenteRows.filter((r) => r.inasistenciasDetalle.length > 0)

  // Export Excel function
  async function exportToExcel() {
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

    // Cargar asistencia de docentes para todas las clases
    const docentesRows: (string | number)[][] = []
    const docentes = getDocentesFromMateria(currentMateria)
    
    if (docentes.length > 0) {
      // Cargar asistencia de docentes
      const docentesAsistenciaMap = new Map<string, Map<string, boolean>>() // clase_id -> rol -> presente
      await Promise.all(
        clases.map(async (clase) => {
          const asistenciasData = await getAsistenciaDocentes(clase.id)
          const roleMap = new Map<string, boolean>()
          asistenciasData.forEach((a: any) => {
            roleMap.set(a.rol, a.presente)
          })
          docentesAsistenciaMap.set(clase.id, roleMap)
        })
      )

      // Agregar fila en blanco
      docentesRows.push(['', '', '', ...clases.map(() => ''), ''])

      // Agregar filas de docentes
      docentes.forEach((d) => {
        const row: (string | number)[] = [d.label, d.nombre, '']
        let presenteCount = 0
        clases.forEach((clase) => {
          const roleMap = docentesAsistenciaMap.get(clase.id)
          const presente = roleMap?.get(d.rol) ?? true
          const estadoText = presente ? 'P' : 'A'
          row.push(estadoText)
          if (presente) presenteCount++
        })
        // Calcular porcentaje de asistencia del docente
        const porcentajeAsistencia = clases.length > 0 ? Math.round((presenteCount / clases.length) * 100) : 0
        row.push(`${porcentajeAsistencia}%`)
        docentesRows.push(row)
      })
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, ...docentesRows])

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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="por-materia" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Por Materia
            </TabsTrigger>
            <TabsTrigger value="por-alumno" className="gap-2">
              <Users className="h-4 w-4" />
              Por Alumno
            </TabsTrigger>
            <TabsTrigger value="por-docente" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Por Docente
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
                    <Button onClick={() => exportToExcel()} variant="outline" className="gap-2">
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
                      <p className="text-3xl font-bold text-blue-600">{clasesPasadas.length}</p>
                      <p className="text-sm text-muted-foreground">Clases dictadas</p>
                      {clases.length > clasesPasadas.length && (
                        <p className="text-xs text-muted-foreground mt-1">({clases.length - clasesPasadas.length} futuras)</p>
                      )}
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
                    <CardDescription>
                      {currentMateria?.nombre} — Los porcentajes se calculan sobre las {clasesPasadas.length} clases dictadas hasta hoy
                    </CardDescription>
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

          {/* ======================== TAB: Por Docente ======================== */}
          <TabsContent value="por-docente">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Informe de Docentes</CardTitle>
                <CardDescription>
                  Selecciona un docente y, opcionalmente, una de sus materias. El porcentaje se calcula
                  solo sobre las clases dictadas hasta hoy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Selector de docente */}
                  <div className="flex-1">
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Docente</label>
                    <Select
                      value={selectedDocente}
                      onValueChange={(v) => {
                        setSelectedDocente(v)
                        setSelectedDocenteMateria('todas')
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un docente..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los docentes</SelectItem>
                        {docentesList.map((d) => (
                          <SelectItem key={d.key} value={d.key}>
                            {d.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selector de materia (solo cuando hay un docente seleccionado) */}
                  <div className="flex-1">
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Materia</label>
                    <Select
                      value={selectedDocenteMateria}
                      onValueChange={setSelectedDocenteMateria}
                      disabled={selectedDocente === 'todos'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las materias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las materias</SelectItem>
                        {docenteMateriasOptions.map((entry) => (
                          <SelectItem key={`${entry.materiaId}-${entry.rol}`} value={entry.materiaId}>
                            {entry.materia.nombre} — {entry.materia.codigo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loadingDocentes ? (
              <div className="flex justify-center py-12 text-muted-foreground">Cargando datos...</div>
            ) : docentesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <GraduationCap className="h-10 w-10 opacity-30" />
                <p>No hay docentes cargados en las materias</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tarjetas resumen agregadas de la selección actual */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-2">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{docenteTotals.clasesDadas}</p>
                          <p className="text-xs text-muted-foreground">Clases dadas hasta hoy</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-green-100 p-2">
                          <CalendarCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">{docenteTotals.clasesRegistradas}</p>
                          <p className="text-xs text-muted-foreground">Clases con presencia</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-red-100 p-2">
                          <CalendarX className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">{docenteTotals.inasistencias}</p>
                          <p className="text-xs text-muted-foreground">Inasistencias registradas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-2">
                          <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className={`text-2xl font-bold ${getPorcentajeColor(docentePorcentajeGlobal)}`}>
                            {docentePorcentajeGlobal}%
                          </p>
                          <p className="text-xs text-muted-foreground">Asistencia global</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen de asistencia docente</CardTitle>
                    <CardDescription>
                      % asistencia = (clases con presencia / clases dadas hasta hoy) × 100
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Docente</TableHead>
                            <TableHead>Materia</TableHead>
                            <TableHead className="text-center">Clases dadas hasta hoy</TableHead>
                            <TableHead className="text-center">Clases con presencia</TableHead>
                            <TableHead className="text-center">Inasistencias</TableHead>
                            <TableHead className="text-right w-52">% de asistencia</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {docenteRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                                Sin resultados para la selección actual
                              </TableCell>
                            </TableRow>
                          ) : (
                            docenteRows.map((row, i) => (
                              <TableRow key={`${row.docente}-${row.codigo}-${i}`}>
                                <TableCell className="font-medium">
                                  {row.docente}
                                  <span className="block text-xs text-muted-foreground font-normal">{row.label}</span>
                                </TableCell>
                                <TableCell>
                                  {row.materia}
                                  <span className="block text-xs text-muted-foreground">{row.codigo}</span>
                                </TableCell>
                                <TableCell className="text-center font-semibold">{row.clasesDadas}</TableCell>
                                <TableCell className="text-center font-semibold text-green-600">{row.clasesRegistradas}</TableCell>
                                <TableCell className="text-center">
                                  {row.inasistencias > 0 ? (
                                    <Badge variant="destructive">{row.inasistencias}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">0</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end gap-2">
                                    <Progress value={row.porcentaje} className="w-24 h-2" />
                                    <span className={`font-semibold w-10 text-right ${getPorcentajeColor(row.porcentaje)}`}>
                                      {row.porcentaje}%
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Detalle de inasistencias con los comentarios de las clases */}
                {filasConInasistencias.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        Comentarios de clases con inasistencia
                      </CardTitle>
                      <CardDescription>
                        Fechas en las que el docente figura ausente, junto al comentario registrado en la clase.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {filasConInasistencias.map((row, i) => (
                        <div key={`${row.docente}-${row.codigo}-detalle-${i}`}>
                          <div className="flex flex-wrap items-baseline justify-between gap-1 mb-2">
                            <p className="font-medium">
                              {row.docente}
                              <span className="text-xs text-muted-foreground font-normal"> — {row.label}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {row.materia} <span className="text-xs">({row.codigo})</span>
                            </p>
                          </div>
                          <ul className="space-y-2">
                            {row.inasistenciasDetalle.map((det, j) => (
                              <li
                                key={j}
                                className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3"
                              >
                                <div className="flex items-center gap-1.5 shrink-0 text-red-600">
                                  <CalendarX className="h-4 w-4" />
                                  <span className="text-sm font-medium tabular-nums">
                                    {formatDateShort(det.fecha)}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground/80">
                                  {det.comentario ? (
                                    det.comentario
                                  ) : (
                                    <span className="italic text-muted-foreground">Sin comentario registrado</span>
                                  )}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  )
}
