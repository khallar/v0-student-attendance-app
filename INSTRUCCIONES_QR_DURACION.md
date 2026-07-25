# Instrucciones: Implementar Opciones de Tiempo de Vida para QR de Autoasistencia

## Resumen de Cambios

Se ha implementado la funcionalidad para que el bedel pueda seleccionar el tiempo de vida del QR de autoasistencia entre 4 opciones:
- **5 minutos**
- **10 minutos**
- **30 minutos**
- **60 minutos**

## Cambios Realizados

### 1. **Base de Datos**
Se creó un script de migración para agregar la columna `qr_duracion_minutos` a la tabla `clases`:

**Archivo:** `scripts/012_add_qr_duration_to_clases.sql`

```sql
ALTER TABLE clases ADD COLUMN IF NOT EXISTS qr_duracion_minutos INTEGER DEFAULT 25;
```

### 2. **Funciones de Backend** (`lib/supabase/queries.ts`)

#### `activateQR(claseId: string, durationMinutes: number = 25)`
- Ahora acepta un parámetro `durationMinutes` para especificar cuántos minutos vivirá el QR
- Guarda tanto `qr_activo_desde` (timestamp) como `qr_duracion_minutos` (duración en minutos)

#### `isQRValid(qr_activo_desde: string | null, qr_duracion_minutos: number = 25)`
- Ahora recibe el parámetro `qr_duracion_minutos` para validar si el QR sigue siendo válido
- Compara el tiempo transcurrido contra la duración dinámica

#### `getQRRemainingTime(qr_activo_desde: string | null, qr_duracion_minutos: number = 25)`
- Calcula el tiempo restante en segundos basándose en la duración específica del QR
- El cálculo es: `(qr_duracion_minutos * 60 * 1000) - tiempoTranscurrido`

### 3. **Interfaz de Usuario (Bedel)** - `app/asistencia/page.tsx`

#### Nuevos Estados
```typescript
const [qrDuration, setQrDuration] = useState('5') // '5' | '10' | '30' | '60'
```

#### Selector de Duración
Se agregó un componente `Select` que permite elegir la duración:
```jsx
<label className="text-sm font-medium block mb-2">Tiempo de vida del QR</label>
<Select value={qrDuration} onValueChange={setQrDuration}>
  <SelectTrigger className="w-full">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="5">5 minutos</SelectItem>
    <SelectItem value="10">10 minutos</SelectItem>
    <SelectItem value="30">30 minutos</SelectItem>
    <SelectItem value="60">60 minutos</SelectItem>
  </SelectContent>
</Select>
```

#### Botón de Activación
El botón ahora muestra la duración seleccionada:
```jsx
<Button onClick={handleActivateQR} className="w-full bg-green-600 hover:bg-green-700" size="lg">
  <Play className="mr-2 h-5 w-5" />
  Activar QR ({qrDuration} minutos)
</Button>
```

#### Función `handleActivateQR()`
Actualizada para pasar la duración seleccionada:
```typescript
async function handleActivateQR() {
  if (!selectedClase) return
  try {
    const durationMinutes = parseInt(qrDuration, 10)
    await activateQR(selectedClase, durationMinutes)
    setQrActive(true)
    setQrRemainingTime(durationMinutes * 60) // Convert to seconds
  } catch (error) {
    console.error('Error activating QR:', error)
  }
}
```

### 4. **Página de Autoasistencia** - `app/autoasistencia/[codigo]/page.tsx`

Se actualizaron las llamadas a las funciones para pasar los parámetros dinámicos:
- `isQRValid()` ahora recibe `qr_duracion_minutos` de la clase
- `getQRRemainingTime()` ahora recibe `qr_duracion_minutos` de la clase
- El contador de tiempo restante se actualiza correctamente basándose en la duración

## Pasos para Completar la Implementación

### 1. **Migrar la Base de Datos**
Ejecuta el script SQL en tu base de datos Supabase:

```sql
ALTER TABLE clases ADD COLUMN IF NOT EXISTS qr_duracion_minutos INTEGER DEFAULT 25;
```

Puedes hacerlo de dos formas:

**Opción A: Desde Supabase Dashboard**
1. Ve a tu proyecto Supabase
2. Abre SQL Editor
3. Copia y pega el SQL anterior
4. Ejecuta la query

**Opción B: Desde la CLI (si tienes supabase-cli instalado)**
```bash
supabase db push
```

### 2. **Probar la Funcionalidad**

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Accede a la página de asistencia:
   - URL: `http://localhost:3000/asistencia`
   - Email: usa uno de los emails autorizados en `config/bedeles.ts`

3. Selecciona una materia y clase

4. Haz clic en el botón "Autoasistencia QR"

5. **Verás un nuevo selector** con las opciones:
   - 5 minutos
   - 10 minutos
   - 30 minutos
   - 60 minutos

6. Selecciona una duración y presiona "Activar QR"

7. El QR se generará y contará hacia atrás el tiempo seleccionado

## Flujo Completo

### Desde el lado del Bedel:
1. Bedel abre la página de asistencia
2. Selecciona materia y clase
3. Abre el diálogo de "Autoasistencia QR"
4. **NUEVO**: Selecciona el tiempo de vida del QR (5, 10, 30 o 60 minutos)
5. Presiona "Activar QR"
6. El QR se muestra con el código y el contador de tiempo restante
7. Los alumnos tienen el tiempo seleccionado para escanear

### Desde el lado del Alumno:
1. Alumno escanea el QR o accede al link de autoasistencia
2. Ingresa su DNI
3. Marca "Dar Presente"
4. Si el tiempo ha expirado, ve un mensaje "Tiempo Expirado"

## Detalles Técnicos

### Base de Datos
- **Tabla:** `clases`
- **Nueva columna:** `qr_duracion_minutos` (INTEGER, DEFAULT 25)
- **Valores válidos:** 5, 10, 30, 60 (o cualquier número de minutos)

### Compatibilidad Hacia Atrás
- Si existe un QR activado sin la columna, el valor por defecto es 25 minutos
- Las clases antiguas seguirán funcionando con 25 minutos si no se especifica otra duración

### Validación en Tiempo Real
- El contador se actualiza cada segundo en ambos lados (bedel y alumno)
- Cuando el tiempo llega a 0, el QR expira automáticamente
- El alumno recibe un mensaje si intenta usar un QR expirado

## Archivos Modificados

- ✅ `lib/supabase/queries.ts` - Funciones de QR actualizadas
- ✅ `app/asistencia/page.tsx` - UI del bedel con selector de duración
- ✅ `app/autoasistencia/[codigo]/page.tsx` - Validación dinámica de duración
- ✅ `scripts/012_add_qr_duration_to_clases.sql` - Script de migración (NUEVO)

## Próximos Pasos

1. ✅ Código del app está completo y compilado
2. ⚠️ **PENDIENTE**: Ejecutar el script SQL en tu base de datos Supabase
3. ✅ La UI está lista para usar una vez que la columna existe en la BD

## Soporte

Si encuentras algún problema:
1. Verifica que la columna `qr_duracion_minutos` exista en la tabla `clases`
2. Revisa que los valores guardados sean números válidos (5, 10, 30, 60)
3. Comprueba que el proyecto compile sin errores: `npm run build`
