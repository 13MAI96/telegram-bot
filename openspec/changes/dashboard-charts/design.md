## Context

El bot ya corre como una aplicación NestJS con `nestjs-telegraf`, MongoDB para metadata de grupos y Google Sheets como fuente operativa de movimientos. La hoja `Caja` ya se consulta para movimientos recientes, pero todavía no existe una lectura agregada por período/categoría ni una superficie visual. El despliegue usa `node:22-bookworm-slim`, por lo que cualquier solución de gráficos debe considerar tamaño de imagen Docker, dependencias nativas, estabilidad en Koyeb y tiempo de respuesta dentro de una conversación de Telegram.

El requerimiento tiene dos caminos posibles: generar una imagen y responderla en el mismo chat, o exponer un frontend básico con un link/token temporal. La primera opción es más viable para este alcance porque el gráfico pedido es estático, puntual y de baja interacción: mes, titulares, cuentas y torta por categorías. Un frontend Angular agrega hosting de assets, autenticación temporal, expiración de tokens, rutas públicas y estado web para una necesidad que Telegram puede resolver con una imagen.

## Goals / Non-Goals

**Goals:**

- Agregar un comando de dashboard que permita elegir mes, titulares, cuentas y categorías a excluir.
- Consultar `Caja`, filtrar gastos por mes/titulares/cuentas/categorías excluidas y agrupar importes debitados por categoría.
- Generar un gráfico de torta como imagen PNG y enviarlo en el mismo chat de Telegram.
- Incluir una respuesta textual de respaldo con totales por categoría para casos sin imagen o con error de renderizado.
- Mantener la alternativa frontend documentada como extensión futura si se requieren más gráficos, interacción o navegación histórica.

**Non-Goals:**

- Construir Angular en esta iteración.
- Agregar login web, tokens temporales o un dashboard persistente.
- Reemplazar Google Sheets como fuente de datos.
- Crear gráficos distintos al gasto mensual por categoría.
- Implementar drill-down interactivo dentro del gráfico.

## Decisions

### 1. Priorizar imagen generada en backend y enviada por Telegram

El flujo principal será un wizard de Telegram que recolecta filtros, genera el dataset y responde con una imagen PNG mediante Telegraf (`replyWithPhoto` o API equivalente). El caption o mensaje complementario incluirá mes, filtros aplicados y total general.

Rationale: cumple el requerimiento sin sacar al usuario del chat, no requiere hosting web adicional y evita diseñar permisos/tokenización para un frontend público.

Alternatives considered:

- Frontend Angular con link temporal. Es viable técnicamente, pero aumenta mucho el alcance: build/deploy web, tokens efímeros, rutas públicas, expiración, control de acceso por grupo y UX fuera de Telegram.
- Servicio externo tipo QuickChart. Es rápido de integrar, pero introduce dependencia de red externa, potencial exposición de datos financieros agregados y menor control operativo.

### 2. Usar un renderer server-side liviano para PNG, evitando dependencias nativas pesadas cuando sea posible

Para una torta estática se puede generar la imagen con una dependencia Node liviana o con un renderer propio basado en PNG/SVG simple. La implementación debe evitar, salvo necesidad demostrada, stacks como Chromium/Playwright o `canvas` nativo porque complican `node:22-bookworm-slim`.

Rationale: el gráfico requerido es simple y no justifica un runtime pesado. Un renderer acotado reduce riesgo de despliegue y facilita tests sobre el dataset y la respuesta de Telegram.

Alternatives considered:

- `chartjs-node-canvas`/`canvas`. Produce gráficos buenos, pero puede requerir librerías nativas de Cairo/Pango y ajustes de Docker.
- Renderizar un HTML con Puppeteer. Da máxima fidelidad visual, pero agrega Chromium y un coste operativo desproporcionado para una torta.
- Enviar SVG como documento. Reduce renderizado, pero no entrega una imagen vista directamente como foto en el chat.

