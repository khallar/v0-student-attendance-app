import { createClient } from './client'

// Materias
export async function getMaterias() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materias')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function createMateria(nombre: string, codigo: string, profesor: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materias')
    .insert([{ nombre, codigo, profesor }])
    .select()
  if (error) throw error
  return data[0]
}

export async function updateMateria(id: string, nombre: string, codigo: string, profesor: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('materias')
    .update({ nombre, codigo, profesor })
    .eq('id', id)
    .select()
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
    .select('alumnos(*)')
    .eq('materia_id', materiaId)
    .order('alumnos(apellido)', { ascending: true })
  if (error) throw error
  return data?.map((row: any) => row.alumnos) || []
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

export async function createClase(materiaId: string, fecha: string) {
  const supabase = createClient()
  const now = new Date()
  const codigo = Math.random().toString(36).substring(2, 8).toUpperCase()
  const { data, error } = await supabase
    .from('clases')
    .insert([{ materia_id: materiaId, fecha, codigo_autoasistencia: codigo }])
    .select()
  if (error) throw error
  return data[0]
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

