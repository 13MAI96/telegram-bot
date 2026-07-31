## Context

El bot actual resuelve las conversaciones financieras como escenas Telegraf independientes. Los comandos `/gasto` e `/ingreso` ya abren wizards paso a paso, mientras que el flujo `plane-text` se dispara hoy desde `@On('text')` cuando llega cualquier mensaje libre fuera de una escena activa. Ese comportamiento ya no coincide con el requerimiento: el gasto plano debe entrar sólo por `/gasto_plano`, y además debe aparecer un flujo hermano `/ingreso_plano` con el mismo contrato de payload completo. En paralelo, no existe un wizard para consultar movimientos históricos, aunque `SheetsService` ya tiene acceso autenticado al spreadsheet del grupo y puede ampliarse para leer la hoja `Caja`.

La implementación debe preservar el modelo actual de grupo y hoja por grupo, usar validaciones estrictas pero case-insensitive para maestros de texto, y evitar romper el resto de comandos existentes. También conviene definir una sola estrategia de parseo para los payloads planos, porque ingreso y gasto comparten fecha, categoría, descripción, monto, cuenta y titular, cambiando únicamente si el monto termina en débito o crédito al persistir.

## Goals / Non-Goals

**Goals:**

- Exponer `/transactions`, `/ingreso_plano` y `/gasto_plano` como entradas explícitas en el bot.
- Eliminar la dependencia de mensajes libres automáticos para iniciar el gasto plano.
- Compartir el parseo y la validación del payload plano entre ingreso y gasto, incluyendo fechas `dd/mm/yyyy`, `hoy` y `ayer`.
- Leer los últimos 5 movimientos coincidentes desde la hoja `Caja` y responderlos con el formato pedido.
- Mantener la persistencia actual en Google Sheets sin introducir nuevas fuentes de datos.

**Non-Goals:**

- Crear o administrar comandos de BotFather desde código.
- Cambiar los wizards transaccionales existentes `/gasto`, `/ingreso`, `/cuotas`, `/transferencia` o `/suscripcion` fuera de los puntos de integración necesarios.
- Rediseñar la estructura del spreadsheet o migrar datos históricos.
- Agregar nuevos filtros, paginación o exportación para la consulta de movimientos.

## Decisions

### 1. Separar entrada por comando de la lógica de parseo plano

`BotService` pasará a registrar dos comandos explícitos, `/gasto_plano` y `/ingreso_plano`, y dejará de usar el `planeTextManager` como puerta principal para ese flujo. La lógica de parseo del mensaje completo vivirá en un helper compartido o servicio pequeño para que ambos wizards reutilicen exactamente la misma validación y solo difieran en cómo construyen débito/crédito.

Rationale: el requisito redefine el contrato de UX; mantener el trigger implícito por cualquier texto libre produciría ambigüedad y resultados inesperados.

Alternativas consideradas:

- Mantener `@On('text')` además del comando. Rechazado porque deja dos formas distintas de entrar al mismo flujo y complica soporte/validación.
- Duplicar la lógica de parseo en dos wizards. Rechazado porque la superficie de validación es idéntica salvo la dirección del monto.

### 2. Modelar ingreso y gasto plano como payload normalizado

El mensaje plano se parseará como `fecha, categoria, descripcion, monto, cuenta, titular`, con trimming obligatorio y rechazo si faltan o sobran valores relevantes. La fecha se resolverá mediante el `DateService` existente, extendiendo o reutilizando la lógica que ya admite shortcuts en otros flujos. Categoría, cuenta y titular se validarán comparando en forma case-insensitive contra los maestros del grupo, pero se persistirá el valor canónico registrado en el grupo. El monto seguirá usando `NumberService` y las mismas reglas de no negatividad que los demás wizards.

Rationale: normalizar primero permite que ambos comandos compartan validación, mensaje de confirmación y construcción de la fila a persistir.

Alternativas consideradas:

- Persistir exactamente el casing recibido por el usuario. Rechazado porque rompe consistencia visual y puede introducir variantes duplicadas del mismo maestro.
- Validar con comparación exacta. Rechazado porque el requerimiento pide coincidencia sin sensibilidad a mayúsculas/minúsculas.

### 3. Resolver consultas de movimientos leyendo `Caja` por columnas lógicas

Se agregará en `SheetsService` una operación de lectura sobre la hoja `Caja` que recupere filas suficientes para filtrar por cuenta y titular y devolver las 5 más recientes. La implementación debe asumir el layout usado por las filas de balance del bot: fecha, categoría, descripción, cuenta, titular, débito, crédito, creado por. La respuesta del wizard formateará cada línea como `${fecha} - ${descripcion} - Deb.: ${debito} - Cred.: ${credito}`, omitiendo el segmento de débito o crédito cuando su valor sea `0`.

Rationale: el spreadsheet ya es el source of truth operativo para estos movimientos; leerlo directamente evita agregar almacenamiento paralelo.

Alternativas consideradas:

- Consultar una hoja observada o derivada. Rechazado porque el requerimiento menciona explícitamente `Caja`.
- Devolver resultados sin wizard, todo en un comando con argumentos. Rechazado porque el requerimiento pide solicitar cuenta y titular al usuario.

### 4. Mantener confirmación explícita y reintento total del payload

Tanto `/gasto_plano` como `/ingreso_plano` seguirán mostrando un resumen detectado y pedirán confirmación antes de persistir. Si algún dato es inválido, el wizard no intentará corregir campo por campo: volverá a pedir el mensaje completo con el orden exacto requerido.

Rationale: el requerimiento pide reingresar el texto completo ante cualquier error y eso simplifica el estado interno del wizard.

Alternativas consideradas:

- Reintentar solo el campo inválido. Rechazado porque cambia el contrato conversacional pedido.

## Risks / Trade-offs

- Asumir columnas fijas en `Caja` puede fallar si algún grupo tiene una variante manual del spreadsheet. → Mitigation: centralizar el mapeo en `SheetsService`, documentar la suposición en tests y fallar con mensaje claro si la lectura no devuelve el layout esperado.
- Quitar el trigger implícito por texto libre puede cambiar hábitos de usuarios existentes. → Mitigation: incluir los nuevos comandos en `/help` y dejar explícito en despliegue que BotFather debe publicarlos.
- Un helper compartido de payload plano puede introducir regresiones en el gasto plano actual. → Mitigation: cubrir el parseo de gasto e ingreso con tests dedicados y conservar el resumen/confirmación antes de grabar.
- Filtrar últimos 5 movimientos en memoria puede ser menos eficiente que consultas acotadas por rango. → Mitigation: el volumen esperado por grupo es manejable para una lectura de hoja; optimizar solo si el tamaño real lo exige.

## Migration Plan

1. Registrar en BotFather los nuevos comandos `/transactions`, `/ingreso_plano` y `/gasto_plano`.
2. Incorporar los comandos y wizards nuevos en la aplicación, dejando de iniciar gasto plano desde texto libre automático.
3. Extender `SheetsService` para leer movimientos desde `Caja` y validar el formato de respuesta.
4. Ejecutar tests del bot y de wizards para asegurar entradas, validaciones y persistencia.
5. Desplegar el bot con la nueva ayuda/comandos y monitorear errores de lectura/escritura de Sheets.

Rollback strategy: revertir el registro de comandos en código y volver a la entrada previa del wizard `plane-text` si la nueva UX o la lectura de `Caja` fallan en producción.

## Open Questions

- El cambio asume que `Caja` comparte el mismo layout de columnas que hoy se escribe en la hoja de balance. Si existiera una variante real distinta, habrá que ajustar el mapeo antes de implementar.
