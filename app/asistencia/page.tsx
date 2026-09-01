'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { es } from 'date-fns/locale'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth-guard'
import { AsistenciaGrid } from '@/components/asistencia-grid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  getClasesByMateria, 
  getMaterias, 
  getAlumnosByMateria,
  getAsistenciasByClase,
  upsertAsistencia,
  createClase,
  deleteClase,
  getClaseById,
  updateClaseComentario,
  activateQR,
  isQRValid,
  getQRRemainingTime,
  getCategorias,
  getDocentesFromMateria,
  getAsistenciaDocentes,
  upsertAsistenciaDocente
} from '@/lib/supabase/queries'
import { getMockUser, isAdmin } from '@/lib/auth-mock'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDateShort, toAppDay, appDayKey, todayStableFecha } from '@/lib/utils-attendance'
import { ArrowLeft, Download, Plus, Save, Trash2, QrCode, Copy, Check, Link2, Clock, Play, ImageDown, Folder, Users } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import QRCode from 'react-qr-code'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'

// Devuelve el día calendario (a medianoche local) de una clase, calculado en
// horario de Argentina, para que coincida con lo que muestra el calendario.
function toLocalDay(fecha: string | Date): Date {
  return toAppDay(fecha)
}

// Clave estable por día calendario argentino
function dayKey(date: string | Date): string {
  return appDayKey(date)
}

