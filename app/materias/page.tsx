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
import { getMaterias, createMateria, updateMateria, deleteMateria, generateClasesForMateria, regenerateClasesForMateria, getCategorias, createCategoria, deleteCategoria } from '@/lib/supabase/queries'
import { getMockUser, isAdmin } from '@/lib/auth-mock'
import { Pencil, Trash2, Plus, Users, MapPin, FolderPlus, Folder, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  const [categorias, setCategorias] = useState<any[]>([])
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [assignedCategoriaIds, setAssignedCategoriaIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas')
  const [newCategoriaNombre, setNewCategoriaNombre] = useState('')
  const [newCategoriaColor, setNewCategoriaColor] = useState('#3b82f6')
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    profesor: '',
    repeticion: 'nunca',
    fecha_inicio: '',
    fecha_fin: '',
    dias_dictado: [] as string[],
    ubicacion: '',
    horarios_por_dia: {} as Record<string, { desde: string; hasta: string }>,
    categoria_id: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
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
        // Los usuarios no-admin solo ven sus categorías asignadas y las
        // materias que pertenecen a ellas.
        const assignedSet = new Set(assigned)
        setCategorias(categoriasData.filter((c: any) => assignedSet.has(c.id)))
        setMaterias(materiasData.filter((m: any) => m.categoria_id && assignedSet.has(m.categoria_id)))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCategoria() {
    if (!newCategoriaNombre.trim()) return
    try {
      await createCategoria(newCategoriaNombre.trim(), '', newCategoriaColor)
      setNewCategoriaNombre('')
      setNewCategoriaColor('#3b82f6')
      setCategoriaDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error('Error creating categoria:', error)
    }
  }

  async function handleDeleteCategoria(id: string) {
    if (confirm('¿Eliminar esta categoría? Las materias quedarán sin categoría.')) {
      try {
        await deleteCategoria(id)
        if (selectedCategoria === id) setSelectedCategoria('todas')
        await loadData()
      } catch (error) {
        console.error('Error deleting categoria:', error)
      }
    }
  }

  // Filter materias by selected categoria
  const filteredMaterias = selectedCategoria === 'todas' 
    ? materias 
    : selectedCategoria === 'sin-categoria'
    ? materias.filter(m => !m.categoria_id)
    : materias.filter(m => m.categoria_id === selectedCategoria)

  async function handleSave() {
    // Los usuarios no-admin deben crear/editar materias dentro de una de sus
    // categorías asignadas.
    if (!isUserAdmin) {
      if (!formData.categoria_id) {
        alert('Debes seleccionar una categoría asignada para la materia.')
        return
      }
      if (!assignedCategoriaIds.includes(formData.categoria_id)) {
        alert('Solo puedes crear materias dentro de tus categorías asignadas.')
        return
      }
    }

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
          '', // hora_desde deprecated
          '', // hora_hasta deprecated
          formData.ubicacion,
          formData.horarios_por_dia,
          formData.categoria_id
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
            '', // hora_desde deprecated
            '', // hora_hasta deprecated
            formData.ubicacion,
            formData.horarios_por_dia
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
          '', // hora_desde deprecated
          '', // hora_hasta deprecated
          formData.ubicacion,
          formData.horarios_por_dia,
          formData.categoria_id
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
            '', // hora_desde deprecated
            '', // hora_hasta deprecated
            formData.ubicacion,
            formData.horarios_por_dia
          )
          alert(`Se crearon ${clases.length} clases automaticamente.`)
        }
      }
      resetForm()
      setDialogOpen(false)
      await loadData()
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
      ubicacion: '',
      horarios_por_dia: {},
      categoria_id: '',
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
      ubicacion: materia.ubicacion || '',
      horarios_por_dia: materia.horarios_por_dia || {},
      categoria_id: materia.categoria_id || '',
    })
    setEditingId(materia.id)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta materia?')) {
      try {
        await deleteMateria(id)
        await loadData()
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
    setFormData((prev) => {
      const isSelected = prev.dias_dictado.includes(day)
      const newDias = isSelected
        ? prev.dias_dictado.filter((d) => d !== day)
        : [...prev.dias_dictado, day]
      
      // Also update horarios_por_dia
      const newHorarios = { ...prev.horarios_por_dia }
      if (isSelected) {
        delete newHorarios[day]
      } else {
        // Initialize with empty hours
        newHorarios[day] = { desde: '', hasta: '' }
      }
      
      return { ...prev, dias_dictado: newDias, horarios_por_dia: newHorarios }
    })
  }

  function updateHorarioDia(day: string, field: 'desde' | 'hasta', value: string) {
    setFormData((prev) => ({
      ...prev,
      horarios_por_dia: {
        ...prev.horarios_por_dia,
        [day]: { ...prev.horarios_por_dia[day], [field]: value },
      },
    }))
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Materias</h1>
            <p className="text-muted-foreground">Gestiona las materias y programa sus horarios</p>
          </div>
          <div className="flex gap-2">
            {isUserAdmin && (
            <Dialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nueva categoría
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva categoría</DialogTitle>
                  <DialogDescription>Crea una categoría para organizar tus materias</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Nombre</label>
                    <Input
                      value={newCategoriaNombre}
                      onChange={(e) => setNewCategoriaNombre(e.target.value)}
                      placeholder="Ej: Primer Año, Electivas, etc."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2 mt-2">
                      {['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${newCategoriaColor === color ? 'border-foreground' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewCategoriaColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setCategoriaDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateCategoria} disabled={!newCategoriaNombre.trim()}>Crear</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            )}
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
                  <div>
                    <label className="text-sm font-medium">Ubicacion</label>
                    <Input
                      value={formData.ubicacion}
                      onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                      placeholder="Ej: Aula 101, Edificio A"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Categoría{!isUserAdmin && <span className="text-destructive"> *</span>}
                    </label>
                    <Select 
                      value={formData.categoria_id || 'none'} 
                      onValueChange={(value) => setFormData({ ...formData, categoria_id: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isUserAdmin ? 'Sin categoría' : 'Selecciona una categoría'} />
                      </SelectTrigger>
                      <SelectContent>
                        {isUserAdmin && <SelectItem value="none">Sin categoría</SelectItem>}
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.nombre}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                  <div>
                    <label className="text-sm font-medium mb-3 block">Días de Dictado y Horarios</label>
                    <div className="space-y-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = formData.dias_dictado.includes(day.key)
                        return (
                          <div key={day.key} className="flex items-center gap-3">
                            <Checkbox
                              id={`day-${day.key}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleDay(day.key)}
                            />
                            <label htmlFor={`day-${day.key}`} className="text-sm cursor-pointer w-20">
                              {day.label}
                            </label>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={formData.horarios_por_dia[day.key]?.desde || ''}
                                  onChange={(e) => updateHorarioDia(day.key, 'desde', e.target.value)}
                                  className="w-28"
                                />
                                <span className="text-muted-foreground">a</span>
                                <Input
                                  type="time"
                                  value={formData.horarios_por_dia[day.key]?.hasta || ''}
                                  onChange={(e) => updateHorarioDia(day.key, 'hasta', e.target.value)}
                                  className="w-28"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
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
        </div>

        {/* Categoria filter */}
        {categorias.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-2">Filtrar por categoría:</span>
              <Badge
                variant={selectedCategoria === 'todas' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategoria('todas')}
              >
                Todas ({materias.length})
              </Badge>
              {categorias.map((cat) => {
                const count = materias.filter(m => m.categoria_id === cat.id).length
                return (
                  <div key={cat.id} className="flex items-center">
                    <Badge
                      variant={selectedCategoria === cat.id ? 'default' : 'outline'}
                      className="cursor-pointer flex items-center gap-1.5"
                      style={selectedCategoria === cat.id ? { backgroundColor: cat.color } : {}}
                      onClick={() => setSelectedCategoria(cat.id)}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCategoria === cat.id ? '#fff' : cat.color }} />
                      {cat.nombre} ({count})
                    </Badge>
                    {isUserAdmin && (
                      <button
                        className="ml-1 text-muted-foreground hover:text-red-600 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategoria(cat.id) }}
                        title="Eliminar categoría"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )
              })}
              {isUserAdmin && (
                <Badge
                  variant={selectedCategoria === 'sin-categoria' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategoria('sin-categoria')}
                >
                  Sin categoría ({materias.filter(m => !m.categoria_id).length})
                </Badge>
              )}
            </div>
          </div>
        )}

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
                  <TableHead>Categoría</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Profesor</TableHead>
                  <TableHead>Horario / Ubicacion</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterias.map((materia) => (
                  <TableRow key={materia.id}>
                    <TableCell className="font-medium">{materia.nombre}</TableCell>
                    <TableCell>
                      {materia.categorias ? (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: materia.categorias.color, color: materia.categorias.color }}
                        >
                          <Folder className="h-3 w-3 mr-1" style={{ fill: materia.categorias.color }} />
                          {materia.categorias.nombre}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{materia.codigo}</TableCell>
                    <TableCell>{materia.profesor}</TableCell>
                    <TableCell className="text-sm">
                      {materia.dias_dictado && materia.dias_dictado.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-xs space-y-0.5">
                            {materia.dias_dictado.map((d: string) => {
                              const day = DAYS_OF_WEEK.find((day) => day.key === d)
                              const h = materia.horarios_por_dia?.[d]
                              return (
                                <div key={d}>
                                  <span className="font-medium">{day?.label.slice(0, 2)}</span>: {h?.desde || '-'} - {h?.hasta || '-'}
                                </div>
                              )
                            })}
                          </div>
                          {materia.ubicacion && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {materia.ubicacion}
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