### 3. Centralizar consulta y agregación de gastos desde `Caja`

`SheetsService` debe exponer una lectura de movimientos de `Caja` suficientemente estructurada para filtrar por fecha, cuenta y titular. Encima de esa lectura, un servicio de dashboard agregará sólo filas con débito mayor a `0`, agrupadas por categoría y acotadas al mes elegido.

Rationale: separar lectura cruda de agregación mantiene `SheetsService` enfocado en Sheets y deja las reglas de dashboard testeables sin depender de Google APIs.

Alternatives considered:

- Agregar directamente dentro del wizard. Rechazado porque mezcla conversación, datos y reglas de negocio.
- Crear una hoja auxiliar con fórmulas/gráficos. Rechazado porque vuelve a acoplar la UX a estructura manual del spreadsheet.

### 4. Filtros conversacionales con opción "todos" y exclusión de categorías

El wizard pedirá mes, titulares, cuentas y categorías a evitar. Para titulares/cuentas aceptará una opción "todos" y selección múltiple por nombres separados por coma, validando case-insensitive contra los maestros del grupo y persistiendo valores canónicos en el criterio. Para categorías a evitar sí mostrará una lista indexada, porque el usuario está excluyendo opciones puntuales del gráfico; aceptará índices separados por coma, `ninguna` para no excluir categorías y `todos` para excluir todas.

Rationale: es suficiente para el primer dashboard y evita una conversación larga por cada filtro.

Alternatives considered:

- Selección campo por campo con índices. Rechazada por fricción en grupos con muchos titulares/cuentas.
- Mostrar listas completas para titulares/cuentas. Rechazada para reducir ruido en el chat; la validación sigue usando maestros registrados.
- Sin filtros o exclusiones en la primera versión. Rechazada porque el requerimiento los pide desde el inicio.

## Risks / Trade-offs

- El formato real de `Caja` puede variar entre grupos. → Mitigation: reutilizar y extender el mapeo ya centralizado de movimientos, agregar tests con valores monetarios formateados y fallar con mensajes claros.
- Un renderer propio puede verse menos sofisticado que Chart.js. → Mitigation: limitar el alcance visual a torta legible, leyenda, porcentajes y total; calcular altura según cantidad de categorías para evitar cortes; reevaluar librería si la calidad no alcanza.
- Telegram tiene límites de tamaño y comportamiento de previews. → Mitigation: generar PNG de tamaño fijo razonable y responder con texto de respaldo si falla el envío.
- La lectura completa de `Caja` puede crecer. → Mitigation: filtrar en memoria para esta primera versión y medir; optimizar rango/consulta si el volumen real lo exige.
- Si después se requieren múltiples gráficos o interacción, Telegram se queda corto. → Mitigation: dejar preparada una frontera de servicio (`DashboardDataService`) reutilizable por un futuro frontend.

## Migration Plan

1. Agregar dependencia o implementación de renderizado PNG compatible con el contenedor actual.
2. Extender la lectura de `Caja` para obtener movimientos con fecha, categoría, cuenta, titular, débito y crédito.
3. Crear un servicio de agregación para gastos mensuales por categoría con filtros.
4. Crear el wizard/comando de dashboard y enviar el PNG por Telegram con texto de respaldo.
5. Agregar tests de agregación, validación de filtros, casos sin datos y envío de imagen.
6. Validar `npm run build`, tests y, si se agrega dependencia nativa, build de Docker.

Rollback strategy: deshabilitar el comando del dashboard y conservar los servicios sin afectar los flujos transaccionales existentes.

## Open Questions

- Nombre final del comando: se propone `/dashboard` salvo que se prefiera un nombre más específico como `/gastos_categorias`.
- Formato de mes: se propone aceptar `mm/yyyy`, nombres de mes del año actual y shortcuts `actual`/`pasado`.
- Si una categoría tiene monto `0` luego de filtros, se propone excluirla del gráfico.
