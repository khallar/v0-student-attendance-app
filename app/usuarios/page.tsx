'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getCategorias } from '@/lib/supabase/queries'
import { getMockUser, isAdmin } from '@/lib/auth-mock'
import { Pencil, Trash2, Plus, UserPlus, Folder, AlertCircle } from 'lucide-react'

export default function UsuariosPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    categoriaIds: [] as string[],
  })

  useEffect(() => {
    const user = getMockUser()
    if (!isAdmin(user)) {
      setAllowed(false)
      router.replace('/dashboard')
      return
    }
    setAllowed(true)
    loadData()
  }, [router])

  async function loadData() {
    try {
      setLoading(true)
      const [usuariosData, categoriasData] = await Promise.all([getUsuarios(), getCategorias()])
      setUsuarios(usuariosData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error loading usuarios:', error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({ email: '', password: '', nombre: '', categoriaIds: [] })
    setEditingId(null)
    setFormError('')
  }

  function handleNew() {
    resetForm()
    setDialogOpen(true)
  }

  function handleEdit(usuario: any) {
    setFormData({
      email: usuario.email,
      password: '',
      nombre: usuario.nombre || '',
      categoriaIds: usuario.categoria_ids || [],
    })
    setEditingId(usuario.id)
    setFormError('')
    setDialogOpen(true)
  }

  function toggleCategoria(id: string) {
    setFormData((prev) => {
      const isSelected = prev.categoriaIds.includes(id)
      return {
        ...prev,
        categoriaIds: isSelected
          ? prev.categoriaIds.filter((c) => c !== id)
          : [...prev.categoriaIds, id],
      }
    })
  }

  async function handleSave() {
    setFormError('')
    if (!formData.email.trim()) {
      setFormError('El email es obligatorio.')
      return
    }
    if (!editingId && !formData.password.trim()) {
      setFormError('La contraseña es obligatoria para un nuevo usuario.')
      return
    }
    try {
      setSaving(true)
      if (editingId) {
        await updateUsuario(
          editingId,
          formData.email.trim(),
          formData.password,
          formData.nombre.trim(),
          formData.categoriaIds
        )
      } else {
        await createUsuario(
          formData.email.trim(),
          formData.password,
          formData.nombre.trim(),
          formData.categoriaIds
        )
      }
      resetForm()
      setDialogOpen(false)
      await loadData()
    } catch (error: any) {
      console.error('Error saving usuario:', error)
      if (error?.code === '23505' || error?.message?.includes('duplicate')) {
        setFormError('Ya existe un usuario con ese email.')
      } else {
        setFormError('Error al guardar el usuario.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        await deleteUsuario(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting usuario:', error)
      }
    }
  }

  if (allowed === false) return null

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Usuarios</h1>
            <p className="text-muted-foreground">
              Crea usuarios y asígnalos a una o más categorías. Cada usuario solo podrá gestionar
              materias dentro de sus categorías.
            </p>
          </div>
          <Button onClick={handleNew}>
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo usuario
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Cargando usuarios...</div>
          </div>
        ) : usuarios.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No hay usuarios creados aún</p>
              <Button className="mt-4" onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primer usuario
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Categorías asignadas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.nombre || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
                    <TableCell>
                      {usuario.categorias && usuario.categorias.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {usuario.categorias.map((cat: any) => (
                            <Badge
                              key={cat.id}
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: cat.color, color: cat.color }}
                            >
                              <Folder className="h-3 w-3 mr-1" style={{ fill: cat.color }} />
                              {cat.nombre}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin categorías</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(usuario)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(usuario.id)}
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Modifica los datos del usuario y sus categorías.'
                  : 'Crea un usuario, define su contraseña y asígnalo a categorías.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@universidad.edu.ar"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Contraseña {editingId && <span className="text-muted-foreground font-normal">(dejar vacío para no cambiar)</span>}
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingId ? '••••••••' : 'Contraseña del usuario'}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Categorías asignadas</label>
                {categorias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay categorías creadas. Crea categorías desde la sección Materias.
                  </p>
                ) : (
                  <div className="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
                    {categorias.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`cat-${cat.id}`}
                          checked={formData.categoriaIds.includes(cat.id)}
                          onCheckedChange={() => toggleCategoria(cat.id)}
                        />
                        <label
                          htmlFor={`cat-${cat.id}`}
                          className="text-sm cursor-pointer flex items-center gap-2"
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.nombre}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
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
    </AuthGuard>
  )
}
