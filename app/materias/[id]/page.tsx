'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAlumnosByMateria, createAlumno, addAlumnoToMateria, removeAlumnoFromMateria, getMaterias, findOrCreateAlumno, isAlumnoInMateria } from '@/lib/supabase/queries'
import { Upload, Plus, Trash2, AlertCircle, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function MateriaDetailPage() {
  const params = useParams()
  const materiaId = params.id as string
  const [materia, setMateria] = useState<any>(null)
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvPreview, setCsvPreview] = useState(false)
  const [csvErrors, setCsvErrors] = useState<string[]>([])
  const [formData, setFormData] = useState({ nombre: '', apellido: '', dni: '', email: '' })
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  // When a DNI that already exists is entered, we show the found alumno
  const [foundAlumno, setFoundAlumno] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [materiaId])

  async function loadData() {
    try {
      setLoading(true)
      const materias = await getMaterias()
      const mat = materias.find((m: any) => m.id === materiaId)
      setMateria(mat)
      const alumnos = await getAlumnosByMateria(materiaId)
      setAlumnos(alumnos)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // When DNI field loses focus, check if alumno already exists in the system
  async function handleDniBlur() {
    if (!formData.dni || formData.dni.length < 7) return
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data } = await supabase
        .from('alumnos')
        .select('*')
        .eq('dni', formData.dni)
        .single()
      if (data) {
        setFoundAlumno(data)
        setFormData((prev) => ({
          ...prev,
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email,
        }))
      } else {
        setFoundAlumno(null)
      }
    } catch {
      setFoundAlumno(null)
    }
  }

  async function handleAddAlumno() {
    try {
      setAdding(true)
      setAddError('')
      // findOrCreateAlumno handles both new and existing alumnos
      const alumno = await findOrCreateAlumno(formData.nombre, formData.apellido, formData.dni, formData.email)
      const alreadyEnrolled = await isAlumnoInMateria(materiaId, alumno.id)
      if (alreadyEnrolled) {
        setAddError('Este alumno ya está inscripto en esta materia.')
        return
      }
      await addAlumnoToMateria(materiaId, alumno.id)
      setFormData({ nombre: '', apellido: '', dni: '', email: '' })
      setFoundAlumno(null)
      setDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error('Error adding alumno:', error)
      setAddError('Error al agregar el alumno. Verificá los datos.')
    } finally {
      setAdding(false)
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setFormData({ nombre: '', apellido: '', dni: '', email: '' })
      setFoundAlumno(null)
      setAddError('')
    }
  }

  async function handleRemoveAlumno(alumnoId: string) {
    if (confirm('¿Estás seguro de que deseas quitar este alumno?')) {
      try {
        await removeAlumnoFromMateria(materiaId, alumnoId)
        await loadData()
      } catch (error) {
        console.error('Error removing alumno:', error)
      }
    }
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const csv = event.target?.result as string
      const lines = csv.trim().split('\n')
      const errors: string[] = []
      const data: any[] = []
      const existingDnis = new Set(alumnos.map((a: any) => a.dni))

      lines.forEach((line, index) => {
        if (index === 0) return // Skip header
        const [nombre, apellido, dni, email] = line.split(',').map((s) => s.trim())

        if (!nombre || !apellido || !dni || !email) {
          errors.push(`Fila ${index + 1}: Datos incompletos`)
          return
        }

        if (existingDnis.has(dni)) {
          errors.push(`Fila ${index + 1}: DNI ${dni} ya existe`)
          return
        }

        if (!/^[0-9]{7,8}$/.test(dni)) {
          errors.push(`Fila ${index + 1}: DNI ${dni} inválido`)
          return
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Fila ${index + 1}: Email ${email} inválido`)
          return
        }

        data.push({ nombre, apellido, dni, email })
      })

      setCsvData(data)
      setCsvErrors(errors)
      setCsvPreview(true)
    }
    reader.readAsText(file)
  }

  async function handleImportCSV() {
    try {
      let imported = 0
      let skipped = 0
      
      for (const row of csvData) {
        // Find existing alumno or create new one
        const alumno = await findOrCreateAlumno(row.nombre, row.apellido, row.dni, row.email)
        
        // Check if already enrolled in this materia
        const alreadyEnrolled = await isAlumnoInMateria(materiaId, alumno.id)
        if (!alreadyEnrolled) {
          await addAlumnoToMateria(materiaId, alumno.id)
          imported++
        } else {
          skipped++
        }
      }
      
      setCsvData([])
      setCsvErrors([])
      setCsvPreview(false)
      await loadData()
      
      if (skipped > 0) {
        alert(`Importacion completada: ${imported} alumnos agregados, ${skipped} ya estaban inscriptos.`)
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      alert('Error al importar: ' + (error as Error).message)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex justify-center py-8">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </AuthGuard>
    )
  }

  if (!materia) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-4xl p-4">
          <Card className="text-center py-8">
            <p className="text-muted-foreground">Materia no encontrada</p>
          </Card>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{materia.nombre}</h1>
          <p className="text-muted-foreground">
            {materia.codigo} • Prof. {materia.profesor}
          </p>
          <p className="mt-2 text-sm">
            {alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''} inscrito{alumnos.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Tabs defaultValue="alumnos" className="w-full">
          <TabsList>
            <TabsTrigger value="alumnos">Alumnos</TabsTrigger>
            <TabsTrigger value="importar">Importar</TabsTrigger>
          </TabsList>

          <TabsContent value="alumnos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Alumnos inscriptos</CardTitle>
                  <CardDescription>Gestiona los alumnos de esta materia</CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar alumno
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar alumno a la materia</DialogTitle>
                      <DialogDescription>
                        Ingresa el DNI para buscar un alumno existente o completar los datos para crear uno nuevo.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">DNI</label>
                        <Input
                          value={formData.dni}
                          onChange={(e) => { setFormData({ ...formData, dni: e.target.value }); setFoundAlumno(null) }}
                          onBlur={handleDniBlur}
                          placeholder="12345678"
                        />
                      </div>
                      {foundAlumno && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                          Alumno encontrado en el sistema: <strong>{foundAlumno.nombre} {foundAlumno.apellido}</strong>. Se inscribirá en esta materia.
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium">Nombre</label>
                        <Input
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          placeholder="Juan"
                          disabled={!!foundAlumno}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Apellido</label>
                        <Input
                          value={formData.apellido}
                          onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                          placeholder="Pérez"
                          disabled={!!foundAlumno}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="juan@ejemplo.com"
                          type="email"
                          disabled={!!foundAlumno}
                        />
                      </div>
                      {addError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                          {addError}
                        </div>
                      )}
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleAddAlumno}
                          disabled={!formData.dni || !formData.nombre || !formData.apellido || adding}
                        >
                          {adding ? 'Agregando...' : 'Agregar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {alumnos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay alumnos inscriptos aún</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Otras materias</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alumnos.map((alumno) => (
                        <TableRow key={alumno.id}>
                          <TableCell className="font-medium">
                            {alumno.nombre} {alumno.apellido}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">{alumno.dni}</TableCell>
                          <TableCell className="text-sm">{alumno.email}</TableCell>
                          <TableCell>
                            {alumno.otras_materias && alumno.otras_materias.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {alumno.otras_materias.map((m: any) => (
                                  <Badge key={m.id} variant="secondary" className="text-xs font-normal">
                                    <BookOpen className="mr-1 h-3 w-3" />
                                    {m.codigo}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRemoveAlumno(alumno.id)}
                              title="Quitar de esta materia"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="importar">
            <Card>
              <CardHeader>
                <CardTitle>Importar alumnos desde CSV</CardTitle>
                <CardDescription>Formato: nombre, apellido, dni, email (sin encabezado)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Selecciona un archivo CSV</p>
                    <p className="text-xs text-muted-foreground">o arrastra uno aquí</p>
                  </label>
                </div>

                {csvPreview && (
                  <div className="space-y-4">
                    {csvErrors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                          <p className="font-medium text-red-900">Errores encontrados:</p>
                        </div>
                        <ul className="text-sm text-red-800 space-y-1">
                          {csvErrors.map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {csvData.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium">{csvData.length} alumno{csvData.length !== 1 ? 's' : ''} para importar:</p>
                        <div className="bg-slate-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                          <Table className="text-xs">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Apellido</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead>Email</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csvData.map((row, i) => (
                                <TableRow key={i}>
                                  <TableCell>{row.nombre}</TableCell>
                                  <TableCell>{row.apellido}</TableCell>
                                  <TableCell>{row.dni}</TableCell>
                                  <TableCell>{row.email}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => { setCsvPreview(false); setCsvData([]); setCsvErrors([]); }}>
                            Cancelar
                          </Button>
                          <Button onClick={handleImportCSV}>
                            Importar {csvData.length} alumno{csvData.length !== 1 ? 's' : ''}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  )
}
