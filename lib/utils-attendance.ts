export function calculateAttendancePercentage(total: number, present: number): number {
  if (total === 0) return 100
  return Math.round((present / total) * 100)
}

export function getAttendanceStatus(percentage: number): 'safe' | 'warning' | 'danger' {
  if (percentage >= 75) return 'safe'
  if (percentage >= 60) return 'warning'
  return 'danger'
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-AR', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-AR', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit'
  })
}

export function parseCSVToAlumnos(csv: string): Array<{nombre: string; apellido: string; dni: string; email: string}> {
  const lines = csv.trim().split('\n')
  const alumnos = []
  
  // Skip header if present
  const startLine = lines[0].toLowerCase().includes('nombre') ? 1 : 0
  
  for (let i = startLine; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim())
    if (parts.length >= 3 && parts[0] && parts[1]) {
      alumnos.push({
        nombre: parts[0],
        apellido: parts[1],
        dni: parts[2] || '',
        email: parts[3] || ''
      })
    }
  }
  
  return alumnos
}
