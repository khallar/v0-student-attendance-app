'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getMaterias, createMateria, updateMateria, deleteMateria } from '@/lib/supabase/queries'
import { Pencil, Trash2, Plus, Users } from 'lucide-react'
import Link from 'next/link'

export default function MateriasPage() {
  const [materias, setMaterias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ nombre: '', codigo: '', profesor: '' })

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
      if (editingId) {
        await updateMateria(editingId, formData.nombre, formData.codigo, formData.profesor)
      } else {
        await createMateria(formData.nombre, formData.codigo, formData.profesor)
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar materia' : 'Nueva materia'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Modifica los datos de la materia' : 'Crea una nueva materia'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                <div className="flex gap-2 justify-end">
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
