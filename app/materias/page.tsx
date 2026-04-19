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
import { Label } from '@/components/ui/label'
import { getMaterias, createMateria, updateMateria, deleteMateria } from '@/lib/supabase/queries'
import { Pencil, Trash2, Plus, Users } from 'lucide-react'
import Link from 'next/link'

const DIAS_SEMANA = [
  { label: 'Lunes', value: 'L' },
  { label: 'Martes', value: 'M' },
  { label: 'Miércoles', value: 'X' },
  { label: 'Jueves', value: 'J' },
  { label: 'Viernes', value: 'V' },
  { label: 'Sábado', value: 'S' },
  { label: 'Domingo', value: 'D' }
]

const OPCIONES_REPETICION = [
  { label: 'Nunca', value: 'nunca' },
  { label: 'Cada día', value: 'cada_dia' },
  { label: 'Cada semana', value: 'cada_semana' },
  { label: 'Cada 2 semanas', value: 'cada_2_semanas' },
  { label: 'Cada mes', value: 'cada_mes' },
  { label: 'Cada año', value: 'cada_ano' }
]

export default function MateriasPage() {
  const [materias, setMaterias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
    hora_hasta: ''
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
      const dias_dictado_str = formData.dias_dictado.length > 0 ? formData.dias_dictado.join('') : null
      if (editingId) {
        await updateMateria(
          editingId,
          formData.nombre,
          formData.codigo,
          formData.profesor,
          formData.repeticion,
          formData.fecha_inicio || undefined,
          formData.fecha_fin || undefined,
          dias_dictado_str || undefined,
          formData.hora_desde || undefined,
          formData.hora_hasta || undefined
        )
      } else {
        await createMateria(
          formData.nombre,
          formData.codigo,
          formData.profesor,
          formData.repeticion,
          formData.fecha_inicio || undefined,
          formData.fecha_fin || undefined,
          dias_dictado_str || undefined,
          formData.hora_desde || undefined,
          formData.hora_hasta || undefined
        )
      }
      setFormData({ nombre: '', codigo: '', profesor: '', repeticion: 'nunca', fecha_inicio: '', fecha_fin: '', dias_dictado: [], hora_desde: '', hora_hasta: '' })
      setEditingId(null)
      setDialogOpen(false)
      await loadMaterias()
    } catch (error) {
      console.error('Error saving materia:', error)
    }
  }

  function handleEdit(materia: any) {
    const dias = materia.dias_dictado ? materia.dias_dictado.split('') : []
    setFormData({
      nombre: materia.nombre,
      codigo: materia.codigo,
      profesor: materia.profesor,
      repeticion: materia.repeticion || 'nunca',
      fecha_inicio: materia.fecha_inicio || '',
      fecha_fin: materia.fecha_fin || '',
      dias_dictado: dias,
      hora_desde: materia.hora_desde || '',
      hora_hasta: materia.hora_hasta || ''
    })
    setEditingId(materia.id)
    setDialogOpen(true)
  }

  function handleNewMateria() {
    setFormData({ nombre: '', codigo: '', profesor: '', repeticion: 'nunca', fecha_inicio: '', fecha_fin: '', dias_dictado: [], hora_desde: '', hora_hasta: '' })
    setEditingId(null)
    setDialogOpen(true)
  }

  function toggleDia(dia: string) {
    setFormData(prev => ({
      ...prev,
      dias_dictado: prev.dias_dictado.includes(dia)
        ? prev.dias_dictado.filter(d => d !== dia)
        : [...prev.dias_dictado, dia]
    }))
  }
      setFormData({ nombre: '', codigo: '', profesor: '' })
      setEditingId(null)
      setDialogOpen(false)
      await loadMaterias()
    } catch (error) {
      console.error('Error saving materia:', error)
    }
  }

  function handleEdit(materia: any) {
    setFormData({ nombre: materia.nombre, codigo: materia.codigo, profesor: materia.profesor })
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
    setFormData({ nombre: '', codigo: '', profesor: '' })
    setEditingId(null)
    setDialogOpen(true)
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Materias</h1>
            <p className="text-muted-foreground">Gestiona las materias y asigna profesores</p>
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
                  {editingId ? 'Modifica los datos de la materia' : 'Crea una nueva materia'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Básico */}
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div>
                  <label className="text-sm font-medium">Profesor</label>
                  <Input
                    value={formData.profesor}
                    onChange={(e) => setFormData({ ...formData, profesor: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                {/* Horario */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Horario de Dictado</h3>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Repetición</label>
                    <Select value={formData.repeticion} onValueChange={(value) => setFormData({ ...formData, repeticion: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPCIONES_REPETICION.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.repeticion !== 'nunca' && (
                    <>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-sm font-medium">Fecha de inicio</label>
                          <Input
                            type="date"
                            value={formData.fecha_inicio}
                            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Fecha de fin</label>
                          <Input
                            type="date"
                            value={formData.fecha_fin}
                            onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-sm font-medium mb-3 block">Días de dictado</label>
                        <div className="grid grid-cols-4 gap-3">
                          {DIAS_SEMANA.map(dia => (
                            <div key={dia.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`dia-${dia.value}`}
                                checked={formData.dias_dictado.includes(dia.value)}
                                onCheckedChange={() => toggleDia(dia.value)}
                              />
                              <Label htmlFor={`dia-${dia.value}`} className="text-sm cursor-pointer">
                                {dia.label.substring(0, 3)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-sm font-medium">Hora desde</label>
                          <Input
                            type="time"
                            value={formData.hora_desde}
                            onChange={(e) => setFormData({ ...formData, hora_desde: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Hora hasta</label>
                          <Input
                            type="time"
                            value={formData.hora_hasta}
                            onChange={(e) => setFormData({ ...formData, hora_hasta: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2 justify-end border-t pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.nombre || !formData.codigo}>
                    Guardar
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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materias.map((materia) => (
                  <TableRow key={materia.id}>
                    <TableCell className="font-medium">{materia.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{materia.codigo}</TableCell>
                    <TableCell>{materia.profesor}</TableCell>
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
