Nombre del cambio: fixed

Quiero realizar un analisis funcional y una actualizacion completa de lo desarrollado en esta aplicacion.

## Contexto
- Esta aplicacion se corresponde a un bot de telegram con el cual el usuario puede registrar sus gastos de forma rapida y sencilla
- Utiliza una base de datos MongoDB donde se guardan las especificaciones de cada grupo de usuarios y una conexion con una hoja de calculos de google donde se guarda la informacion de manera que sea facil para el usuario visualizar la informacion

## Restrictiones
- El desarrollo debe continuar realizandose en NEST.JS y aplicando tipado estricto de Typescript en todo lo que se incorpore.
- No se necesita un login ya que se reconoce al usuario por su id de contacto en telegram.

## Que busco realizar
Quiero realizar una actualizacion donde:
- El wizard fixed debe permitir agregar un gasto de cobro periodico, similar a cuotas, pero con el mismo monto en cada cobro
- El wizard deberia preguntar fecha fija de cobro, categoria, cuenta a cobrar, titular de la misma, monto a debitar y cantidad de repeticiones
- El wizard deberia hacer validaciones, podria recibir categoria en base a id de la lista pero no deberia exponer cuentas ni titulares. 
- El monto deberia ser cargado como debito sin ningun cambio en el monto.


## Funciones requeridas
- Nuevo wizard fixed bajo el comando /suscripcion
- Crear un cobro repetitivo con los datos solicitados al usuario
- Validar que la fecha inicial no sea menor a un mes de la fecha ni mayor a un anio.
- Validar que categoria, cuenta y titular sean correctos
- Recibir una cantidad de repeticiones validas entre 1 y 12 veces.
- Si alguno de las validaciones falla. notificar el error al usuario y mantenerse en el mismo paso hasta recibir el dato correcto.

## Non-goals
- Base de datos
- Autenticacion