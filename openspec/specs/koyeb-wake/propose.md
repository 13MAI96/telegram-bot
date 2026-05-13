Nombre del cambio: Koyeb Wake Notification

## Contexto
- Esta aplicacion se corresponde a un bot de telegram con el cual el usuario puede registrar sus gastos de forma rapida y sencilla
- Utiliza una base de datos MongoDB donde se guardan las especificaciones de cada grupo de usuarios y una conexion con una hoja de calculos de google donde se guarda la informacion de manera que sea facil para el usuario visualizar la informacion.
- Se ejecuta actualmente en un servicio gratuito de Koyeb el cual luego de una hora sin trafico http desactiva la instancia.
- El bot utiliza un modelo de polling, perteneciente a la libreria que se utiliza actualmente, por lo tanto los mensajes con el bot no se registran como trafico HTTP

## Restrictiones
- El desarrollo debe continuar realizandose en NEST.JS y aplicando tipado estricto de Typescript en todo lo que se incorpore.
- No se necesita un login ya que se reconoce al usuario por su id de contacto en telegram.
- El usuario debe recibir una notificacion solamente si estuvo utilizando el bot durante la ultima hora.

## Que busco realizar
Quiero realizar una actualizacion donde:
- El bot envie un mensaje a los usuarios activos durante la ultima hora, donde notifique que entrara en modo de reposo y que hay que volver a activarlo mediante un link HTTP
- El usuario solo debe recibir un mensaje de notificacion
- El link de activacion sera en el dominio de ejecucion actual bajo la ruta /
- En caso de que el envio de un mensaje a un usuario falle, el bot no detendria sus funcionalidades y solamente descartaria el mensaje hacia dicho usuario.


## Funciones requeridas
- Nuevo servicio/handler que se encargue de alertar a los usuario que el bot esta por entrar en modo hibernacion
- Mantener un registro de los usuario activos solamente en la ultima hora
- Enviar una notificacion a los usuarios en el registro de activos, cuando el bot esta cercano a entrar en modo hibernacion.
- Generar el link de activacion utilizando para ello el dominio publico desde el cual se puede ingresar a la API
- Si el mensaje a un usuario falla, hacer un log del error pero continuar con el funcionamiento normal

## No goal
- Base de datos
- Autenticacion