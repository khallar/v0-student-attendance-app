# ASISTENCIA - Sistema de Gestión de Asistencia

Aplicación web moderna para la gestión y toma de asistencia de alumnos en materias de la UTN. Diseñada específicamente para las necesidades operativas del bedel, enfocada en velocidad, claridad y facilidad de uso en clase.

## Características Principales

### 1. **Gestión de Materias** (`/materias`)
- Crear, editar y eliminar materias
- Asignar profesor responsable
- Códigos únicos por materia
- Interfaz rápida y clara

### 2. **Gestión de Alumnos** (`/materias/[id]`)
- Importar alumnos masivamente desde CSV
- Validación de datos (DNI duplicados, emails únicos)
- Agregar/remover alumnos de materias
- Vista de lista con información completa

### 3. **Toma de Asistencia** (`/asistencia`)
- **Grid optimizado para velocidad** - Diseñado para uso en clase
- Botones de 1 click: P (Presente), A (Ausente), J (Justificado), T (Tarde)
- Búsqueda rápida por nombre o DNI
- Marca rápida: marcar todos Presente o Ausente
- Resumen visual con contadores por estado
- Guardado instantáneo

### 4. **Autoasistencia Pública** (`/autoasistencia/[codigo]`)
- URL única para cada clase con código de autoasistencia
- Los alumnos ingresan DNI y se registran como PRESENTE
- Perfecto para clases con asistencia voluntaria
- Generación automática de códigos

### 5. **Informes y Reportes** (`/informes`)
- Resumen por materia: total de clases, alumnos, promedio de asistencia
- Estadísticas detalladas por alumno
- Indicadores visuales de riesgo (< 75% de asistencia en rojo)
- Desglose de PRESENTE, JUSTIFICADO, TARDANZA, AUSENTE
- Búsqueda por materia con gráficos intuitivos

## Arquitectura Técnica

### Base de Datos (Supabase PostgreSQL)
```
materias
├── id (UUID)
├── nombre
├── codigo (único)
├── profesor
└── created_at

alumnos
├── id (UUID)
├── nombre
├── apellido
├── dni (único)
├── email
└── created_at

materia_alumnos (relación N-N)
├── id (UUID)
├── materia_id → materias
├── alumno_id → alumnos
└── UNIQUE(materia_id, alumno_id)

clases
├── id (UUID)
├── materia_id → materias
├── fecha
├── codigo_autoasistencia (único)
└── created_at

asistencias
├── id (UUID)
├── clase_id → clases
├── alumno_id → alumnos
├── estado (presente|ausente|justificado|tarde)
├── created_at
├── updated_at
└── UNIQUE(clase_id, alumno_id)
```

### Stack Tecnológico
- **Frontend**: Next.js 15 (App Router) + React 19
- **UI**: shadcn/ui + Tailwind CSS v4
- **Backend**: Supabase PostgreSQL + Realtime
- **Auth**: Mock auth con localStorage (sin Supabase Auth)
- **Styling**: Institucional, moderno, accesible

## Instalación y Uso

### Requisitos Previos
- Proyecto Vercel conectado a Supabase
- Node.js 18+
- pnpm (package manager por defecto)

### Setup Inicial
1. Las tablas se crean automáticamente con los scripts de migración
2. La app usa mock auth - cualquier email/contraseña funciona
3. No requiere configuración adicional de Supabase Auth

### Flujo de Trabajo del Bedel

#### Primera vez:
1. Login con cualquier email (mock auth)
2. Crear materias en `/materias`
3. Agregar alumnos a cada materia (CSV o manual)

#### Cada clase:
1. Ir a `/asistencia`
2. Seleccionar materia
3. Crear nueva clase o seleccionar una existente
4. Marcar asistencias con botones P/A/J/T
5. Guardar asistencias

#### Generar reportes:
1. Ir a `/informes`
2. Seleccionar materia
3. Ver estadísticas por alumno
4. Identificar alumnos en riesgo (< 75%)

### Importar Alumnos desde CSV

Formato esperado del archivo:
```csv
nombre,apellido,dni,email
Juan,Pérez,30123456,juan.perez@alumno.utn.edu.ar
María,García,34567890,maria.garcia@alumno.utn.edu.ar
```

Validaciones automáticas:
- DNI único por materia
- Email válido (opcional)
- Campos nombre y apellido requeridos

## API / Funciones Principales

### Queries (`lib/supabase/queries.ts`)
```typescript
// Materias
getMaterias()
createMateria(nombre, codigo, profesor)
updateMateria(id, nombre, codigo, profesor)
deleteMateria(id)

// Alumnos
getAlumnosByMateria(materiaId)
createAlumno(nombre, apellido, dni, email)
addAlumnoToMateria(materiaId, alumnoId)
removeAlumnoFromMateria(materiaId, alumnoId)

// Clases
getClasesByMateria(materiaId)
getClaseById(claseId)
createClase(materiaId, fecha)

// Asistencias
getAsistenciasByClase(claseId)
upsertAsistencia(claseId, alumnoId, estado)

// Autoasistencia
getClaseByCode(codigo_autoasistencia)
getAlumnoByDni(dni)
```

### Componentes Reutilizables
- `AsistenciaGrid` - Grid de asistencia optimizado
- `AuthGuard` - Protección de rutas
- `MainNav` - Navegación principal

## Diseño y UX

### Colores Institucionales
- **Primario**: Azul oscuro (UTN)
- **Estados**: Verde (Presente), Rojo (Ausente), Azul (Justificado), Amarillo (Tarde)
- **Fondo**: Blanco limpio, accesibilidad WCAG AA

### Tipografía
- Fuente: Geist (Google Font)
- Jerarquía clara para escaneo rápido
- Tamaños optimizados para lectura en clase

### Usabilidad
- Botones grandes para uso táctil
- Búsqueda rápida visible
- Confirmaciones claras en operaciones destructivas
- Indicadores visuales de estado

## Características de Desarrollo

### Validaciones
- DNI único por materia
- Email válido
- Campos requeridos claramente marcados
- Mensajes de error descriptivos

### Performance
- Índices en base de datos en campos críticos
- Queries optimizadas con selects específicos
- Cache de materias en sesión
- Lazy loading de asistencias

### Seguridad
- Row Level Security (RLS) preparado (puede activarse en Supabase)
- Validación de entrada en todas las operaciones
- Sanitización de datos CSV

## Extensiones Futuras

1. **Autenticación Real**: Migrar de mock auth a Supabase Auth con roles
2. **Alertas**: Notificaciones a alumnos/profesores por email
3. **Estadísticas Avanzadas**: Gráficos de tendencias, análisis por período
4. **Exportación**: PDF/Excel de reportes
5. **Sincronización**: Integración con SIU-Guaraní u otros sistemas de la UTN
6. **APIs Públicas**: Para integración con aplicaciones móviles

## Deployment

La aplicación está lista para desplegar en Vercel:
```bash
# Local development
pnpm dev

# Build for production
pnpm build

# Deploy a Vercel
# Git push activa deploy automático
```

## Licencia

Proyecto desarrollado para la UTN.

## Soporte

Para problemas o sugerencias, contacta al equipo de desarrollo.
