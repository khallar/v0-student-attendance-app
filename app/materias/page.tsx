'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { getMaterias, createMateria, updateMateria, deleteMateria, generateClasesForMateria, regenerateClasesForMateria } from '@/lib/supabase/queries'
import { Pencil, Trash2, Plus, Users } from 'lucide-react'
import Link from 'next/link'

const DAYS_OF_WEEK = [
  { key: 'l', label: 'Lunes' },
  { key: 'm', label: 'Martes' },
  { key: 'x', label: 'Miércoles' },
  { key: 'j', label: 'Jueves' },
  { key: 'v', label: 'Viernes' },
  { key: 's', label: 'Sábado' },
  { key: 'd', label: 'Domingo' },
]

const REPETICION_OPTIONS = [
  { value: 'nunca', label: 'Nunca' },
  { value: 'cada_dia', label: 'Cada día' },
  { value: 'cada_semana', label: 'Cada semana' },
  { value: 'cada_2_semanas', label: 'Cada 2 semanas' },
  { value: 'cada_mes', label: 'Cada mes' },
  { value: 'cada_ano', label: 'Cada año' },
]

export default function MateriasPage() {
  const [materias, setMaterias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    profesor: '',
    repeticion: 'nunca',
    fecha_inicio: '',
    fecha_fin: '',
    dias_dictado: [] as string[],
    hora_desde: '',
    hora_hasta: '',
  })

  useEffect(() => {
    loadMaterias()
  }, [])

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

  async function handleSave() {
    try {
      setSaving(true)
      let materiaId: string
      
      if (editingId) {
        const materia = await updateMateria(
          editingId,
          formData.nombre,
          formData.codigo,
          formData.profesor,
          formData.repeticion,
          formData.fecha_inicio,
          formData.fecha_fin,
          formData.dias_dictado,
          formData.hora_desde,
          formData.hora_hasta
        )
        materiaId = materia.id
        
        // Regenerate clases if schedule changed
        if (formData.repeticion !== 'nunca' && formData.fecha_inicio && formData.fecha_fin) {
          const clases = await regenerateClasesForMateria(
            materiaId,
            formData.repeticion,
            formData.fecha_inicio,
            formData.fecha_fin,
            formData.dias_dictado,
            formData.hora_desde,
            formData.hora_hasta
          )
          alert(`Se regeneraron ${clases.length} clases automaticamente.`)
        }
      } else {
        const materia = await createMateria(
          formData.nombre,
          formData.codigo,
          formData.profesor,
          formData.repeticion,
          formData.fecha_inicio,
          formData.fecha_fin,
          formData.dias_dictado,
          formData.hora_desde,
          formData.hora_hasta
        )
        materiaId = materia.id
        
        // Generate clases for new materia
        if (formData.repeticion !== 'nunca' && formData.fecha_inicio && formData.fecha_fin) {
          const clases = await generateClasesForMateria(
            materiaId,
            formData.repeticion,
            formData.fecha_inicio,
            formData.fecha_fin,
            formData.dias_dictado,
            formData.hora_desde,
            formData.hora_hasta
          )
          alert(`Se crearon ${clases.length} clases automaticamente.`)
        }
      }
      resetForm()
      setDialogOpen(false)
      await loadMaterias()
    } catch (error) {
      console.error('Error saving materia:', error)
      alert('Error al guardar la materia')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setFormData({
      nombre: '',
      codigo: '',
      profesor: '',
      repeticion: 'nunca',
      fecha_inicio: '',
      fecha_fin: '',
      dias_dictado: [],
      hora_desde: '',
      hora_hasta: '',
    })
    setEditingId(null)
  }

  function handleEdit(materia: any) {
    setFormData({
      nombre: materia.nombre,
      codigo: materia.codigo,
      profesor: materia.profesor,
      repeticion: materia.repeticion || 'nunca',
      fecha_inicio: materia.fecha_inicio ? materia.fecha_inicio.split('T')[0] : '',
      fecha_fin: materia.fecha_fin ? materia.fecha_fin.split('T')[0] : '',
      dias_dictado: materia.dias_dictado || [],
      hora_desde: materia.hora_desde || '',
      hora_hasta: materia.hora_hasta || '',
    })
    setEditingId(materia.id)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta materia?')) {
      try {
        await deleteMateria(id)
        await loadMaterias()
      } catch (error) {
        console.error('Error deleting materia:', error)
      }
    }
  }

  function handleNewMateria() {
    resetForm()
    setDialogOpen(true)
  }

  function toggleDay(day: string) {
    setFormData((prev) => ({
      ...prev,
      dias_dictado: prev.dias_dictado.includes(day)
        ? prev.dias_dictado.filter((d) => d !== day)
        : [...prev.dias_dictado, day],
    }))
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Materias</h1>
            <p className="text-muted-foreground">Gestiona las materias y programa sus horarios</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewMateria}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva materia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar materia' : 'Nueva materia'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Modifica los datos de la materia' : 'Crea una nueva materia con su horario'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Datos básicos */}
                <div className="space-y-3 border-b pb-4">
                  <h3 className="font-semibold text-sm">Datos Básicos</h3>
                  <div>
                    <label className="text-sm font-medium">Nombre</label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Programación I"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Código</label>
                    <Input
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="Ej: PROG-001"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Profesor</label>
                    <Input
                      value={formData.profesor}
                      onChange={(e) => setFormData({ ...formData, profesor: e.target.value })}
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                </div>

                {/* Horario y repetición */}
                <div className="space-y-3 border-b pb-4">
                  <h3 className="font-semibold text-sm">Programación</h3>
                  <div>
                    <label className="text-sm font-medium">Repetición</label>
                    <Select value={formData.repeticion} onValueChange={(value) => setFormData({ ...formData, repeticion: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPETICION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Hora Desde</label>
                      <Input
                        type="time"
                        value={formData.hora_desde}
                        onChange={(e) => setFormData({ ...formData, hora_desde: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Hora Hasta</label>
                      <Input
                        type="time"
                        value={formData.hora_hasta}
                        onChange={(e) => setFormData({ ...formData, hora_hasta: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-3 block">Días de Dictado</label>
                    <div className="grid grid-cols-4 gap-3">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day.key} className="flex items-center gap-2">
                          <Checkbox
                            id={`day-${day.key}`}
                            checked={formData.dias_dictado.includes(day.key)}
                            onCheckedChange={() => toggleDay(day.key)}
                          />
                          <label htmlFor={`day-${day.key}`} className="text-sm cursor-pointer">
                            {day.label.slice(0, 1)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fechas */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Rango de Fechas</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Fecha de Inicio</label>
                      <Input
                        type="date"
                        value={formData.fecha_inicio}
                        onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fecha de Fin</label>
                      <Input
                        type="date"
                        value={formData.fecha_fin}
                        onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!formData.nombre || !formData.codigo || saving}
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Cargando materias...</div>
          </div>
        ) : materias.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No hay materias creadas aún</p>
              <Button className="mt-4" onClick={handleNewMateria}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primera materia
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Profesor</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materias.map((materia) => (
                  <TableRow key={materia.id}>
                    <TableCell className="font-medium">{materia.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{materia.codigo}</TableCell>
                    <TableCell>{materia.profesor}</TableCell>
                    <TableCell className="text-sm">
                      {materia.hora_desde && materia.hora_hasta ? (
                        <div className="space-y-1">
                          <div>{materia.hora_desde} - {materia.hora_hasta}</div>
                          {materia.dias_dictado && materia.dias_dictado.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {materia.dias_dictado.map((d: string) => {
                                const day = DAYS_OF_WEEK.find((day) => day.key === d)
                                return day?.label.slice(0, 1)
                              }).join('/')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No configurado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="Gestionar alumnos"
                        >
                          <Link href={`/materias/${materia.id}`}>
                            <Users className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(materia)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(materia.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AuthGuard>
  )
}
