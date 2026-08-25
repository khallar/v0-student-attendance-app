'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  getAllAlumnosWithMaterias,
  createAlumno,
  updateAlumno,
  deleteAlumno,
} from '@/lib/supabase/queries'
import { Pencil, Trash2, Plus, UserPlus, BookOpen, AlertCircle, Search } from 'lucide-react'

interface AlumnoForm {
  nombre: string
  apellido: string
  dni: string
  email: string
}

const EMPTY_FORM: AlumnoForm = { nombre: '', apellido: '', dni: '', email: '' }

export function AlumnosAbm() {
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState<AlumnoForm>(EMPTY_FORM)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await getAllAlumnosWithMaterias()
      setAlumnos(data || [])
    } catch (error) {
      console.error('Error loading alumnos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtra por nombre, apellido, DNI o email. Usa normalización para que la
  // búsqueda ignore acentos/mayúsculas (ej: "peña" encuentra "Peña").
  const filteredAlumnos = useMemo(() => {
    const term = normalize(search.trim())
    if (!term) return alumnos
    return alumnos.filter((a) => {
      const haystack = normalize(
        `${a.nombre || ''} ${a.apellido || ''} ${a.dni || ''} ${a.email || ''}`
      )
      return haystack.includes(term)
    })
  }, [alumnos, search])

  function resetForm() {
    setFormData(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
  }

  function handleNew() {
    resetForm()
    setDialogOpen(true)
  }

  function handleEdit(alumno: any) {
    setFormData({
      nombre: alumno.nombre || '',
      apellido: alumno.apellido || '',
      dni: alumno.dni || '',
      email: alumno.email || '',
    })
    setEditingId(alumno.id)
    setFormError('')
    setDialogOpen(true)
  }

  async function handleSave() {
    setFormError('')
    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      setFormError('El nombre y el apellido son obligatorios.')
      return
    }
    if (!formData.dni.trim()) {
      setFormError('El DNI es obligatorio.')
      return
    }
    try {
      setSaving(true)
      if (editingId) {
        await updateAlumno(
          editingId,
          formData.nombre.trim(),
          formData.apellido.trim(),
          formData.dni.trim(),
          formData.email.trim()
        )
      } else {
        await createAlumno(
          formData.nombre.trim(),
          formData.apellido.trim(),
          formData.dni.trim(),
          formData.email.trim()
        )
      }
      resetForm()
      setDialogOpen(false)
      await loadData()
    } catch (error: any) {
      console.error('Error saving alumno:', error)
      if (error?.code === '23505' || error?.message?.includes('duplicate')) {
        setFormError('Ya existe un alumno con ese DNI.')
      } else {
        setFormError('Error al guardar el alumno.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(alumno: any) {
    const nombre = `${alumno.apellido || ''}, ${alumno.nombre || ''}`.trim()
    if (
      confirm(
        `¿Eliminar al alumno ${nombre}? Se borrarán también sus inscripciones y registros de asistencia. Esta acción no se puede deshacer.`
      )
    ) {
      try {
        await deleteAlumno(alumno.id)
        await loadData()
      } catch (error) {
        console.error('Error deleting alumno:', error)
        alert('No se pudo eliminar el alumno.')
      }
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido, DNI o email"
            className="pl-9"
          />
        </div>
        <Button onClick={handleNew}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo alumno
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-muted-foreground">Cargando alumnos...</div>
        </div>
      ) : alumnos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">No hay alumnos registrados aún</p>
            <Button className="mt-4" onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer alumno
            </Button>
          </CardContent>
        </Card>
      ) : filteredAlumnos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">
              No se encontraron alumnos que coincidan con &quot;{search}&quot;
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apellido y nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Materias</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlumnos.map((alumno) => {
                const materias = (alumno.materia_alumnos || [])
                  .map((ma: any) => ma.materias)
                  .filter(Boolean)
                return (
                  <TableRow key={alumno.id}>
                    <TableCell className="font-medium">
                      {alumno.apellido}, {alumno.nombre}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{alumno.dni || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{alumno.email || '-'}</TableCell>
                    <TableCell>
                      {materias.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {materias.map((m: any) => (
                            <Badge key={m.id} variant="outline" className="text-xs">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {m.codigo || m.nombre}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin materias</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(alumno)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(alumno)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar alumno' : 'Nuevo alumno'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos personales del alumno.'
                : 'Registra un nuevo alumno con sus datos personales.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: María José"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Ej: Núñez"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">DNI</label>
              <Input
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                placeholder="Ej: 40123456"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="alumno@universidad.edu.ar"
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Normaliza texto para búsquedas: minúsculas y sin acentos.
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
