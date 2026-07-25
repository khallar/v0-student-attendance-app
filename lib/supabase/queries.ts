import { createClient } from './client'

// Categorias
export async function getCategorias() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function createCategoria(nombre: string, descripcion: string = '', color: string = '#3b82f6') {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categorias')
    .insert([{ nombre, descripcion, color }])
    .select()
  if (error) throw error
  return data[0]
}

export async function updateCategoria(id: string, nombre: string, descripcion: string = '', color: string = '#3b82f6') {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categorias')
    .update({ nombre, descripcion, color })
    .eq('id', id)
    .select()
  if (error) throw error
  return data[0]
}

export async function deleteCategoria(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}

// Materias
export async function getMaterias() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materias')
    .select('*, categorias(id, nombre, color)')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function createMateria(
  nombre: string, 
  codigo: string, 
  profesor: string,
  repeticion: string = 'nunca',
  fecha_inicio: string = '',
  fecha_fin: string = '',
  dias_dictado: string[] = [],
  hora_desde: string = '',
  hora_hasta: string = '',
  ubicacion: string = '',
  horarios_por_dia: Record<string, { desde: string; hasta: string }> = {},
  categoria_id: string = ''
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materias')
    .insert([{ 
      nombre, 
      codigo, 
      profesor,
      repeticion,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      dias_dictado: dias_dictado || [],
      hora_desde: hora_desde || null,
      hora_hasta: hora_hasta || null,
      ubicacion: ubicacion || null,
      horarios_por_dia: Object.keys(horarios_por_dia).length > 0 ? horarios_por_dia : null,
      categoria_id: categoria_id || null
    }])
    .select('*, categorias(id, nombre, color)')
  if (error) throw error
  return data[0]
}

export async function updateMateria(
  id: string, 
  nombre: string, 
  codigo: string, 
  profesor: string,
  repeticion: string = 'nunca',
  fecha_inicio: string = '',
  fecha_fin: string = '',
  dias_dictado: string[] = [],
  hora_desde: string = '',
  hora_hasta: string = '',
  ubicacion: string = '',
  horarios_por_dia: Record<string, { desde: string; hasta: string }> = {},
  categoria_id: string = ''
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materias')
    .update({ 
      nombre, 
      codigo, 
      profesor,
      repeticion,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      dias_dictado: dias_dictado || [],
      hora_desde: hora_desde || null,
      hora_hasta: hora_hasta || null,
      ubicacion: ubicacion || null,
      horarios_por_dia: Object.keys(horarios_por_dia).length > 0 ? horarios_por_dia : null,
      categoria_id: categoria_id || null
    })
    .eq('id', id)
    .select('*, categorias(id, nombre, color)')
  if (error) throw error
  return data[0]
}

export async function deleteMateria(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('materias').delete().eq('id', id)
  if (error) throw error
}

// Alumnos
export async function getAlumnosByMateria(materiaId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materia_alumnos')
    .select(`
      alumnos(
        *,
        materia_alumnos(
          materias(id, nombre, codigo)
        )
      )
    `)
    .eq('materia_id', materiaId)
    .order('alumnos(apellido)', { ascending: true })
  if (error) throw error
  // Each alumno gets its other_materias list (excluding current)
  return (data?.map((row: any) => {
    const alumno = row.alumnos
    const otrasMaterias = (alumno.materia_alumnos || [])
      .map((ma: any) => ma.materias)
      .filter((m: any) => m && m.id !== materiaId)
    return { ...alumno, otras_materias: otrasMaterias }
  }) || [])
}

export async function createAlumno(nombre: string, apellido: string, dni: string, email: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('alumnos')
    .insert([{ nombre, apellido, dni, email }])
    .select()
  if (error) throw error
  return data[0]
}

export async function addAlumnoToMateria(materiaId: string, alumnoId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materia_alumnos')
    .insert([{ materia_id: materiaId, alumno_id: alumnoId }])
    .select()
  if (error) throw error
  return data[0]
}