// Formato largo y legible de una fecha (día calendario argentino)
function formatDateLong(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

// Devuelve el id de la clase más próxima a hoy (menor diferencia absoluta)
function getNearestClaseId(list: any[]): string {
  if (!list.length) return ''
  const now = new Date(todayStableFecha()).getTime()
  let best = list[0]
  let bestDiff = Math.abs(new Date(best.fecha).getTime() - now)
  for (const c of list) {
    const diff = Math.abs(new Date(c.fecha).getTime() - now)
    if (diff < bestDiff) {
      best = c
      bestDiff = diff
    }
  }
  return best.id
}

function AsistenciaPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const materiaIdParam = searchParams.get('materia')
  const claseIdParam = searchParams.get('clase')

  const [materias, setMaterias] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas')
  const [clases, setClases] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [asistencias, setAsistencias] = useState<Record<string, string>>({})
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [assignedCategoriaIds, setAssignedCategoriaIds] = useState<string[]>([])

  const [selectedMateria, setSelectedMateria] = useState(materiaIdParam || '')
  const [selectedClase, setSelectedClase] = useState(claseIdParam || '')
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creatingClase, setCreatingClase] = useState(false)
  const [newClaseDialogOpen, setNewClaseDialogOpen] = useState(false)
  const [newClaseHorario, setNewClaseHorario] = useState('')
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recentUpdates, setRecentUpdates] = useState<string[]>([]) // Track recently updated alumno IDs for visual feedback
  const [comentario, setComentario] = useState('')
  const [qrRemainingTime, setQrRemainingTime] = useState(0)
  const [qrActive, setQrActive] = useState(false)
  const [qrDuration, setQrDuration] = useState('5') // Duration in minutes: '5', '10', '30', or '60'
  const [docentesAsistencia, setDocentesAsistencia] = useState<Record<string, boolean>>({}) // rol -> presente
  const [savingDocentes, setSavingDocentes] = useState(false)

  // Load materias on mount
  useEffect(() => {
    loadMaterias()
  }, [])

  // Load clases when materia changes
  useEffect(() => {
    if (selectedMateria) {
      // Reset sincrónico de asistencias al cambiar de materia. Es el ÚNICO
      // lugar que limpia el mapa, para evitar carreras con loadAsistencias
      // (que es quien carga los valores reales de la clase seleccionada).
      setAsistencias({})
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

  // Subscribe to realtime asistencia updates
  useEffect(() => {
    if (!selectedClase) return

    const supabase = createClient()
    
    const channel = supabase
      .channel(`asistencias-live-${selectedClase}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'asistencias',
          filter: `clase_id=eq.${selectedClase}`,
        },
        (payload) => {
          const newRecord = payload.new as { alumno_id: string; estado: string }
          
          // Update asistencias state
          setAsistencias((prev) => ({
            ...prev,
            [newRecord.alumno_id]: newRecord.estado,
          }))
          
          // Add visual feedback for the updated alumno
          setRecentUpdates((prev) => [...prev, newRecord.alumno_id])
          
          // Remove from recent updates after 3 seconds
          setTimeout(() => {
            setRecentUpdates((prev) => prev.filter((id) => id !== newRecord.alumno_id))
          }, 3000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'asistencias',
          filter: `clase_id=eq.${selectedClase}`,
        },
        (payload) => {
          const newRecord = payload.new as { alumno_id: string; estado: string }
          
          // Update asistencias state
          setAsistencias((prev) => ({
            ...prev,
            [newRecord.alumno_id]: newRecord.estado,
          }))
          
          // Add visual feedback for the updated alumno
          setRecentUpdates((prev) => [...prev, newRecord.alumno_id])
          
          // Remove from recent updates after 3 seconds
          setTimeout(() => {
            setRecentUpdates((prev) => prev.filter((id) => id !== newRecord.alumno_id))
          }, 3000)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[v0] Realtime subscribed for clase:', selectedClase)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedClase])

  async function loadMaterias() {
    try {
      setLoading(true)
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
      if (materiaIdParam) {
        setSelectedMateria(materiaIdParam)
      }
    } catch (error) {
      console.error('Error loading materias:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter materias by selected categoria
  const filteredMaterias = selectedCategoria === 'todas' 
    ? materias 
    : selectedCategoria === 'sin-categoria'
    ? materias.filter(m => !m.categoria_id)
    : materias.filter(m => m.categoria_id === selectedCategoria)

  async function loadClases(materiaId: string) {
    try {
      const data = await getClasesByMateria(materiaId)
      setClases(data)
      if (claseIdParam && data.find((c: any) => c.id === claseIdParam)) {
        // Respetar la clase indicada por la URL
        const clase = data.find((c: any) => c.id === claseIdParam)
        setSelectedClase(claseIdParam)
        if (clase) setCalendarMonth(toLocalDay(clase.fecha))
      } else if (data.length > 0) {
        // Autoseleccionar la clase más próxima a hoy
        const nearestId = getNearestClaseId(data)
        const nearest = data.find((c: any) => c.id === nearestId)
        setSelectedClase(nearestId)
        if (nearest) setCalendarMonth(toLocalDay(nearest.fecha))
      } else {
        setSelectedClase('')
      }
    } catch (error) {
      console.error('Error loading clases:', error)
    }
  }

  async function loadAlumnos(materiaId: string) {
    try {
      const data = await getAlumnosByMateria(materiaId)
      setAlumnos(data)
      // NO reseteamos asistencias acá: loadAsistencias es la única fuente de
      // verdad para la clase seleccionada. Los alumnos sin registro se muestran
      // como "ausente" por defecto en la grilla.
    } catch (error) {
      console.error('Error loading alumnos:', error)
    }
  }

  async function loadAsistencias(claseId: string) {
    try {
      const [data, claseData, docentesData] = await Promise.all([
        getAsistenciasByClase(claseId),
        getClaseById(claseId),
        getAsistenciaDocentes(claseId)
      ])
      // Construimos el mapa directamente desde los registros de asistencia de
      // la clase, sin depender del estado `alumnos` (que puede no haber
      // terminado de cargar). Los alumnos sin registro quedan como "ausente"
      // por defecto en la grilla.
      const newAsistencias: Record<string, string> = {}
      data.forEach((a: any) => {
        newAsistencias[a.alumno_id] = a.estado
      })
      setAsistencias(newAsistencias)
      setComentario(claseData?.comentario || '')

      // Inicializar asistencia de docentes: por defecto todos presentes,
      // salvo que exista un registro previo guardado por el bedel.
      const materia = materias.find((m: any) => m.id === selectedMateria)
      const docentes = getDocentesFromMateria(materia)
      const newDocentes: Record<string, boolean> = {}
      docentes.forEach((d) => {
        const registro = docentesData.find((r: any) => r.rol === d.rol)
        newDocentes[d.rol] = registro ? registro.presente : true
      })
      setDocentesAsistencia(newDocentes)
      
      // Check QR status
      if (isQRValid(claseData?.qr_activo_desde, claseData?.qr_duracion_minutos)) {
        setQrActive(true)
        setQrRemainingTime(getQRRemainingTime(claseData.qr_activo_desde, claseData?.qr_duracion_minutos))
      } else {
        setQrActive(false)
        setQrRemainingTime(0)
      }
    } catch (error) {
      console.error('Error loading asistencias:', error)
    }
  }

  // Timer for QR countdown
  useEffect(() => {
    if (!qrActive || qrRemainingTime <= 0) return
    
    const interval = setInterval(() => {
      setQrRemainingTime((prev) => {
        if (prev <= 1) {
          setQrActive(false)
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [qrActive])

  async function handleCreateClase() {
    if (!selectedMateria || !newClaseHorario) return
    try {
      setCreatingClase(true)
      const now = new Date()
      const fecha = now.toISOString()
      const newClase = await createClase(selectedMateria, fecha, newClaseHorario)
      await loadClases(selectedMateria)
      setSelectedClase(newClase.id)
      setCalendarMonth(toLocalDay(newClase.fecha))
      setNewClaseDialogOpen(false)
      setNewClaseHorario('')
    } catch (error) {
      console.error('Error creating clase:', error)
    } finally {
      setCreatingClase(false)
    }
  }

  function getAutoasistenciaUrl() {
    if (!currentClase?.codigo_autoasistencia) return ''
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/autoasistencia/${currentClase.codigo_autoasistencia}`
  }

  async function handleCopyLink() {
    const url = getAutoasistenciaUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying link:', error)
    }
  }

  function handleDownloadQR() {
    const svgEl = document.getElementById('qr-code-svg')?.querySelector('svg')
    if (!svgEl) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size + 60 // extra space for text below
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    img.crossOrigin = 'anonymous'
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw QR
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)

      // Add materia + date text below
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(currentMateria?.nombre || '', size / 2, size + 22)
      ctx.font = '14px sans-serif'
      ctx.fillStyle = '#64748b'
      ctx.fillText(formatDateShort(currentClase?.fecha) + (currentClase?.horario ? ` - ${currentClase.horario}` : ''), size / 2, size + 44)

      const link = document.createElement('a')
      link.download = `QR_${currentMateria?.codigo}_${formatDateShort(currentClase?.fecha).replace(/\//g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }

  async function handleActivateQR() {
    if (!selectedClase) return
    try {
      const durationMinutes = parseInt(qrDuration, 10)
      await activateQR(selectedClase, durationMinutes)
      setQrActive(true)
      setQrRemainingTime(durationMinutes * 60) // Convert to seconds
      // Guardar la asistencia de docentes al activar el QR (presentes por defecto)
      await handleSaveDocentes()
    } catch (error) {
      console.error('Error activating QR:', error)
    }
  }

  function handleToggleDocente(rol: string, presente: boolean) {
    setDocentesAsistencia((prev) => ({ ...prev, [rol]: presente }))
  }

  async function handleSaveDocentes() {
    if (!selectedClase) return
    const materia = materias.find((m: any) => m.id === selectedMateria)
    const docentes = getDocentesFromMateria(materia)
    if (docentes.length === 0) return
    try {
      setSavingDocentes(true)
      for (const d of docentes) {
        const presente = docentesAsistencia[d.rol] ?? true
        await upsertAsistenciaDocente(selectedClase, d.rol, d.nombre, presente)
      }
    } catch (error) {
      console.error('Error saving docentes asistencia:', error)
    } finally {
      setSavingDocentes(false)
    }
  }

  async function handleDeleteClase(claseId: string) {
    const clase = clases.find((c: any) => c.id === claseId)
    if (!clase) return
    
    const confirmDelete = confirm(
      `¿Estás seguro de eliminar la clase del ${formatDateShort(clase.fecha)}?\n\nEsto eliminará también todas las asistencias registradas.`
    )
    
    if (!confirmDelete) return
    
    try {
      await deleteClase(claseId)
      if (selectedClase === claseId) {
        setSelectedClase('')
        setAsistencias({})
      }
      await loadClases(selectedMateria)
    } catch (error) {
      console.error('Error deleting clase:', error)
      alert('Error al eliminar la clase')
    }
  }

  async function handleSaveAsistencias() {
    if (!selectedClase || !selectedMateria) return
    try {
      setSaving(true)
      // Guardamos un registro por cada alumno de la materia. Los que no tienen
      // estado en el mapa se guardan como "ausente" (el mapa solo contiene
      // los que fueron marcados o ya tenían registro previo).
      for (const alumno of alumnos) {
        const estado = asistencias[alumno.id] || 'ausente'
        await upsertAsistencia(selectedClase, alumno.id, estado)
      }
      // Save comentario
      await updateClaseComentario(selectedClase, comentario)
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
  const currentDocentes = getDocentesFromMateria(currentMateria)

  // Agrupar clases por día (para el calendario)
  const clasesByDayKey = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const c of clases) {
      const key = dayKey(toLocalDay(c.fecha))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return map
  }, [clases])

  // Días que tienen al menos una clase (para marcarlos en el calendario)
  const claseDays = useMemo(
    () => clases.map((c: any) => toLocalDay(c.fecha)),
    [clases],
  )

  // Día actualmente seleccionado
  const selectedDay = currentClase ? toLocalDay(currentClase.fecha) : undefined

  // Clases del día seleccionado (puede haber más de un horario)
  const selectedDayClases = selectedDay
    ? clasesByDayKey.get(dayKey(selectedDay)) || []
    : []

  function handleSelectDay(day: Date | undefined) {
    if (!day) return
    const list = clasesByDayKey.get(dayKey(day))
    if (list && list.length > 0) {
      setSelectedClase(list[0].id)
    }
  }

  function handleDownloadReport() {
    if (!currentClase || !currentMateria || alumnos.length === 0) return

    // Build header row
    const headers = ['Apellido', 'Nombre', 'DNI', 'Email', 'Estado']

    // Build data rows with all alumno data
    const rows = alumnos.map((alumno: any) => {
      const estado = asistencias[alumno.id] || 'ausente'
      let estadoText = 'Ausente'
      if (estado === 'presente') estadoText = 'Presente'
      else if (estado === 'justificado') estadoText = 'Justificado'
      else if (estado === 'tardanza') estadoText = 'Tardanza'
      
      return [
        alumno.apellido,
        alumno.nombre,
        alumno.dni,
        alumno.email || '',
        estadoText,
      ]
    })

    // Agregar asistencia de docentes al final del reporte
    const docentes = getDocentesFromMateria(currentMateria)
    const docenteRows: string[][] = []
    if (docentes.length > 0) {
      docenteRows.push(['', '', '', '', ''])
      docenteRows.push(['DOCENTES', '', '', '', ''])
      docentes.forEach((d) => {
        const presente = docentesAsistencia[d.rol] ?? true
        docenteRows.push([d.label, d.nombre, '', '', presente ? 'Presente' : 'Ausente'])
      })
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, ...docenteRows])

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Apellido
      { wch: 20 }, // Nombre
      { wch: 12 }, // DNI
      { wch: 30 }, // Email
      { wch: 12 }, // Estado
    ]

    // Create workbook and export
    const wb = XLSX.utils.book_new()
    const fechaStr = formatDateShort(currentClase.fecha).replace(/\//g, '-')
    const sheetName = `Asistencia ${fechaStr}`.slice(0, 31) // Excel sheet name max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    
    const fileName = `Asistencia_${currentMateria.codigo}_${fechaStr}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

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
          {/* Categoria filter */}
          {categorias.length > 0 && (
            <div className="mb-4 pb-4 border-b">
              <div className="flex flex-wrap items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground mr-1">Categoría:</span>
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
                  Sin categoría
                </Badge>
              </div>
            </div>
          )}

          {/* Seleccionar Materia */}
          <div className="mb-6 max-w-md">
            <label className="block text-sm font-medium mb-2">Materia</label>
            <Select value={selectedMateria} onValueChange={setSelectedMateria}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar materia..." />
              </SelectTrigger>
              <SelectContent>
                {filteredMaterias.map((materia) => (
                  <SelectItem key={materia.id} value={materia.id}>
                    <div className="flex items-center gap-2">
                      {materia.categorias && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: materia.categorias.color }} />
                      )}
                      {materia.nombre}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleccionar Clase mediante calendario */}
          {selectedMateria && (
            <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
              {/* Calendario */}
              <div>
                <label className="block text-sm font-medium mb-2">Clase</label>
                {clases.length > 0 ? (
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={selectedDay}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    onSelect={handleSelectDay}
                    disabled={(date) => !clasesByDayKey.has(dayKey(date))}
                    modifiers={{ hasClase: claseDays }}
                    modifiersClassNames={{
                      hasClase: 'font-semibold underline underline-offset-4 decoration-primary',
                    }}
                    className="rounded-lg border w-fit"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground rounded-lg border p-4 max-w-xs">
                    Todavía no hay clases para esta materia. Creá la primera con "Nueva clase".
                  </p>
                )}
              </div>

              {/* Detalle de la clase seleccionada + acciones */}
              <div className="space-y-4">
                {/* Si hay varios horarios en el mismo día, permitir elegir */}
                {selectedDayClases.length > 1 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Horarios de este día</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDayClases.map((c: any) => (
                        <Button
                          key={c.id}
                          variant={selectedClase === c.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedClase(c.id)}
                        >
                          {c.horario || 'Sin horario'}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {currentClase && (
                  <div className="rounded-lg border p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Clase seleccionada</p>
                      <p className="text-lg font-semibold capitalize mt-1">{formatDateLong(currentClase.fecha)}</p>
                      {currentClase.horario && (
                        <p className="text-sm text-muted-foreground">{currentClase.horario}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteClase(selectedClase)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      title="Eliminar clase"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Botón crear clase */}
                <Dialog open={newClaseDialogOpen} onOpenChange={setNewClaseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedMateria} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva clase
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nueva Clase</DialogTitle>
                      <DialogDescription>
                        Crear una nueva clase para {currentMateria?.nombre}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-medium">Horario de la clase</label>
                        <Input
                          type="text"
                          value={newClaseHorario}
                          onChange={(e) => setNewClaseHorario(e.target.value)}
                          placeholder="Ej: 18:00 - 22:00"
                          className="mt-2"
                        />
                      </div>
                      <Button
                        onClick={handleCreateClase}
                        disabled={!newClaseHorario || creatingClase}
                        className="w-full"
                      >
                        {creatingClase ? 'Creando...' : 'Crear Clase'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </Card>

        {selectedClase && alumnos.length > 0 && (
          <>
            <Card className="mb-6">
              <div className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{currentMateria?.nombre}</h2>
                    <p className="text-sm text-muted-foreground">
                      {alumnos.length} alumnos - {formatDateShort(currentClase?.fecha)} {currentClase?.horario ? `- ${currentClase.horario}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="default">
                          <QrCode className="mr-2 h-4 w-4" />
                          Autoasistencia QR
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Autoasistencia para Alumnos</DialogTitle>
                          <DialogDescription>
                            Selecciona el tiempo de vida del QR para que los alumnos marquen su presente
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-6 py-6">
                          {/* QR Status indicator */}
                          {qrActive ? (
                            <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg w-full ${
                              qrRemainingTime <= 60 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              <Clock className="h-5 w-5" />
                              <span className="font-mono font-bold text-xl">
                                {Math.floor(qrRemainingTime / 60)}:{(qrRemainingTime % 60).toString().padStart(2, '0')}
                              </span>
                              <span className="text-sm">restantes</span>
                            </div>
                          ) : (
                            <div className="bg-orange-100 text-orange-700 py-2 px-4 rounded-lg w-full text-center">
                              <p className="font-medium">QR inactivo</p>
                              <p className="text-sm">Presiona el botón para activar</p>
                            </div>
                          )}

                          {/* Asistencia de docentes (solo la registra el bedel manualmente) */}
                          {currentDocentes.length > 0 && (
                            <div className="w-full rounded-lg border p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Asistencia de docentes</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Por defecto todos los docentes figuran como presentes. Desmarca los que estén ausentes.
                              </p>
                              <div className="space-y-2">
                                {currentDocentes.map((d) => (
                                  <label
                                    key={d.rol}
                                    htmlFor={`docente-${d.rol}`}
                                    className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 cursor-pointer"
                                  >
                                    <Checkbox
                                      id={`docente-${d.rol}`}
                                      checked={docentesAsistencia[d.rol] ?? true}
                                      onCheckedChange={(checked) => handleToggleDocente(d.rol, checked === true)}
                                    />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">{d.nombre}</div>
                                      <div className="text-xs text-muted-foreground">{d.label}</div>
                                    </div>
                                    <span className={`text-xs font-medium ${(docentesAsistencia[d.rol] ?? true) ? 'text-green-600' : 'text-red-600'}`}>
                                      {(docentesAsistencia[d.rol] ?? true) ? 'Presente' : 'Ausente'}
                                    </span>
                                  </label>
                                ))}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={handleSaveDocentes}
                                disabled={savingDocentes}
                              >
                                <Save className="mr-2 h-4 w-4" />
                                {savingDocentes ? 'Guardando...' : 'Guardar asistencia de docentes'}
                              </Button>
                            </div>
                          )}
                          
                          {/* Duration selector and Activate button */}
                          {!qrActive && (
                            <div className="w-full space-y-3">
                              <div>
                                <label className="text-sm font-medium block mb-2">Tiempo de vida del QR</label>
                                <Select value={qrDuration} onValueChange={setQrDuration}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="5">5 minutos</SelectItem>
                                    <SelectItem value="10">10 minutos</SelectItem>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                    <SelectItem value="60">60 minutos</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button 
                                onClick={handleActivateQR}
                                className="w-full bg-green-600 hover:bg-green-700"
                                size="lg"
                              >
                                <Play className="mr-2 h-5 w-5" />
                                Activar QR ({qrDuration} minutos)
                              </Button>
                            </div>
                          )}
                          
                          {/* QR Code - only show when active */}
                          {qrActive && (
                            <>
                              <div id="qr-code-svg" className="bg-white p-4 rounded-lg border-4 border-green-500">
                                <QRCode 
                                  value={getAutoasistenciaUrl()} 
                                  size={200}
                                  level="H"
                                />
                              </div>
                              <div className="flex gap-2 w-full">
                                <Button
                                  variant="outline"
                                  className="flex-1 gap-2"
                                  onClick={handleDownloadQR}
                                >
                                  <ImageDown className="h-4 w-4" />
                                  Descargar QR
                                </Button>
                              </div>
                              <div className="w-full space-y-2">
                                <label className="text-sm font-medium">Link de autoasistencia:</label>
                                <div className="flex gap-2">
                                  <Input 
                                    value={getAutoasistenciaUrl()} 
                                    readOnly 
                                    className="text-xs"
                                  />
                                  <Button 
                                    size="icon" 
                                    variant="outline"
                                    onClick={handleCopyLink}
                                  >
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                          
                          <div className="text-center text-sm text-muted-foreground">
                            <p><strong>Materia:</strong> {currentMateria?.nombre}</p>
                            <p><strong>Clase:</strong> {formatDateShort(currentClase?.fecha)} {currentClase?.horario ? `- ${currentClase.horario}` : ''}</p>
                            <p className="mt-2 text-xs">Codigo: <span className="font-mono font-bold">{currentClase?.codigo_autoasistencia}</span></p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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

            <Card className="mb-6">
              <div className="p-6">
                <label className="block text-sm font-medium mb-2">Comentario de la clase</label>
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Agregar notas o comentarios sobre esta clase..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </Card>

            <Card className="mb-8">
              <div className="p-6">
                <AsistenciaGrid
                  alumnos={alumnos}
                  asistencias={asistencias}
                  onAsistenciaChange={handleAsistenciaChange}
                  loading={loading}
                  recentUpdates={recentUpdates}
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
              <Button variant="outline" size="lg" onClick={handleDownloadReport}>
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
              <Button onClick={() => setNewClaseDialogOpen(true)}>
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

export default function AsistenciaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    }>
      <AsistenciaPageContent />
    </Suspense>
  )
}
