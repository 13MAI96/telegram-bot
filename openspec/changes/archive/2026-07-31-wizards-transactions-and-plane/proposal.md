## Why

El bot hoy no ofrece una forma guiada para consultar los últimos movimientos de una cuenta/titular, y el flujo de texto plano para gastos depende de mensajes libres fuera de comando, con un formato distinto al solicitado para ingresos. Este cambio es necesario para exponer ambos casos como comandos explícitos, unificar las reglas de validación del ingreso/gasto en texto plano y permitir una consulta rápida sobre la hoja `Caja`.

## What Changes

- Agregar un nuevo comando `/transactions` que abra un wizard para pedir cuenta y titular, consultar la hoja `Caja` y responder con los últimos 5 movimientos coincidentes.
- Agregar un nuevo comando `/ingreso_plano` que abra un wizard de texto plano para registrar ingresos mediante un único mensaje con los campos `fecha, categoria, descripcion, monto, cuenta, titular`.
- Actualizar el wizard actual de texto plano para que funcione bajo el comando `/gasto_plano`, use el mismo contrato de entrada que `/ingreso_plano` y registre la operación como gasto.
- Validar fecha, categoría, cuenta, titular y monto en ambos flujos de texto plano, con coincidencia case-insensitive para valores maestros y reintento del mensaje completo ante cualquier dato inválido.
- Mantener la persistencia actual en Google Sheets y reutilizar la metadata de grupo ya disponible para resolver maestros y acceso al spreadsheet.

## Capabilities

### New Capabilities

- `transaction-history`: Consultar los últimos movimientos de `Caja` filtrados por cuenta y titular desde un wizard explícito.
- `plain-text-transactions`: Registrar ingresos y gastos de texto plano mediante comandos explícitos, validación integral del payload y persistencia consistente en Google Sheets.

### Modified Capabilities

None.

## Impact

Las áreas afectadas incluyen `src/bot/bot.service.ts` para registrar los nuevos comandos y retirar el acoplamiento actual de gasto plano a cualquier mensaje libre, `src/bot/wizards/plane-text/plane-text.wizard.ts` y un nuevo wizard de ingreso plano, servicios compartidos de fecha y número para reutilizar validaciones, y `src/sheets/sheets.service.ts` para leer movimientos desde la hoja `Caja`. También se verán afectados los tests del bot y de wizards transaccionales, y la operación requerirá crear los comandos correspondientes en BotFather como paso de despliegue externo.