export async function removeAlumnoFromMateria(materiaId: string, alumnoId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('materia_alumnos')
    .delete()
    .eq('materia_id', materiaId)
    .eq('alumno_id', alumnoId)
  if (error) throw error
}

// Clases
export async function getClasesByMateria(materiaId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clases')
    .select('*')
    .eq('materia_id', materiaId)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data
}

export async function getClaseById(claseId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clases')
    .select('*, materias(id, nombre, codigo)')
    .eq('id', claseId)
    .single()
  if (error) throw error
  return data
}

export async function createClase(materiaId: string, fecha: string, horario: string, ubicacion: string = '') {
  const supabase = createClient()
  const codigo = Math.random().toString(36).substring(2, 8).toUpperCase()
  const { data, error } = await supabase
    .from('clases')
    .insert([{ materia_id: materiaId, fecha, horario, ubicacion: ubicacion || null, codigo_autoasistencia: codigo }])
    .select()
  if (error) throw error
  return data[0]
}

export async function deleteClase(claseId: string) {
  const supabase = createClient()
  // Las asistencias se eliminan en cascada por la FK
  const { error } = await supabase.from('clases').delete().eq('id', claseId)
  if (error) throw error
}

export async function updateClaseComentario(claseId: string, comentario: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clases')
    .update({ comentario })
    .eq('id', claseId)
    .select()
  if (error) throw error
  return data[0]
}

// Delete all clases for a materia (used when regenerating schedule)
export async function deleteClasesByMateria(materiaId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('clases').delete().eq('materia_id', materiaId)
  if (error) throw error
}

// Generate clases based on materia schedule
export async function generateClasesForMateria(
  materiaId: string,
  repeticion: string,
  fecha_inicio: string,
  fecha_fin: string,
  dias_dictado: string[],
  hora_desde: string,
  hora_hasta: string,
  ubicacion: string = '',
  horarios_por_dia: Record<string, { desde: string; hasta: string }> = {}
) {
  if (!fecha_inicio || !fecha_fin || repeticion === 'nunca') return []
  
  const supabase = createClient()
  const clases: { materia_id: string; fecha: string; horario: string; ubicacion: string | null; codigo_autoasistencia: string }[] = []
  
  // Map day keys to JS day numbers (0 = Sunday, 1 = Monday, etc.)
  const dayKeyToNumber: Record<string, number> = {
    'd': 0, // Domingo
    'l': 1, // Lunes
    'm': 2, // Martes
    'x': 3, // Miércoles
    'j': 4, // Jueves
    'v': 5, // Viernes
    's': 6, // Sábado
  }
  
  const numberToDayKey: Record<number, string> = {
    0: 'd', 1: 'l', 2: 'm', 3: 'x', 4: 'j', 5: 'v', 6: 's'
  }
  
  const targetDays = dias_dictado.map(d => dayKeyToNumber[d]).filter(d => d !== undefined)
  
  // Helper to get horario for a specific day
  const getHorarioForDay = (dayNumber: number): string => {
    const dayKey = numberToDayKey[dayNumber]
    if (horarios_por_dia && horarios_por_dia[dayKey]) {
      return `${horarios_por_dia[dayKey].desde} - ${horarios_por_dia[dayKey].hasta}`
    }
    // Fallback to general hora_desde/hora_hasta
    return hora_desde && hora_hasta ? `${hora_desde} - ${hora_hasta}` : ''
  }
  
  const startDate = new Date(fecha_inicio)
  const endDate = new Date(fecha_fin)
  let currentDate = new Date(startDate)
  
  // Get interval in days based on repetition
  const getIntervalDays = (rep: string): number => {
    switch (rep) {
      case 'cada_dia': return 1
      case 'cada_semana': return 7
      case 'cada_2_semanas': return 14
      case 'cada_mes': return 30
      case 'cada_ano': return 365
      default: return 0
    }
  }
  
  const intervalDays = getIntervalDays(repeticion)
  if (intervalDays === 0) return []
  
  // For weekly/bi-weekly, we iterate day by day
  // For daily/monthly/yearly we use the interval
  if (repeticion === 'cada_semana' || repeticion === 'cada_2_semanas') {
    // Find all matching days in each week/bi-week period
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      
      if (targetDays.length === 0 || targetDays.includes(dayOfWeek)) {
        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase()
        clases.push({
          materia_id: materiaId,
          fecha: currentDate.toISOString(),
          horario: getHorarioForDay(dayOfWeek),
          ubicacion: ubicacion || null,
          codigo_autoasistencia: codigo,
        })
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
      
      // Skip extra days for bi-weekly
      if (repeticion === 'cada_2_semanas' && currentDate.getDay() === startDate.getDay()) {
        currentDate.setDate(currentDate.getDate() + 7) // Skip one week
      }
    }
  } else {
    // For daily, monthly, yearly - use simple interval
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      
      if (targetDays.length === 0 || targetDays.includes(dayOfWeek)) {
        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase()
        clases.push({
          materia_id: materiaId,
          fecha: currentDate.toISOString(),
          horario: getHorarioForDay(dayOfWeek),
          ubicacion: ubicacion || null,
          codigo_autoasistencia: codigo,
        })
      }
      
      currentDate.setDate(currentDate.getDate() + intervalDays)
    }
  }
  
  // Insert all clases in batch
  if (clases.length > 0) {
    const { error } = await supabase.from('clases').insert(clases)
    if (error) throw error
  }
  
  return clases
}

