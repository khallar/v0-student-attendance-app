// Configuración de bedeles autorizados para el sistema
// Agregar o modificar bedeles aquí para controlar el acceso al sistema

export interface Bedel {
  id: string
  nombre: string
  email: string
  rol: 'admin' | 'bedel'
}

// Lista de bedeles autorizados
// Para agregar un nuevo bedel, simplemente añadir un objeto con los datos correspondientes
export const BEDELES_AUTORIZADOS: Bedel[] = [
  {
    id: 'bedel_001',
    nombre: 'Administrador',
    email: 'admin@universidad.edu.ar',
    rol: 'admin',
  },
  {
    id: 'bedel_002',
    nombre: 'Juan Pérez',
    email: 'jperez@universidad.edu.ar',
    rol: 'bedel',
  },
  {
    id: 'bedel_003',
    nombre: 'Karim Hallar',
    email: 'khallar@uarg.unpa.edu.ar',
    rol: 'bedel',
  },
  // Agregar más bedeles aquí:
  // {
  //   id: 'bedel_004',
  //   nombre: 'Nombre Apellido',
  //   email: 'email@universidad.edu.ar',
  //   rol: 'bedel',
  // },
]

// Función para buscar un bedel por email
export function findBedelByEmail(email: string): Bedel | undefined {
  return BEDELES_AUTORIZADOS.find(
    (b) => b.email.toLowerCase() === email.toLowerCase()
  )
}

// Función para verificar si un email está autorizado
export function isEmailAuthorized(email: string): boolean {
  return !!findBedelByEmail(email)
}

// Obtener todos los emails autorizados
export function getAuthorizedEmails(): string[] {
  return BEDELES_AUTORIZADOS.map((b) => b.email)
}
