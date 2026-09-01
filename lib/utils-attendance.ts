// ============================================================================
// Manejo de fechas con zona horaria fija (Argentina, UTC-3)
// ----------------------------------------------------------------------------
// Las clases se guardan SIEMPRE al mediodía UTC (12:00Z) del día calendario
// correspondiente. Al mediodía UTC, cualquier zona horaria realista (de -11 a
// +11) cae en el mismo día calendario, por lo que la fecha nunca "se corre"
// según dónde se ejecute la app (navegador del bedel en Argentina o servidor
// en UTC). Toda interpretación de "qué día es" se hace explícitamente en
// horario de Argentina.
// ============================================================================

export const APP_TIMEZONE = 'America/Argentina/Buenos_Aires'

// Devuelve el día calendario (año/mes/día) de un instante, visto en Argentina.
export function getAppDateParts(date: string | Date): { y: number; m: number; d: number } {
  const dt = typeof date === 'string' ? new Date(date) : date
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(dt)
  const y = Number(parts.find((p) => p.type === 'year')!.value)
  const m = Number(parts.find((p) => p.type === 'month')!.value)
  const d = Number(parts.find((p) => p.type === 'day')!.value)
  return { y, m, d }
}

// Convierte un día calendario (y/m/d, 1-based month) al instante estable: mediodía UTC.
export function toStableFecha(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString()
}

// Normaliza cualquier fecha al mediodía UTC de su día calendario argentino.
export function normalizeFecha(date: string | Date): string {
  const { y, m, d } = getAppDateParts(date)
  return toStableFecha(y, m, d)
}

// Normaliza un string 'yyyy-mm-dd' (input type="date") al mediodía UTC de ese día.
export function ymdToStableFecha(ymd: string): string {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number)
  return toStableFecha(y, m, d)
}

// El "hoy" argentino como instante estable (mediodía UTC).
export function todayStableFecha(): string {
  return normalizeFecha(new Date())
}

// Objeto Date (medianoche local) que representa el día calendario argentino de una fecha.
// Útil para el componente de calendario, que compara por día local.
export function toAppDay(date: string | Date): Date {
  const { y, m, d } = getAppDateParts(date)
  return new Date(y, m - 1, d)
}

// Clave estable por día calendario argentino (yyyy-m-d).
export function appDayKey(date: string | Date): string {
  const { y, m, d } = getAppDateParts(date)
  return `${y}-${m}-${d}`
}

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
    minute: '2-digit',
    timeZone: APP_TIMEZONE,
  })
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-AR', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    timeZone: APP_TIMEZONE,
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