// Regenerate clases for a materia (delete existing and create new)
export async function regenerateClasesForMateria(
  materiaId: string,
  repeticion: string,
  fecha_inicio: string,
  fecha_fin: string,
  dias_dictado: string[],
  hora_desde: string,
  hora_hasta: string,
  ubicacion: string = '',
  horarios_por_dia: Record<string, { desde: string; hasta: string }> = {}
) {
  // First delete existing clases for this materia
  await deleteClasesByMateria(materiaId)
  
  // Then generate new ones based on schedule
  return generateClasesForMateria(
    materiaId,
    repeticion,
    fecha_inicio,
    fecha_fin,
    dias_dictado,
    hora_desde,
    hora_hasta,
    ubicacion,
    horarios_por_dia
  )
}

// Asistencias
export async function getAsistenciasByClase(claseId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('asistencias')
    .select('*')
    .eq('clase_id', claseId)
  if (error) throw error
  return data
}

export async function upsertAsistencia(claseId: string, alumnoId: string, estado: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('asistencias')
    .upsert(
      [{ clase_id: claseId, alumno_id: alumnoId, estado }],
      { onConflict: 'clase_id,alumno_id' }
    )
    .select()
  if (error) throw error
  return data[0]
}

// Asistencia publica (por codigo)
export async function getClaseByCode(codigo_autoasistencia: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clases')
    .select('*, materias(id, nombre, codigo)')
    .eq('codigo_autoasistencia', codigo_autoasistencia)
    .single()
  if (error) throw error
  return data
}

export async function getAlumnoByDni(dni: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .eq('dni', dni)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
  return data
}

// Find or create alumno by DNI - used for CSV import
export async function findOrCreateAlumno(nombre: string, apellido: string, dni: string, email: string) {
  const supabase = createClient()
  
  // First try to find existing alumno by DNI
  const { data: existing } = await supabase
    .from('alumnos')
    .select('*')
    .eq('dni', dni)
    .single()
  
  if (existing) {
    return existing
  }
  
  // Create new alumno
  const { data, error } = await supabase
    .from('alumnos')
    .insert([{ nombre, apellido, dni, email }])
    .select()
  if (error) throw error
  return data[0]
}

