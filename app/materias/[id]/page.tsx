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
import { Upload, Plus, Trash2, AlertCircle, BookOpen, FileSpreadsheet, FileText, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
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

  function parseRows(rows: string[][]): { data: any[], errors: string[] } {
    const errors: string[] = []
    const data: any[] = []
    const enrolledDnis = new Set(alumnos.map((a: any) => a.dni))
    const seenDnis = new Set<string>()

    rows.forEach((row, index) => {
      // Skip empty rows or header row
      if (row.length === 0 || row.every(cell => !cell?.trim())) return
      
      // Check if it looks like a header row (first row with text like "nombre", "apellido", etc.)
      if (index === 0) {
        const firstCell = row[0]?.toLowerCase().trim()
        if (firstCell === 'nombre' || firstCell === 'apellido' || firstCell === 'dni' || firstCell === 'email') {
          return // Skip header
        }
      }

      const [nombre, apellido, dni, email] = row.map((s) => s?.trim() || '')

      if (!nombre || !apellido || !dni || !email) {
        errors.push(`Fila ${index + 1}: Datos incompletos (se requiere nombre, apellido, dni, email)`)
        return
      }

      // Clean DNI - remove dots and spaces
      const cleanDni = dni.replace(/\./g, '').replace(/\s/g, '')

      // Check if already enrolled in this materia
      if (enrolledDnis.has(cleanDni)) {
        errors.push(`Fila ${index + 1}: DNI ${cleanDni} ya inscripto en esta materia`)
        return
      }

      // Check for duplicates within the file itself
      if (seenDnis.has(cleanDni)) {
        errors.push(`Fila ${index + 1}: DNI ${cleanDni} duplicado en el archivo`)
        return
      }
      seenDnis.add(cleanDni)

      if (!/^[0-9]{7,8}$/.test(cleanDni)) {
        errors.push(`Fila ${index + 1}: DNI ${cleanDni} inválido (debe tener 7 u 8 dígitos)`)
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Fila ${index + 1}: Email ${email} inválido`)
        return
      }

      data.push({ nombre, apellido, dni: cleanDni, email })
    })

    return { data, errors }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

    if (isExcel) {
      // Handle Excel file
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows: string[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
          
          const result = parseRows(rows)
          setCsvData(result.data)
          setCsvErrors(result.errors)
          setCsvPreview(true)
        } catch (error) {
          setCsvErrors(['Error al leer el archivo Excel. Verifica que el formato sea correcto.'])
          setCsvPreview(true)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      // Handle CSV/TXT file
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        const lines = content.trim().split('\n')
        
        // Detect separator (semicolon or comma)
        const firstDataLine = lines.find(line => line.trim().length > 0) || ''
        const semicolonCount = (firstDataLine.match(/;/g) || []).length
        const commaCount = (firstDataLine.match(/,/g) || []).length
        const separator = semicolonCount >= 3 ? ';' : ','
        
        const rows = lines.map(line => line.split(separator))
        
        const result = parseRows(rows)
        setCsvData(result.data)
        setCsvErrors(result.errors)
        setCsvPreview(true)
      }
      reader.readAsText(file)
    }
    
    // Reset file input
    e.target.value = ''
  }

  async function handleImportCSV() {
    let imported = 0
    let skipped = 0
    const errors: string[] = []
    
    for (const row of csvData) {
      try {
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
      } catch (error: any) {
        // Handle duplicate key constraint error gracefully
        if (error?.code === '23505') {
          skipped++
        } else {
          errors.push(`${row.dni}: ${error?.message || 'Error desconocido'}`)
        }
      }
    }
    
    setCsvData([])
    setCsvErrors([])
    setCsvPreview(false)
    await loadData()
    
    let message = `Importacion completada: ${imported} alumnos agregados.`
    if (skipped > 0) {
      message += ` ${skipped} ya estaban inscriptos.`
    }
    if (errors.length > 0) {
      message += `\n\nErrores: ${errors.join(', ')}`
    }
    alert(message)
  }

  function exportToExcel() {
    if (alumnos.length === 0) {
      alert('No hay alumnos para exportar')
      return
    }

    const headers = ['Nombre', 'Apellido', 'DNI', 'Email']
    const rows = alumnos.map((alumno) => [
      alumno.nombre,
      alumno.apellido,
      alumno.dni,
      alumno.email || '',
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 25 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')
    XLSX.writeFile(wb, `Alumnos_${materia.codigo}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function exportToCSV() {
    if (alumnos.length === 0) {
      alert('No hay alumnos para exportar')
      return
    }

    const headers = ['Nombre', 'Apellido', 'DNI', 'Email']
    const rows = alumnos.map((alumno) => [
      alumno.nombre,
      alumno.apellido,
      alumno.dni,
      alumno.email || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Alumnos_${materia.codigo}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
            <TabsTrigger value="exportar">Exportar</TabsTrigger>
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
                <CardTitle>Importar alumnos</CardTitle>
                <CardDescription>Importa una lista de alumnos desde un archivo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Format instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <p className="font-medium text-blue-900 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Formatos aceptados
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="font-medium text-blue-800 flex items-center gap-1.5">
                        <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx, .xls)
                      </p>
                      <p className="text-blue-700 text-xs">Primera hoja con columnas en orden</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-blue-800 flex items-center gap-1.5">
                        <FileText className="h-4 w-4" /> CSV/Texto (.csv, .txt)
                      </p>
                      <p className="text-blue-700 text-xs">Separado por coma (,) o punto y coma (;)</p>
                    </div>
                  </div>
                  <div className="border-t border-blue-200 pt-3 mt-2">
                    <p className="font-medium text-blue-900 text-sm mb-2">Columnas requeridas (en este orden):</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">1. Nombre</Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">2. Apellido</Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">3. DNI</Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">4. Email</Badge>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">La primera fila puede ser encabezado (se detecta automaticamente). Acepta acentos y caracteres especiales como n.</p>
                  </div>
                  <div className="border-t border-blue-200 pt-3">
                    <p className="font-medium text-blue-900 text-xs mb-1">Ejemplo CSV:</p>
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded block overflow-x-auto">
                      Juan,Pérez,12345678,juan@email.com<br/>
                      María,García,87654321,maria@email.com
                    </code>
                  </div>
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">Selecciona un archivo</p>
                    <p className="text-xs text-muted-foreground mt-1">CSV, TXT o Excel (.xlsx, .xls)</p>
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

          <TabsContent value="exportar">
            <Card>
              <CardHeader>
                <CardTitle>Exportar alumnos</CardTitle>
                <CardDescription>
                  Descarga la lista de alumnos en formato Excel o CSV para importarlos en otra materia
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alumnos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mb-3 opacity-50" />
                    <p>No hay alumnos para exportar</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-3">Total de alumnos: {alumnos.length}</h3>
                      <div className="flex flex-col gap-3">
                        <Button onClick={exportToExcel} variant="outline" className="justify-start gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Descargar como Excel (.xlsx)
                        </Button>
                        <Button onClick={exportToCSV} variant="outline" className="justify-start gap-2">
                          <FileText className="h-4 w-4" />
                          Descargar como CSV (.csv)
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                      <p className="font-medium mb-2">Los archivos incluyen las siguientes columnas:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Nombre</li>
                        <li>Apellido</li>
                        <li>DNI</li>
                        <li>Email</li>
                      </ul>
                      <p className="mt-3 text-xs">Puedes usar estos archivos para importar los alumnos en otra materia.</p>
                    </div>
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
