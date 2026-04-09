# Guía Rápida del Bedel - UTN ASISTENCIA

## Login
- Usa cualquier email y contraseña
- Ejemplo: `bedel@utn.edu.ar` / `contraseña123`

## Inicio Rápido (Primeros Pasos)

### 1. Crear una Materia
1. Desde Dashboard → Click en "Materias"
2. Botón "Nueva materia"
3. Completa:
   - Nombre: ej. "Programación I"
   - Código: ej. "PROG-001"
   - Profesor: ej. "Dr. Juan Pérez"
4. Guardar

### 2. Agregar Alumnos
1. En Materias → Click en el icono de personas
2. Opción A - Importar CSV:
   - Click "Importar CSV"
   - Descarga template
   - Completa con datos de alumnos
   - Revisa preview
   - Confirma
3. Opción B - Agregar manual:
   - Click "Agregar alumno"
   - Completa Nombre, Apellido, DNI, Email

### 3. Tomar Asistencia en Clase
1. Click en "Asistencia" (en el menú)
2. Selecciona Materia
3. Selecciona o crea Clase:
   - Si es nueva: Click "Nueva clase"
4. Se carga la lista de alumnos
5. **BOTONES (ultra rápido):**
   - P = Presente (verde)
   - A = Ausente (rojo)
   - J = Justificado (azul)
   - T = Tarde (amarillo)
6. Busca alumnos por nombre o DNI
7. Click "Guardar Asistencias" cuando termines

## Acciones Rápidas

### Marcar todo Presente
En la pantalla de asistencia:
1. Click "Marcar todos Presente"
2. Luego corrije individuales si es necesario

### Marcar todo Ausente
En la pantalla de asistencia:
1. Click "Marcar todos Ausente"

### Ver Resumen del Día
En asistencia:
- Arriba ves: P: XX | A: XX | J: XX | T: XX

## Informes y Reportes

1. Click en "Informes"
2. Selecciona Materia
3. Ves:
   - Total de clases
   - Total de alumnos
   - Promedio de asistencia
   - Alumnos EN RIESGO (< 75%)
4. Tabla detallada por alumno

## Generar URL de Autoasistencia

Útil para clases con autoasistencia (alumnos se marcan solos):

1. En la materia, copiar el código de autoasistencia
2. URL: `https://tuapp.com/autoasistencia/[CODIGO]`
3. Los alumnos ingresan su DNI
4. Se registran como PRESENTE automáticamente

## Preguntas Frecuentes

**P: ¿Puedo editar una asistencia después de guardar?**
R: Sí, vuelve a la clase y cambia el estado del alumno

**P: ¿Se pierden datos si cierro la sesión?**
R: No, todo está guardado en la base de datos. Al login vuelves a ver todo.

**P: ¿Cómo bajo un reporte?**
R: En Informes, selecciona materia y usa "Descargar Reporte" (próximamente)

**P: ¿Qué pasa si cometo un error en la importación?**
R: Ve error detallado por fila. Puedes corregir o importar de nuevo.

**P: ¿Funciona sin internet?**
R: No, necesita conexión a la base de datos en todo momento

## Atajos de Teclado (Próximos)

- `Ctrl+S` = Guardar asistencias
- `Ctrl+N` = Nueva clase
- `Ctrl+F` = Buscar alumno

## Contacto / Problemas

Si hay problemas:
1. Recarga la página (F5)
2. Cierra sesión y vuelve a loguear
3. Contacta al equipo de TI

---

**Versión:** 1.0
**Última actualización:** 2026
**Estado:** Producción