// Check if alumno is already in materia
export async function isAlumnoInMateria(materiaId: string, alumnoId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materia_alumnos')
    .select('id')
    .eq('materia_id', materiaId)
    .eq('alumno_id', alumnoId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return !!data
}

// Get all alumnos with their materia enrollments
export async function getAllAlumnosWithMaterias() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('alumnos')
    .select(`
      *,
      materia_alumnos(
        materia_id,
        materias(id, nombre, codigo)
      )
    `)
    .order('apellido', { ascending: true })
  if (error) throw error
  return data
}

// Get all asistencias for an alumno across all materias
export async function getAsistenciasByAlumno(alumnoId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('asistencias')
    .select(`
      *,
      clases(id, fecha, horario, materia_id)
    `)
    .eq('alumno_id', alumnoId)
  if (error) throw error
  return data
}

// Get full attendance report for a single alumno across all their materias, up to today
export async function getInformeByAlumno(alumnoId: string) {
  const supabase = createClient()
  // Use end of today to include all clases from today
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const todayStr = today.toISOString()

  // Get materias the alumno is enrolled in
  const { data: enrollments, error: enrollError } = await supabase
    .from('materia_alumnos')
    .select('materias(id, nombre, codigo)')
    .eq('alumno_id', alumnoId)
  if (enrollError) throw enrollError

  const materias = enrollments?.map((e: any) => e.materias).filter(Boolean) || []

  // For each materia get clases up to today and the alumno's asistencias
  const materiasConStats = await Promise.all(
    materias.map(async (materia: any) => {
      // All clases of this materia up to today
      const { data: clases, error: clasesError } = await supabase
        .from('clases')
        .select('id, fecha, horario')
        .eq('materia_id', materia.id)
        .lte('fecha', todayStr)
        .order('fecha', { ascending: true })
      if (clasesError) throw clasesError

      if (!clases || clases.length === 0) {
        return { ...materia, clases: [], presente: 0, ausente: 0, justificado: 0, tardanza: 0, total: 0, porcentaje: 0 }
      }

      // Asistencias of this alumno for those clases
      const claseIds = clases.map((c: any) => c.id)
      const { data: asistencias, error: asistError } = await supabase
        .from('asistencias')
        .select('clase_id, estado')
        .eq('alumno_id', alumnoId)
        .in('clase_id', claseIds)
      if (asistError) throw asistError

      const asistMap = new Map((asistencias || []).map((a: any) => [a.clase_id, a.estado?.toLowerCase()]))

      let presente = 0, ausente = 0, justificado = 0, tardanza = 0
      clases.forEach((c: any) => {
        const estado = asistMap.get(c.id)
        if (estado === 'presente') presente++
        else if (estado === 'justificado') justificado++
        else if (estado === 'tardanza') tardanza++
        else ausente++ // no estado registrado = ausente
      })

      const total = clases.length
      const porcentaje = total === 0 ? 0 : Math.round(((presente + justificado) / total) * 100)

      const clasesConEstado = clases.map((c: any) => ({
        ...c,
        estado: asistMap.get(c.id) || 'ausente',
      }))

      return { ...materia, clases: clasesConEstado, presente, ausente, justificado, tardanza, total, porcentaje }
    })
  )

  return materiasConStats
}

// Activate QR for a clase (sets qr_activo_desde to NOW and stores duration)
export async function activateQR(claseId: string, durationMinutes: number = 25) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clases')
    .update({ 
      qr_activo_desde: new Date().toISOString(),
      qr_duracion_minutos: durationMinutes
    })
    .eq('id', claseId)
    .select()
  if (error) throw error
  return data[0]
}

// Check if QR is still valid (based on stored duration)
export function isQRValid(qr_activo_desde: string | null, qr_duracion_minutos: number = 25): boolean {
  if (!qr_activo_desde) return false
  const activatedAt = new Date(qr_activo_desde)
  const now = new Date()
  const diffMs = now.getTime() - activatedAt.getTime()
  const diffMinutes = diffMs / (1000 * 60)
  return diffMinutes <= qr_duracion_minutos
}

