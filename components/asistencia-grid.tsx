'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Alumno {
  id: string
  nombre: string
  apellido: string
  dni: string
}

interface AsistenciaRow {
  alumno_id: string
  estado: string
}

interface AsistenciaGridProps {
  alumnos: Alumno[]
  asistencias: Record<string, string>
  onAsistenciaChange: (alumnoId: string, estado: string) => void
  loading?: boolean
}

export function AsistenciaGrid({
  alumnos,
  asistencias,
  onAsistenciaChange,
  loading = false
}: AsistenciaGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const estadoColors = {
    presente: 'bg-green-100 text-green-800',
    ausente: 'bg-red-100 text-red-800',
    justificado: 'bg-blue-100 text-blue-800',
    tarde: 'bg-yellow-100 text-yellow-800'
  }

  const filteredAlumnos = alumnos.filter(a => 
    `${a.apellido} ${a.nombre}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.dni.includes(searchTerm)
  )

  const sorted = [...filteredAlumnos].sort((a, b) => {
    const comp = `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)
    return sortOrder === 'asc' ? comp : -comp
  })

  const presentCount = Object.values(asistencias).filter(e => e === 'presente').length
  const auscentCount = Object.values(asistencias).filter(e => e === 'ausente').length
  const justifiedCount = Object.values(asistencias).filter(e => e === 'justificado').length
  const lateCount = Object.values(asistencias).filter(e => e === 'tarde').length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-green-100 text-green-800">P: {presentCount}</Badge>
          <Badge className="bg-red-100 text-red-800">A: {auscentCount}</Badge>
          <Badge className="bg-blue-100 text-blue-800">J: {justifiedCount}</Badge>
          <Badge className="bg-yellow-100 text-yellow-800">T: {lateCount}</Badge>
        </div>
        <Input
          placeholder="Buscar por nombre o DNI..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
          disabled={loading}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted">
              <th className="px-4 py-2 text-left font-semibold">
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 hover:text-muted-foreground"
                >
                  Alumno
                  {sortOrder === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-4 py-2 text-left font-semibold text-xs">DNI</th>
              <th className="px-4 py-2 text-center font-semibold">
                <span className="text-green-600">P</span>
              </th>
              <th className="px-4 py-2 text-center font-semibold">
                <span className="text-red-600">A</span>
              </th>
              <th className="px-4 py-2 text-center font-semibold">
                <span className="text-blue-600">J</span>
              </th>
              <th className="px-4 py-2 text-center font-semibold">
                <span className="text-yellow-600">T</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((alumno, idx) => {
              const estado = asistencias[alumno.id] || 'ausente'
              return (
                <tr key={alumno.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                  <td className="px-4 py-3 font-medium">
                    {alumno.apellido}, {alumno.nombre}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{alumno.dni}</td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant={estado === 'presente' ? 'default' : 'outline'}
                      className={estado === 'presente' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => onAsistenciaChange(alumno.id, 'presente')}
                      disabled={loading}
                    >
                      P
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant={estado === 'ausente' ? 'default' : 'outline'}
                      className={estado === 'ausente' ? 'bg-red-600 hover:bg-red-700' : ''}
                      onClick={() => onAsistenciaChange(alumno.id, 'ausente')}
                      disabled={loading}
                    >
                      A
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant={estado === 'justificado' ? 'default' : 'outline'}
                      className={estado === 'justificado' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      onClick={() => onAsistenciaChange(alumno.id, 'justificado')}
                      disabled={loading}
                    >
                      J
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant={estado === 'tarde' ? 'default' : 'outline'}
                      className={estado === 'tarde' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                      onClick={() => onAsistenciaChange(alumno.id, 'tarde')}
                      disabled={loading}
                    >
                      T
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="flex justify-center py-8 text-muted-foreground">
          No hay alumnos que coincidan con la búsqueda
        </div>
      )}
    </div>
  )
}
