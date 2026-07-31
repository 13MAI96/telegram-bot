## Why

El bot ya registra y consulta movimientos, pero todavía no ofrece una vista visual para entender rápidamente cómo se distribuyen los gastos por categoría en un mes. Este cambio busca agregar un primer dashboard útil sin sacar al usuario del chat, priorizando una imagen generada y enviada por Telegram antes de invertir en un frontend separado.

## What Changes

- Agregar un nuevo flujo de dashboard para que el usuario elija un mes y vea un gráfico de torta de gastos por categoría.
- Permitir filtrar el gráfico por uno o más titulares y una o más cuentas, además de soportar una opción de "todos".
- Permitir excluir categorías del gráfico antes de generarlo, usando una lista con índices y opciones `ninguna` o `todos`.
- Leer los movimientos desde `Caja`, filtrar por mes, cuentas y titulares, y agrupar sólo gastos por categoría.
- Generar una imagen del gráfico server-side y enviarla como respuesta en el mismo chat de Telegram como primera opción.
- Documentar la alternativa de un frontend básico Angular con link/token temporal como opción posterior si Telegram limita interacción, tamaño, navegación histórica o múltiples gráficos.
- Agregar la mínima dependencia de renderizado necesaria para producir imágenes estáticas de gráficos desde Node.js.

## Capabilities

### New Capabilities

- `expense-category-dashboard`: Usuarios pueden generar un gráfico mensual de gastos por categoría con filtros opcionales de titulares y cuentas, recibido como imagen en Telegram.

### Modified Capabilities

None.

## Impact

Las áreas afectadas incluyen `src/bot/bot.service.ts` para exponer el comando del dashboard, nuevos wizards bajo `src/bot/wizards/`, `src/sheets/sheets.service.ts` para leer y agregar gastos desde `Caja`, y nuevos servicios compartidos para preparar datasets y renderizar imágenes de gráficos. El cambio probablemente agregue una dependencia de generación de gráficos compatible con Node.js y tests para filtros, agregación, renderizado y envío por Telegram.