// Get remaining time for QR in seconds (based on stored duration)
export function getQRRemainingTime(qr_activo_desde: string | null, qr_duracion_minutos: number = 25): number {
  if (!qr_activo_desde) return 0
  const activatedAt = new Date(qr_activo_desde)
  const now = new Date()
  const diffMs = now.getTime() - activatedAt.getTime()
  const remainingMs = (qr_duracion_minutos * 60 * 1000) - diffMs
  return Math.max(0, Math.floor(remainingMs / 1000))
}

// Check if alumno is enrolled in materia by DNI and return alumno data
export async function getAlumnoEnrolledByDni(materiaId: string, dni: string) {
  const supabase = createClient()
  
  // First get the alumno by DNI
  const { data: alumno, error: alumnoError } = await supabase
    .from('alumnos')
    .select('*')
    .eq('dni', dni)
    .single()
  
  if (alumnoError && alumnoError.code !== 'PGRST116') throw alumnoError
  if (!alumno) return null
  
  // Check if enrolled in materia
  const { data: enrollment, error: enrollError } = await supabase
    .from('materia_alumnos')
    .select('id')
    .eq('materia_id', materiaId)
    .eq('alumno_id', alumno.id)
    .single()
  
  if (enrollError && enrollError.code !== 'PGRST116') throw enrollError
  if (!enrollment) return null
  
  return alumno
}

// ============================================================
// Usuarios (ABM - gestionado por el administrador)
// ============================================================

// Get all usuarios with their assigned categorias
export async function getUsuarios() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('*, usuario_categorias(categoria_id, categorias(id, nombre, color))')
    .order('email', { ascending: true })
  if (error) throw error
  return (data || []).map((u: any) => ({
    ...u,
    categorias: (u.usuario_categorias || [])
      .map((uc: any) => uc.categorias)
      .filter(Boolean),
    categoria_ids: (u.usuario_categorias || []).map((uc: any) => uc.categoria_id),
  }))
}

// Get a single usuario by email + password (used for login validation)
export async function getUsuarioByCredentials(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('*, usuario_categorias(categoria_id)')
    .eq('email', email.toLowerCase())
    .eq('password', password)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    ...data,
    categoria_ids: (data.usuario_categorias || []).map((uc: any) => uc.categoria_id),
  }
}

// Set the categorias assigned to a usuario (replaces existing assignments)
async function setUsuarioCategorias(usuarioId: string, categoriaIds: string[]) {
  const supabase = createClient()
  // Remove existing assignments
  const { error: delError } = await supabase
    .from('usuario_categorias')
    .delete()
    .eq('usuario_id', usuarioId)
  if (delError) throw delError
  // Insert new assignments
  if (categoriaIds.length > 0) {
    const rows = categoriaIds.map((categoria_id) => ({ usuario_id: usuarioId, categoria_id }))
    const { error: insError } = await supabase.from('usuario_categorias').insert(rows)
    if (insError) throw insError
  }
}

// Create a new usuario and assign categorias
export async function createUsuario(
  email: string,
  password: string,
  nombre: string,
  categoriaIds: string[] = []
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('usuarios')
    .insert([{ email: email.toLowerCase(), password, nombre }])
    .select()
  if (error) throw error
  const usuario = data[0]
  await setUsuarioCategorias(usuario.id, categoriaIds)
  return usuario
}

// Update a usuario. If password is empty, it is left unchanged.
export async function updateUsuario(
  id: string,
  email: string,
  password: string,
  nombre: string,
  categoriaIds: string[] = []
) {
  const supabase = createClient()
  const updateData: Record<string, any> = { email: email.toLowerCase(), nombre }
  if (password && password.trim()) {
    updateData.password = password
  }
  const { data, error } = await supabase
    .from('usuarios')
    .update(updateData)
    .eq('id', id)
    .select()
  if (error) throw error
  await setUsuarioCategorias(id, categoriaIds)
  return data[0]
}

// Delete a usuario (assignments are removed via ON DELETE CASCADE)
export async function deleteUsuario(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('usuarios').delete().eq('id', id)
  if (error) throw error
}

