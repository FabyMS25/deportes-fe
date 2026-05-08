# Manual de Usuarios - DEPORTESAPP

**Sistema de Reservas de Canchas Deportivas del GAMQ**  
**Version del manual:** 2026-04-29  
**Formato:** Markdown para documentacion interna en `docs/`

## Como usar este manual

Este manual esta dirigido a usuarios operativos de DEPORTESAPP: administradores, encargados, supervisores, contribuyentes y representantes. Su objetivo es explicar **que puede hacer cada usuario y como realizar cada accion paso a paso**, evitando detalles tecnicos innecesarios.

Para consultar una accion concreta, ubique primero el modulo donde se realiza:

- Para crear o administrar reservas, consulte **Gestion de Reservas** y **Listas de Reservas**.
- Para pagos, tasas y comprobantes, consulte primero la accion dentro de reservas y luego la referencia **Pagos y RUAT**.
- Para administrar complejos, campos, tarifas o configuraciones, consulte las secciones de administracion.
- Para reportes, consulte la seccion **Reportes**.

Las secciones de referencia explican conceptos generales. Las secciones operativas incluyen pasos numerados para ejecutar acciones dentro del sistema.

## 1. Introduccion y Marco Operativo

El Sistema de Reservas de Canchas Deportivas es la plataforma oficial del Gobierno Autonomo Municipal de Quillacollo (GAMQ), desarrollada para centralizar, modernizar y transparentar la administracion de toda la infraestructura deportiva municipal. Esta herramienta permite operativizar el Reglamento a la Ley Municipal 686/2024, transformando los procedimientos administrativos en flujos digitales eficientes que benefician tanto a la ciudadania como a la gestion interna, garantizando el cumplimiento normativo en cada paso.

### 1.1 Proposito del Sistema para la Gestion Municipal

Como administrador o encargado, esta herramienta permite:

- Gestionar de forma unificada la disponibilidad, tarifas y estados de toda la red de complejos y campos deportivos municipales.
- Aplicar de manera automatica y uniforme las normativas, tarifas y sanciones establecidas en el reglamento.
- Automatizar el ciclo completo de reservas y pagos, integrado de forma segura con el sistema tributario RUAT.
- Optimizar la operativa diaria, reduciendo conflictos, mejorando el servicio al ciudadano y liberando tiempo para una gestion mas estrategica.

### 1.2 Alcance Funcional

El sistema proporciona control sobre los siguientes modulos operativos:

- **Gestion del catalogo deportivo:** administracion de complejos, campos, horarios, tarifas, superficies, categorias y estados de disponibilidad.
- **Control centralizado de reservas:** registro, aprobacion, modificacion, anulacion y seguimiento de reservas puntuales, eventos, reservas recurrentes y mensualidades.
- **Administracion de usuarios externos:** gestion de contribuyentes, representantes, organizaciones, estudiantes y estados de sancion.
- **Modulo financiero integrado:** generacion de tasas, consulta de pagos, anulaciones y seguimiento de transacciones mediante RUAT.
- **Supervision operativa:** control de disponibilidad desde calendario, mapa, listas de reservas y paneles de seguimiento.
- **Reportes e indicadores:** generacion de reportes de pagos, reservas, mensualidades, ocupacion e ingresos para la toma de decisiones.

### 1.3 Marco Normativo de Referencia

Todas las funcionalidades del sistema estan orientadas a apoyar el cumplimiento de la normativa municipal vigente:

- **Ley Autonoma Municipal Nro. 686/2024, Ley Municipal del Deporte:** establece el derecho al deporte y encomienda al GAMQ su promocion y administracion.
- **Reglamento a la Ley 686/2024, Decreto Municipal Nro. 11/2024:** norma que rige el uso de los campos deportivos municipales y define procedimientos, plazos, categorias, tarifas, causales de sancion y accesos preferentes.

Referencias operativas principales:

- Categorias de campos deportivos: Elite, A y B.
- Procedimientos y plazos para solicitudes de reserva.
- Tarifas oficiales por tipo de campo y usuario.
- Causales de sancion y perdida de beneficios.
- Accesos libres y preferentes.

## 2. Objetivos y Alcance Estrategico

### 2.1 Objetivos Estrategicos

El sistema fue implementado para cumplir con los siguientes objetivos institucionales:

- **Cumplimiento normativo automatizado:** asegurar que cada reserva y transaccion se ajuste al marco reglamentario, minimizando errores y disputas.
- **Optimizacion de recursos e infraestructura:** maximizar el uso y la vida util de los escenarios deportivos mediante planificacion centralizada y control programado de mantenimientos.
- **Transparencia y trazabilidad total:** generar un registro auditable de cada reserva, pago, anulacion y sancion administrativa.
- **Informacion para la toma de decisiones:** proveer datos confiables de ocupacion, recaudacion y uso para disenar y evaluar politicas publicas deportivas.

### 2.2 Alcance Operativo y Limites

Es fundamental conocer las capacidades y limites del sistema para una gestion efectiva:

- **Alcance operativo:** el sistema administra campos deportivos municipales, complejos, tarifas, horarios, reservas, mensualidades, contribuyentes, organizaciones, pagos y reportes.
- **Reservas vs. supervision fisica:** el sistema gestiona la asignacion de turnos y el cobro de tasas, pero no sustituye la verificacion presencial del estado de las instalaciones antes, durante o despues de la actividad.
- **Generacion vs. ejecucion del pago:** el sistema genera la obligacion tributaria mediante RUAT, pero el pago lo realiza el contribuyente por los canales autorizados. La reserva se confirma cuando el pago es verificado.
- **Gestion de sanciones administrativas:** el sistema permite registrar estados como sancionado, bloqueado o no show. No genera automaticamente multas economicas; cualquier sancion monetaria debe seguir el procedimiento administrativo externo que corresponda.
- **Dependencia de servicios externos:** las operaciones de tasas y pagos dependen de la disponibilidad de RUAT y de las configuraciones institucionales cargadas.

## 3. Antes de Comenzar: Requisitos de Acceso

DEPORTESAPP no administra directamente los usuarios internos ni sus permisos institucionales. Estas acciones son gestionadas por el sistema central GAMQSIS, que centraliza la creacion y mantenimiento del personal, sus credenciales y sus accesos a modulos.

Para acceder a DEPORTESAPP como usuario interno, se requiere:

- Tener una cuenta activa en GAMQSIS.
- Tener asignado el modulo `DEPORTESAPP` con codigo `SIS-013`.
- Contar con permisos especificos segun el rol que desempenara.
- Tener asignacion de complejo cuando el usuario opere como encargado.

Para acceder como contribuyente, se requiere:

- Tener registro activo como contribuyente.
- Contar con credenciales validas.
- No encontrarse bloqueado o sancionado de forma que impida nuevas reservas.
- Tener datos suficientes para operaciones RUAT cuando la reserva genere tasa.

El acceso real a cada pantalla depende de los permisos asignados, del tipo de usuario, de las configuraciones activas del sistema y de la disponibilidad de los servicios externos requeridos.

### 3.1 Roles y Permisos Disponibles

Antes de solicitar acceso, es importante conocer los roles disponibles y sus niveles de acceso. Esto permite identificar que rol se debe solicitar segun la funcion que desempenara el usuario.

#### 3.1.1 Roles predefinidos

| Rol | Alcance | Permisos principales | Restricciones |
|---|---|---|---|
| Super Admin | Sistema completo, incluyendo configuraciones y clasificadores RUAT | Acceso total a funcionalidades administrativas, configuraciones de sistema y clasificadores RUAT | Ninguna restriccion funcional dentro del sistema |
| Administrador | Gestion general del sistema | Gestion de complejos, campos, encargados, categorias, superficies, reservas, contribuyentes, organizaciones y reportes | Puede no tener acceso a configuraciones de sistema ni clasificadores RUAT si esos permisos son exclusivos del Super Admin |
| Encargado | Complejo asignado | Ver, crear, actualizar, validar o anular reservas de su complejo; consultar contribuyentes y organizaciones segun permisos | No debe acceder a informacion de complejos no asignados ni a configuraciones globales |
| Supervisor | Consulta y seguimiento | Ver calendario, mapa, informacion de complejos, campos, reservas y reportes segun permisos | No debe crear, modificar, validar ni anular si solo tiene lectura |
| Contribuyente | Uso ciudadano | Ver mapa, consultar disponibilidad, crear reservas permitidas, consultar sus reservas y comprobantes | Solo accede a informacion propia y funcionalidades ciudadanas |
| Representante | Organizaciones vinculadas | Reservar para organizaciones representadas y consultar informacion vinculada | Solo puede operar organizaciones asociadas o habilitadas |

#### 3.1.2 Tabla detallada de permisos por modulo

| Menu padre | Submenu | Permisos disponibles | Roles con acceso |
|---|---|---|---|
| Dashboard | - | `VER` | Admin, Super Admin |
| Calendario | - | `VER` | Encargado, Supervisor, Admin, Super Admin |
| Mapa | - | `VER`, `RESERVAR` | Contribuyente, Representante, Encargado, Supervisor, Admin, Super Admin |
| Contribuyentes | - | `VER`, `CREAR`, `ACTUALIZAR`, `BLOQUEAR`, `EXPORTAR` | Encargado, Supervisor, Admin, Super Admin |
| Organizaciones | - | `VER`, `CREAR`, `ACTUALIZAR`, `ELIMINAR` | Supervisor, Admin, Super Admin |
| Reservas | Reservas Puntuales | `VER`, `CREAR`, `ACTUALIZAR`, `ANULAR`, `VALIDAR`, `GENERAR TICKET`, `CAMBIAR-HORARIO` | Contribuyente, Representante, Encargado, Supervisor, Admin, Super Admin |
| Reservas | Reservas Recurrentes | `VER`, `CREAR`, `ACTUALIZAR`, `ANULAR`, `VALIDAR`, `GENERAR TICKET` | Contribuyente, Representante, Encargado, Supervisor, Admin, Super Admin |
| Reservas | Escuelas Municipales | `VER`, `CREAR`, `ACTUALIZAR`, `ANULAR` | Encargado, Supervisor, Admin, Super Admin |
| Reportes | Reporte de Pagos | `GENERAR`, `VER` | Supervisor, Admin, Super Admin |
| Reportes | Reporte de Reservas Puntuales | `GENERAR`, `VER` | Supervisor, Admin, Super Admin |
| Reportes | Reporte de Reservas Recurrentes | `GENERAR`, `VER` | Supervisor, Admin, Super Admin |
| Reportes | Reporte de Mensualidades | `GENERAR`, `VER` | Supervisor, Admin, Super Admin |
| Configuraciones | Campos Deportivos | `VER`, `CREAR`, `ACTUALIZAR`, `ELIMINAR` | Admin, Super Admin |
| Administracion | Complejos Deportivos | `VER`, `CREAR`, `ACTUALIZAR`, `ELIMINAR` | Admin, Super Admin |
| Administracion | Encargados | `VER`, `CREAR`, `ACTUALIZAR`, `ELIMINAR` | Admin, Super Admin |
| Administracion | Superficies | `VER`, `CREAR`, `ACTUALIZAR`, `ELIMINAR` | Admin, Super Admin |
| Administracion | Categorias | `VER`, `CREAR`, `ACTUALIZAR`, `ELIMINAR` | Admin, Super Admin |
| Administracion | Clasificadores RUAT | `VER`, `CREAR`, `ACTUALIZAR`, `ELIMINAR` | Super Admin |
| Administracion | Configuraciones de Sistema | `VER`, `CREAR`, `ACTUALIZAR`, `ELIMINAR` | Super Admin |

Las acciones se interpretan de la siguiente manera:

| Accion | Descripcion |
|---|---|
| `VER` | Consultar listas, detalles, dashboards o reportes |
| `CREAR` | Registrar nuevos datos o reservas |
| `ACTUALIZAR` | Modificar informacion existente |
| `ELIMINAR` | Dar de baja registros permitidos |
| `ANULAR` | Anular reservas o registros operativos |
| `VALIDAR` | Aprobar o rechazar solicitudes |
| `GENERAR TICKET` | Ver o imprimir comprobantes |
| `CAMBIAR-HORARIO` | Modificar horario de reserva cuando este habilitado |
| `EXPORTAR` | Exportar datos a archivo |
| `BLOQUEAR` | Bloquear o sancionar usuarios |
| `RESERVAR` | Iniciar reserva desde mapa o flujo publico |

### 3.2 Proceso de Solicitud de Acceso

El proceso de solicitud de acceso para usuarios internos se realiza antes de iniciar operaciones en DEPORTESAPP.

#### Paso 1: Preparar informacion requerida

Antes de realizar la solicitud, reuna la informacion necesaria:

- Documento de identidad vigente.
- Nombres y apellidos completos.
- Correo electronico institucional.
- Numero de telefono de contacto.
- Justificacion del acceso requerido.
- Rol solicitado: Super Admin, Administrador, Supervisor, Encargado u otro rol autorizado.
- Complejo deportivo asignado, obligatorio para encargados.
- Modulos y acciones requeridas, si el acceso debe ser personalizado.

#### Paso 2: Contactar al administrador de GAMQSIS

Una vez preparada la informacion:

1. Contactar al administrador de sistemas del GAMQ.
2. Solicitar acceso al modulo `DEPORTESAPP` con codigo `SIS-013`.
3. Indicar claramente el rol requerido.
4. Informar el complejo o area de responsabilidad cuando corresponda.
5. Entregar la informacion recopilada en el paso anterior.

#### Paso 3: Recepcion de credenciales

Una vez aprobada la solicitud, el usuario puede recibir un acta o documento institucional de asignacion de usuario para el sistema DEPORTESAPP. Este documento puede incluir:

- Nombre completo.
- Cuenta de usuario.
- Contrasena inicial.
- URL del sistema.
- Modulo asignado.
- Permisos organizados por menus y acciones.
- Complejo asignado, si corresponde.

Recomendaciones:

- Proporcionar informacion precisa y actualizada.
- Cambiar la contrasena inicial en el primer acceso, si el sistema o la politica institucional lo solicita.
- Verificar que los complejos asignados correspondan exactamente a la funcion del usuario.
- Guardar el acta de asignacion en un lugar seguro, ya que contiene informacion sensible.

### 3.3 Soporte Tecnico de Acceso

En caso de inconvenientes durante la solicitud de acceso, recuperacion de cuenta, asignacion de permisos o cualquier gestion relacionada con usuarios, se debe contactar al equipo de soporte tecnico designado por el GAMQ.

Datos de referencia:

- Correo electronico: `gamqtdi@gmail.com`
- Telefono institucional: `(+591) 72248669`

Toda solicitud de soporte debe incluir:

- Nombre completo del usuario.
- Numero de CI.
- Correo institucional o usuario.
- Rol o modulo solicitado.
- Descripcion breve del problema.
- Captura de pantalla o mensaje de error, si existe.

## 4. Acceso y Gestion de Cuenta

Solo el personal autorizado por el GAMQ o un contribuyente registrado podra acceder al sistema. Cada usuario opera con credenciales previamente asignadas o registradas.

### 4.1 Ingreso al Sistema

Para ingresar al sistema:

1. Acceder al sitio oficial del GAMQ o a la URL institucional proporcionada para DEPORTESAPP.
2. Si se ingresa desde Gobierno Electronico, ubicar la seccion de sistemas y seleccionar DEPORTES.
3. Esperar la redireccion a la pantalla de inicio de sesion.
4. Ingresar usuario y contrasena.
5. Presionar **Ingresar**.
6. Si las credenciales son correctas y existen permisos, el sistema redirige al panel correspondiente.

URL publica de referencia del portal GAMQ:

- `http://www.quillacollo.gob.bo/e-gamq.html`

Redireccion esperada:

| Tipo de usuario | Vista inicial |
|---|---|
| Administrador o Super Admin | Dashboard administrativo |
| Encargado | Calendario de reservas |
| Contribuyente o Representante | Mapa de complejos deportivos |

### 4.2 Navegacion Principal

Al ingresar, el usuario encontrara:

1. **Menu lateral izquierdo:** acceso a modulos segun permisos.
2. **Barra superior:** informacion de usuario, notificaciones y acceso rapido a perfil.
3. **Panel central:** area principal donde se muestran dashboards, listas, formularios, calendarios o mapas.
4. **Tablas de gestion:** busqueda, filtros, columnas visibles, etiquetas de estado y acciones.
5. **Modales:** ventanas para crear, editar, validar, anular o ver detalle.

Las rutas principales del sistema son:

| Modulo | Ruta |
|---|---|
| Dashboard administrativo | `/inicio` |
| Calendario | `/inicio/employee` |
| Mapa | `/inicio/taxpayer` |
| Perfil | `/profile/profile` |
| Configuracion de perfil | `/profile/profile-setting` |
| Complejos deportivos | `/admin/facilities` |
| Encargados | `/admin/employees` |
| Superficies | `/admin/area` |
| Categorias | `/admin/categories` |
| Clasificadores RUAT | `/admin/classifiers` |
| Configuraciones de sistema | `/admin/config` |
| Campos deportivos | `/settings/fields` |
| Nueva reserva | `/reservations/details` |
| Reservas puntuales | `/reservations/one-time` |
| Reservas recurrentes | `/reservations/recurrent` |
| Escuelas municipales | `/reservations/schools` |
| Ticket o comprobante | `/reservations/ticket` |
| Contribuyentes | `/taxpayers` |
| Organizaciones | `/organizations` |
| Reporte de pagos | `/reports/payments` |
| Reportes por tipo | `/reports/list/:tipoReporte` |

### 4.3 Gestion del Perfil de Usuario

El usuario puede acceder a su perfil desde el menu desplegable ubicado en la parte superior derecha de la cabecera.

Desde el perfil se puede consultar informacion personal y acceder a opciones de configuracion disponibles segun el tipo de cuenta.

### 4.4 Edicion de Datos de Usuario

Para ingresar a configuraciones de usuario existen dos opciones:

1. Abrir el menu desplegable de usuario en la parte superior derecha y seleccionar **Configuraciones**.
2. Ingresar al **Perfil** y luego seleccionar **Configuraciones**.

En esta vista el usuario puede modificar datos personales basicos e informacion de contacto permitida por el sistema.

### 4.5 Cambio de Contrasena de Usuario

Para cambiar contrasena:

1. Ingresar a **Perfil** o **Configuraciones**.
2. Seleccionar **Cambio de Contrasena**.
3. Completar el formulario:
   - Contrasena actual.
   - Nueva contrasena.
   - Confirmacion de nueva contrasena.
4. Presionar **Guardar**.

Recomendaciones de seguridad:

- Usar contrasenas de al menos 8 caracteres.
- Combinar letras, numeros y simbolos.
- No compartir credenciales.
- Cambiar la contrasena inicial cuando sea entregada por soporte o GAMQSIS.

### 4.6 Cierre de Sesion

Para salir del sistema de manera segura:

1. Hacer clic en el nombre o avatar de usuario en la parte superior derecha.
2. Seleccionar **Salir** o **Cerrar sesion**.
3. Confirmar la salida si el sistema lo solicita.
4. Verificar que se redirija a la pantalla de inicio de sesion.

Siempre cierre sesion al terminar su turno, especialmente en computadoras compartidas.

### 4.7 Problemas de Inicio por Conexion o Servicios

Para que el sistema opere correctamente, dos elementos criticos deben cargarse al iniciar sesion:

- Configuraciones del sistema.
- Conexion o autenticacion RUAT, cuando corresponde.

Si alguno falla, el sistema puede mostrar un mensaje de error o limitar operaciones. Estos problemas requieren revision tecnica y no se consideran errores del usuario.

#### 4.7.1 Error: configuraciones de sistema no disponibles

Significa que el sistema no pudo cargar parametros, permisos operativos o configuraciones necesarias para aplicar reglas de negocio. Esto puede afectar:

- Tiempos de anticipacion.
- Duracion minima o maxima.
- Funcionalidades habilitadas.
- Reglas de pago.
- Permisos visibles.
- Integracion RUAT.

Accion sugerida:

- No continuar con operaciones criticas.
- Cerrar sesion e intentar nuevamente si soporte lo recomienda.
- Reportar el mensaje exacto al administrador del sistema.

#### 4.7.2 Error: conexion con RUAT no disponible

Significa que el sistema no pudo establecer o renovar la sesion con RUAT. Esta conexion es necesaria para:

- Generar tasas.
- Consultar pagos.
- Anular tasas.
- Validar operaciones tributarias.

Causas posibles:

- Servicio RUAT en mantenimiento.
- Token RUAT expirado.
- Credenciales RUAT mal configuradas.
- Problemas de red.
- Timeout del servicio externo.

Accion sugerida:

- No confirmar reservas con costo si RUAT no esta disponible.
- Reintentar despues de unos minutos si la operacion lo permite.
- Contactar soporte tecnico con el mensaje exacto.

#### 4.7.3 Errores frecuentes de acceso

| Mensaje o situacion | Causa probable | Accion sugerida |
|---|---|---|
| Usuario o contrasena incorrectos | Credenciales invalidas | Verificar datos o solicitar soporte |
| No tiene acceso a este modulo | Usuario sin modulo `DEPORTESAPP` | Solicitar asignacion en GAMQSIS |
| No tiene permisos | Usuario sin acciones asignadas | Solicitar revision de permisos |
| No tiene asignacion | Usuario interno sin complejo asignado | Registrar asignacion como encargado |
| Error de configuracion | No cargan parametros del sistema | Contactar soporte tecnico |
| RUAT no disponible | Token RUAT no generado o servicio no responde | Reintentar o comunicar a soporte |

## 5. Estados del Sistema

Los estados del sistema permiten identificar rapidamente en que etapa se encuentra una reserva, una validacion, un pago o un espacio deportivo. Esta informacion es necesaria porque muchas acciones del sistema dependen del estado actual: aprobar, rechazar, consultar pago, anular, generar ticket, liberar horarios, bloquear nuevas reservas o mostrar alertas al usuario.

Estos estados se muestran principalmente en listas, calendario, detalle de reserva, reportes, tickets y paneles administrativos. El usuario debe revisarlos antes de realizar cualquier accion, ya que un cambio incorrecto puede afectar pagos RUAT, disponibilidad de campos o trazabilidad administrativa.

### 5.1 Estados de reserva

El estado de reserva indica la situacion operativa principal de una reserva. Sirve para saber si la reserva todavia espera aprobacion, si debe pagarse, si ya esta confirmada, si esta en uso o si ya no tiene efecto.

| Estado | Significado | Uso operativo |
|---|---|---|
| `SOLICITADA` | La reserva requiere revision administrativa | Un encargado o administrador debe aprobarla o rechazarla antes de continuar |
| `PENDIENTE` | Reserva aprobada o creada, pendiente de pago | Se debe esperar pago o consultar RUAT antes de considerarla confirmada |
| `PAGADA` | Pago verificado en RUAT | La reserva esta confirmada economicamente y puede usarse en el horario definido |
| `EN_CURSO` | Reserva dentro de su horario de uso | El campo esta ocupado por la actividad programada |
| `COMPLETADA` | Reserva finalizada correctamente | Sirve para historial, reportes y trazabilidad |
| `CANCELADA` | Reserva anulada por usuario, encargado, administrador o sistema | La reserva ya no debe ejecutarse; si tuvo tasa, debe revisarse anulacion RUAT |
| `EXPIRADA` | Vencio el plazo de pago | El sistema puede liberar el horario y cancelar la reserva por falta de pago |
| `NO_SHOW` | Usuario no se presento | Puede alimentar reglas de sancion o restricciones futuras |

### 5.2 Estados de validacion

El estado de validacion se usa cuando una reserva necesita aprobacion administrativa. No reemplaza al estado de reserva; lo complementa. Por ejemplo, una reserva puede estar `SOLICITADA` y tener validacion `PENDIENTE` hasta que un usuario autorizado la revise.

| Estado | Significado | Uso operativo |
|---|---|---|
| `PENDIENTE` | Falta aprobar o rechazar | Debe ser revisada por un usuario con permiso `VALIDAR` |
| `APROBADA` | Solicitud aceptada | La reserva puede pasar a pendiente de pago o confirmarse si es gratuita |
| `RECHAZADA` | Solicitud rechazada | La reserva no continua y debe quedar cancelada |
| `VENCIDA` | No fue atendida antes de la fecha de uso | Indica incumplimiento del plazo de revision; debe revisarse en reportes o seguimiento |

### 5.3 Estados de pago

El estado de pago permite controlar si una tasa generada en RUAT ya fue pagada y si la reserva puede considerarse confirmada. Este estado es clave para evitar que se use un campo sin pago cuando la reserva tiene costo.

| Estado | Significado | Uso operativo |
|---|---|---|
| `PENDIENTE` | Tasa generada, sin pago verificado | Se debe esperar o consultar pago en RUAT |
| `PAGADO` | Pago confirmado | La reserva puede avanzar a estado pagado y ser usada |
| `PARCIAL` | Pago parcial registrado | Requiere revision administrativa antes de confirmar |
| `REEMBOLSADO` | Pago devuelto | Debe quedar registrado para trazabilidad financiera |
| `FALLIDO` | Intento de pago fallido | No debe confirmarse la reserva; se debe informar o reintentar segun el caso |

### 5.4 Estados de complejo o campo

El estado de complejo o campo define si un espacio puede mostrarse como disponible para reservas. Antes de registrar una reserva, el sistema y el usuario deben confirmar que el complejo y el campo esten activos y que no exista bloqueo por mantenimiento, cierre o evento institucional.

| Estado | Significado | Uso operativo |
|---|---|---|
| `ACTIVO` | Disponible para operaciones y reservas | Puede mostrarse en mapa, calendario y flujos de reserva |
| `MANTENIMIENTO` | No disponible por mantenimiento | Debe bloquear nuevas reservas mientras dure el mantenimiento |
| `CERRADO` | Cerrado temporalmente | No debe permitir reservas durante el cierre |
| `EVENTO_MUNICIPAL` | Reservado para actividad municipal | La disponibilidad queda restringida por prioridad institucional |

En caso de duda, el encargado debe revisar el calendario, las excepciones del campo y el detalle de reservas antes de confirmar disponibilidad.

## 6. Paneles de Inicio

Los paneles de inicio resumen la operacion diaria del sistema. La vista inicial depende del tipo de usuario y de los permisos cargados al iniciar sesion.

### 6.1 Dashboard Administrativo

El dashboard administrativo esta orientado a administradores y super administradores. Muestra indicadores generales para supervision institucional:

- Total de reservas.
- Reservas exitosas.
- Reservas pendientes.
- Reservas canceladas o expiradas.
- Reservas con `NO_SHOW`.
- Ingresos en bolivianos.
- Estado de conexion RUAT.
- Graficos de reservas e ingresos.

Funcionalidades principales:

- Consultar resumen de actividad del sistema.
- Comparar reservas exitosas, pendientes y canceladas.
- Revisar ingresos generados.
- Identificar reservas con problemas de pago, expiracion o no presentacion.
- Confirmar visualmente si RUAT esta disponible.

Validaciones y restricciones:

- Solo se muestran datos permitidos por el rol.
- Si las configuraciones o RUAT no cargan correctamente, los indicadores financieros pueden no actualizarse.
- Los datos del dashboard son de apoyo a la gestion; para acciones administrativas se debe ingresar al modulo correspondiente.

### 6.2 Calendario de Encargado

El calendario es la vista principal para encargados y usuarios operativos. Permite visualizar la ocupacion de campos y controlar actividades por fecha.

- Reservas puntuales.
- Reservas recurrentes.
- Excepciones por cierre, mantenimiento, evento municipal u horario especial.
- Filtros por tipo de evento.
- Detalle de reservas segun permisos.

Desde el calendario se pueden abrir modales de detalle, validar solicitudes, anular reservas o generar comprobantes si el usuario tiene permisos.

Filtros y navegacion:

- Filtrar por reservas puntuales.
- Filtrar por reservas recurrentes.
- Filtrar por excepciones.
- Cambiar fechas del calendario.
- Revisar horarios ocupados y disponibles.

Validaciones y restricciones:

- El encargado debe tener asignacion activa a un complejo cuando su rol lo requiera.
- Las acciones disponibles dependen de permisos como `VALIDAR`, `ANULAR`, `ACTUALIZAR` o `GENERAR TICKET`.
- Las reservas en estados terminales no deben tratarse como horarios disponibles sin revisar su estado real.

### 6.3 Mapa de Contribuyente

El mapa muestra complejos deportivos disponibles y permite iniciar reservas desde la ubicacion del complejo. Es la vista principal para contribuyentes y representantes.

- Buscar complejos.
- Ver informacion basica.
- Revisar campos disponibles.
- Iniciar una reserva puntual o recurrente si la configuracion lo permite.

Filtros y navegacion:

- Buscar complejos por nombre o ubicacion disponible.
- Revisar marcadores de complejos en el mapa.
- Abrir informacion del complejo.
- Iniciar flujo de reserva desde el complejo seleccionado.

Validaciones y restricciones:

- Solo se muestran complejos y campos activos.
- Las reservas recurrentes, eventos u organizaciones dependen de configuraciones activas.
- Si el contribuyente esta sancionado o bloqueado, el sistema puede impedir nuevas reservas.

## 7. Configuracion Inicial y Reglas del Sistema

La configuracion inicial define el comportamiento global del sistema. Este modulo debe ser operado solo por usuarios autorizados, especialmente Super Admin, porque sus cambios afectan reservas, pagos, RUAT, sanciones, reportes y disponibilidad.

### 7.1 Configuraciones globales

El modulo **Configuraciones de Sistema** permite controlar parametros operativos. Sus caracteristicas principales son:

- Acceso restringido a usuarios con permisos administrativos.
- Configuracion centralizada de reglas de negocio.
- Parametros por categoria, ambito y tipo de valor.
- Valores numericos, booleanos, de texto o JSON.
- Registro de fecha de creacion y estado activo.

Categorias disponibles:

| Categoria | Uso |
|---|---|
| `RUAT` | Credenciales, codigo de alcaldia, servicio municipal y usuario operador |
| `FUNCIONALIDADES` | Activacion de reservas por evento, recurrentes y organizaciones |
| `ANTICIPACION` | Plazos minimos para crear reservas |
| `DURACION` | Duracion minima de reservas y maxima de eventos/recurrentes |
| `LIMITES` | Maximo de reservas activas, diarias o reintentos |
| `PAGOS` | Plazos de validacion de pago |
| `RECURRENTES` | Reglas de pagos y recordatorios recurrentes |
| `SANCIONES` | Reglas de no show y suspension |
| `NOTIFICACIONES` | Parametros de recordatorio o alerta |

### 7.2 Configuraciones clave por categoria

| Categoria | Configuracion | Efecto en el sistema |
|---|---|---|
| RUAT | `CODIGO_ALCALDIA_RUAT` | Identifica la alcaldia al registrar, consultar o anular tasas |
| RUAT | `SERVICIO_MUNICIPAL_RUAT` | Servicio municipal usado para tasas deportivas |
| RUAT | `USUARIO_RUAT`, `CLAVE_RUAT` | Credenciales de autenticacion RUAT |
| RUAT | `CODIGO_USUARIO_RUAT` | Usuario operador usado en registro/anulacion |
| Funcionalidades | `HABILITAR_RESERVAS_EVENTOS` | Permite reservas directas de eventos |
| Funcionalidades | `HABILITAR_SOLICITUD_RESERVAS_EVENTOS` | Permite solicitudes de eventos cuando no hay reserva directa |
| Funcionalidades | `HABILITAR_RESERVAS_RECURRENTES` | Permite reservas recurrentes directas |
| Funcionalidades | `HABILITAR_SOLICITUD_RESERVAS_RECURRENTES` | Permite solicitudes recurrentes |
| Funcionalidades | `HABILITAR_RESERVAS_ORGANIZACIONES` | Permite reservas para organizaciones |
| Funcionalidades | `HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES` | Permite solicitudes para organizaciones |
| Anticipacion | `HORAS_ANTICIPACION_RESERVAS_PUNTUALES` | Define anticipacion minima para reservas puntuales |
| Anticipacion | `DIAS_ANTICIPACION_EVENTOS` | Define anticipacion minima para eventos |
| Anticipacion | `HORAS_ANTICIPACION_RECURRENTES` | Define anticipacion minima para recurrentes |
| Duracion | `DURACION_MINIMA_RESERVA` | Evita reservas demasiado cortas |
| Duracion | `DURACION_MAXIMA_EVENTOS` | Limita la duracion de eventos |
| Pagos | `HORAS_VALIDACION_PAGO` | Define el plazo para pagar antes de expirar |
| Limites | `MAXIMO_RESERVAS_ACTIVAS_POR_USUARIO` | Controla acumulacion de reservas activas |
| Sanciones | `MINUTOS_GRACIA_NO_SHOW` | Define tolerancia antes de marcar no show |

### 7.3 Recomendaciones de administracion

- Revisar cuidadosamente los valores antes de guardar.
- No modificar credenciales RUAT sin coordinacion tecnica.
- Probar cambios de reglas en un ambiente controlado cuando sea posible.
- Registrar el motivo de cambios importantes.
- Comunicar cambios operativos a encargados cuando afecten reservas, pagos o sanciones.

## 8. Gestion de Reservas

El modulo de reservas permite registrar, revisar, validar, cobrar, anular y dar seguimiento al uso de los campos deportivos municipales. Esta seccion explica primero los tipos de reserva y sus reglas de calculo, y luego describe las acciones que el usuario puede realizar desde las listas.

El flujo actualizado de estados se encuentra tambien documentado en [`booking-flow.md`](./booking-flow.md).

### 8.1 Como se ordena esta seccion

Para facilitar la lectura del manual, la gestion de reservas se organiza asi:

1. **Conceptos y tipos de reserva:** explica que diferencia una reserva puntual, recurrente y de periodo o mensualidad.
2. **Proceso de creacion:** explica como se inicia una reserva desde mapa, dashboard o lista.
3. **Listas de reservas:** explica como consultar, filtrar y operar reservas ya creadas.
4. **Acciones por permiso:** explica validar, consultar RUAT, cambiar horario, anular, registrar No Show y generar ticket.
5. **Reglas y validaciones:** resume restricciones de disponibilidad, pago, estados y calculo.

Esta organizacion evita repetir pasos en cada modulo y permite que el usuario entienda primero la logica general antes de ejecutar acciones concretas.

### 8.2 Tipos de reserva y relacion con tarifas

El tipo de reserva depende principalmente del **tipo de cobro** configurado en la tarifa del campo deportivo.

| Tipo de reserva | Tipos de cobro asociados | Uso principal |
|---|---|---|
| Reserva puntual | `por_hora`, `por_persona`, `por_evento` | Uso unico de un campo en una fecha determinada |
| Reserva recurrente | `por_sesion`, `mensualidad` | Uso repetido dentro de un periodo, con varios horarios o sesiones |
| Reserva periodo o mensualidad escolar | Mensualidad vinculada a escuela municipal | Pago de mensualidad de estudiante o escuela municipal |

Una reserva puede ademas estar vinculada a un contribuyente, organizacion, representante, estudiante o escuela municipal segun el caso.

### 8.3 Reservas puntuales

Las **reservas puntuales** corresponden a reservas de uso unico. Se usan cuando el campo deportivo tiene una tarifa de tipo `por_hora`, `por_persona` o `por_evento`.

Una reserva puntual contiene, como minimo:

- Fecha de uso o fecha de reserva.
- Hora de inicio.
- Hora de fin.
- Campo deportivo.
- Tarifa aplicada.
- Contribuyente solicitante.
- Monto total calculado.
- Estado de reserva, validacion y pago.

Reglas de calculo:

| Tipo de cobro | Como se calcula el total |
|---|---|
| `por_hora` | Se calcula segun la duracion de la reserva, la tarifa base y los conceptos adicionales aplicables al campo deportivo |
| `por_persona` | Se calcula segun la cantidad de personas ingresada y la tarifa configurada |
| `por_evento` | Se calcula con el monto fijo definido para el evento, sin depender de horas ni cantidad de personas salvo configuracion especial |

En tarifas `por_hora`, el sistema toma en cuenta la duracion seleccionada. Si la tarifa tiene conceptos adicionales, estos se suman o calculan segun su tipo: fijo, porcentaje o por hora.

En tarifas `por_persona`, el usuario debe indicar la cantidad de personas. El sistema valida que la cantidad no supere la capacidad permitida del campo cuando esa informacion esta configurada.

En tarifas `por_evento`, la reserva se registra como un evento de uso unico. El monto se toma de la tarifa del evento y se aplican las reglas de anticipacion y duracion maxima configuradas.

### 8.4 Reservas recurrentes

Las **reservas recurrentes** se usan cuando el campo deportivo tiene tarifas de tipo `por_sesion` o `mensualidad`. Su objetivo es reservar varias sesiones dentro de un periodo.

Una reserva recurrente contiene:

- Fecha de inicio.
- Fecha de fin.
- Periodo de vigencia.
- Dias o fechas reservadas.
- Horarios programados.
- Tablero de horarios.
- Cantidad de sesiones o meses.
- Duracion de sesion.
- Monto total calculado.

El tablero de horarios representa la programacion del periodo. Operativamente funciona como una matriz por mes, donde cada mes contiene hasta 31 dias y cada dia puede contener hasta 5 espacios o slots de horario. Cada slot representa una franja reservada dentro de ese dia.

Reglas de calculo:

| Tipo de cobro | Como se calcula el total |
|---|---|
| `por_sesion` | Se calcula por sesiones u horas facturables dentro del periodo |
| `mensualidad` | Se calcula por mes o cantidad de meses incluidos en el periodo |

En `por_sesion`, cada sesion equivale al bloque de uso definido en el horario. El costo se calcula segun la cantidad de sesiones, duracion y tarifa configurada.

En `mensualidad`, el sistema calcula el costo tomando en cuenta el periodo seleccionado y la cantidad de meses o regla mensual configurada en la tarifa.

### 8.5 Reservas periodo y mensualidades escolares

Las reservas de periodo usadas en **Escuelas Municipales** funcionan principalmente como pagos o mensualidades vinculadas a estudiantes. No deben confundirse con una reserva recurrente comun de cancha, aunque pueden compartir campos como periodo, monto, tasa y estado de pago.

Se usan para:

- Registrar mensualidades de estudiantes.
- Asociar una mensualidad a una escuela municipal.
- Generar o consultar tasa de pago.
- Controlar estado de pago y comprobante.

El modulo se documenta con mas detalle en la seccion **10. Escuelas Municipales y Mensualidades**.

### 8.6 Flujo general para crear una reserva

El proceso de creacion puede iniciar desde:

- **Mapa:** flujo recomendado para contribuyentes y representantes.
- **Dashboard o panel de control:** acceso rapido a complejos y campos disponibles.
- **Lista de reservas:** disponible para usuarios internos con permiso `CREAR`.

Flujo general:

1. Ingresar al mapa, dashboard o lista de reservas.
2. Seleccionar complejo deportivo.
3. Revisar informacion del complejo.
4. Seleccionar **Realizar Reserva**.
5. Elegir campo deportivo disponible.
6. Revisar tarifas, categorias, superficie y horarios.
7. Seleccionar tipo de reserva segun tarifa: puntual o recurrente.
8. Definir fecha, horario o periodo.
9. Revisar el monto calculado.
10. Completar datos del contribuyente, organizacion o estudiante si corresponde.
11. Agregar observaciones si corresponde.
12. Aceptar terminos y condiciones.
13. Confirmar como **Reservar**, **Generar reserva** o **Solicitar reserva**, segun permisos y reglas.
14. Ver el ticket o comprobante generado.

Cuando la reserva tiene costo, el sistema debe registrar la tasa en RUAT. Si la reserva es gratuita, no se genera tasa y el monto se mantiene en cero.

### 8.7 Reserva directa o solicitud de reserva

El boton final puede variar segun permisos, configuracion del campo y reglas del sistema.

| Condicion | Resultado |
|---|---|
| El usuario tiene permisos administrativos y el campo permite reserva directa | Se registra la reserva |
| El campo no requiere aprobacion | Se registra la reserva |
| La reserva es gratuita y cumple reglas | Se registra la reserva |
| El campo requiere aprobacion | Se registra como `SOLICITADA` y queda pendiente de validacion |
| La funcionalidad directa esta deshabilitada pero la solicitud esta habilitada | Se registra como solicitud |
| La funcionalidad no esta habilitada | El sistema no permite continuar |

### 8.8 Reservas para organizaciones y gratuidad

El sistema permite reservar para organizaciones si esta habilitada la configuracion correspondiente.

Configuraciones relacionadas:

- `HABILITAR_RESERVAS_ORGANIZACIONES`
- `HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES`

Reglas:

- Administradores y encargados pueden buscar contribuyentes y organizaciones segun permisos.
- Representantes solo operan organizaciones vinculadas.
- Una organizacion puede tener beneficio de gratuidad si esta configurada para ello.
- Escuelas municipales pueden tener reglas especiales de gratuidad o mensualidad.
- Si la reserva es gratuita, no se genera tasa RUAT.

## 9. Listas de Reservas y Acciones Operativas

Las listas de reservas son el punto principal de seguimiento operativo. Desde ellas se consultan estados, datos de pago, informacion del campo, solicitante, fechas y acciones disponibles.

La informacion visible depende de:

- Rol del usuario.
- Permisos asignados.
- Complejo asignado, si el usuario es encargado.
- Tipo de reserva.
- Estado actual de la reserva.

### 9.1 Visualizacion segun usuario

| Usuario | Alcance de visualizacion |
|---|---|
| Administrador o Super Admin | Puede ver reservas de todos los complejos |
| Encargado | Puede ver reservas del complejo asignado |
| Supervisor | Puede ver reservas segun permisos, normalmente en modo consulta |
| Contribuyente | Puede ver sus propias reservas |
| Representante | Puede ver reservas vinculadas a sus organizaciones autorizadas |

### 9.2 Lista de reservas puntuales

Ruta: **Reservas > Reservas Puntuales**.

La lista muestra reservas con tipo de cobro `por_hora`, `por_persona` y `por_evento`.

Campos visibles frecuentes:

- Contribuyente.
- Complejo.
- Campo deportivo.
- Tipo de cobro.
- Fecha de uso.
- Monto total.
- Numero de tasa.
- Indicador de gratuidad.
- Organizacion o estudiante si aplica.
- Estado de validacion.
- Estado de reserva.
- Estado de pago.
- Acciones disponibles.

Filtros comunes:

- Busqueda por texto.
- Rango de fecha de uso.
- Estado de validacion.
- Estado de reserva.
- Categoria.
- Columnas visibles.

### 9.3 Lista de reservas recurrentes

Ruta: **Reservas > Reservas Recurrentes**.

La lista muestra reservas con tipo de cobro `por_sesion` y `mensualidad`.

Campos visibles frecuentes:

- Contribuyente.
- Complejo.
- Campo deportivo.
- Tipo de cobro.
- Fecha de inicio.
- Fecha de fin.
- Dias de semana o calendario programado.
- Cantidad de sesiones.
- Duracion de sesion.
- Monto total.
- Numero de tasa.
- Organizacion o estudiante.
- Estado de validacion.
- Estado de reserva.
- Estado de pago.
- Estado activo.

Filtros comunes:

- Busqueda por texto.
- Rango de fecha de inicio y fin.
- Estado de validacion.
- Estado de reserva.
- Categoria.
- Estado activo.
- Columnas visibles.

### 9.4 Pagos de Mensualidades de Escuelas Municipales

Una mensualidad escolar es un pago de período mensual para un estudiante de una escuela municipal. En este módulo el usuario puede registrar una única mensualidad por estudiante, escuela y mes, y consultar el estado de pago o el comprobante de la tasa.

¿Cómo funciona?

- El usuario selecciona primero el estudiante.
- Luego selecciona una escuela municipal activa.
- A continuación elige una reserva recurrente base de esa escuela.
- El sistema ofrece los meses disponibles según el rango de la reserva recurrente seleccionada.
- Se elige un mes y año específicos.
- Si ya existe una mensualidad en ese periodo para el mismo estudiante y escuela, el sistema lo notifica.
- Finalmente se registra la mensualidad y se genera el comprobante.

Cálculo de la mensualidad:

| Concepto | Cómo se calcula |
|---|---|
| Tarifa mensual | Se calcula en función de la tarifa mensual asociada a la escuela y a la reserva recurrente base |
| Periodo | El valor corresponde al mes/año seleccionado |
| Monto total | Se toma como monto fijo mensual, sin multiplicar sesiones adicionales |

Estructura de la mensualidad:

- Estudiante
- Escuela Municipal
- Reserva recurrente base
- Mes
- Año
- Observaciones
- Monto total calculado
- Número de reserva
- Número de tasa (RUAT)
- Estado de reserva
- Estado de validación
- Estado de pago
- Pagos registrados
- Ticket/comprobante
- Fecha de creación

Vista principal y filtros:

La vista de `Reservas > Escuelas Municipales` muestra la lista de mensualidades escolares con las siguientes columnas principales:

- Estudiante
- Matrícula
- Escuela
- Mes
- Año
- Monto
- Número de reserva
- Número de tasa
- Estado de reserva
- Estado de pago
- Disciplina
- Entrenador
- Fecha de pago

Filtros disponibles:

1. Búsqueda por texto.
2. Filtro por estado de reserva.
3. Filtro por estado de pago.
4. Filtro por categoría.
5. Filtro por escuela.
6. Filtro por período (mes/año).

El módulo también ofrece pestañas o filtros rápidos según estado y tipo de mensualidad.

Registro de una nueva mensualidad:

1. Presionar el botón **AGREGAR** en la vista de `Escuelas Municipales`.
2. Seleccionar el estudiante.
3. Seleccionar la escuela municipal.
4. Elegir la reserva recurrente base de la escuela.
   - Solo se listan reservas recurrentes aprobadas, activas y con periodo disponible.
5. Seleccionar el mes y año deseados.
   - El rango de meses disponibles está limitado por la reserva recurrente base.
6. Revisar si ya existe una mensualidad para ese estudiante, escuela y periodo.
   - Si existe, el sistema muestra alerta y opción para ver la mensualidad existente.
7. Completar observaciones si corresponde.
8. Presionar **Registrar Mensualidad**.

Validaciones y reglas aplicadas:

- Todos los campos obligatorios deben completarse.
- El estudiante y la escuela se eligen de forma independiente.
- El periodo debe estar dentro del rango de la reserva recurrente base.
- Solo se puede registrar una mensualidad por estudiante, escuela y mes.
- Si la mensualidad ya existe, no se permite crear un duplicado.
- El monto se calcula con la tarifa asociada y, si corresponde, se registra la tasa en RUAT.
- La mensualidad puede guardarse sin tasa si es gratuita o si no requiere pago.

Pago y comprobantes:

- La mensualidad puede consultarse en detalle en un modal.
- La pestaña **Pago y Observaciones** muestra los pagos registrados y sus datos.
- Si no hay pagos, se muestra un mensaje informativo.
- El ticket se puede abrir desde el detalle para ver o imprimir el comprobante.
- El estado de pago se actualiza cuando la consulta RUAT confirma el pago.

Historial del estudiante:

- El formulario incluye una pestaña de historial del estudiante.
- El historial permite filtrar mensualidades por todas, pagadas o pendientes.
- Permite revisar periodos anteriores antes de registrar una nueva mensualidad.

Acciones disponibles en el módulo:

- Registrar una nueva mensualidad para un estudiante y un mes.
- Ver la mensualidad existente.
- Consultar el pago en RUAT.
- Abrir el ticket/comprobante.
- Anular mensualidades según estado y permisos.

### 9.5 Acciones disponibles en las listas

Permite revisar toda la informacion de la reserva, incluyendo:

- Datos generales.
- Campo deportivo y complejo.
- Contribuyente.
- Organizacion o estudiante.
- Fechas y horarios.
- Monto total.
- Tasa RUAT.
- Pagos registrados.
- Estado de reserva y validacion.
- Observaciones.

Proceso:

1. Ingresar a la lista correspondiente.
2. Ubicar la reserva.
3. Presionar la accion **Ver**.
4. Revisar la informacion en el modal de detalle.
5. Usar acciones internas del modal si estan habilitadas.

### 9.6 Validacion administrativa

Cuando una reserva esta `SOLICITADA` y su `estadoValidacion` es `PENDIENTE`, un usuario con permiso `VALIDAR` puede aprobarla o rechazarla.

Proceso:

1. Ingresar a la lista de reservas.
2. Ubicar la reserva solicitada.
3. Presionar **Validar**.
4. Revisar datos de contribuyente, campo, horario, costo y organizacion si aplica.
5. Seleccionar **Aprobar** o **Rechazar**.
6. Ingresar observacion o motivo cuando corresponda.
7. Confirmar la decision.

Al aprobar:

- La validacion pasa a `APROBADA`.
- La reserva pasa a `PENDIENTE`.
- Si tiene costo, se registra la tasa en RUAT.
- El contribuyente debe pagar dentro del plazo configurado.

Al rechazar:

- La validacion pasa a `RECHAZADA`.
- La reserva pasa a `CANCELADA`.
- Se registra el motivo de rechazo.

### 9.7 Consulta de pago RUAT

La consulta RUAT verifica si la tasa asociada a una reserva fue pagada.

Consulta individual:

1. Ingresar a la lista.
2. Ubicar la reserva.
3. Presionar la accion **Consultar**.
4. Revisar el resultado devuelto por RUAT.

Consulta multiple:

1. Seleccionar varias reservas con el checkbox de la tabla.
2. Presionar **Consultar** en la cabecera.
3. Revisar los resultados de cada reserva.

Si RUAT devuelve pago valido:

- El sistema registra el pago localmente.
- La reserva pasa a `PAGADA`.
- Se actualiza la informacion de pago y comprobante.

Si RUAT no devuelve pago:

- La reserva conserva su estado.
- El sistema informa que no se encontro pago.

### 9.8 Cambio de horario

El cambio de horario aplica principalmente a reservas puntuales con permiso `CAMBIAR-HORARIO`.

Reglas:

- Normalmente solo se permite cuando la reserva esta `PENDIENTE`.
- La nueva fecha y hora deben ser futuras.
- Debe mantenerse la misma duracion de la reserva original.
- El nuevo horario debe estar disponible.
- No debe existir conflicto con otra reserva del mismo campo.

Proceso:

1. Ingresar a **Reservas > Reservas Puntuales**.
2. Ubicar la reserva.
3. Presionar la accion de cambio de horario o edicion.
4. Seleccionar nueva fecha y hora de inicio.
5. Verificar que la hora de fin se calcule manteniendo la duracion.
6. Guardar cambios.
7. Confirmar que la lista refleje el nuevo horario.

### 9.9 Anulacion

La anulacion cancela una reserva antes de que sea pagada, cuando el estado y los permisos lo permiten.

Reglas:

- Se permite en reservas `PENDIENTE`.
- Si la reserva tiene tasa, se solicita anulacion en RUAT.
- Si RUAT confirma, la reserva pasa a `CANCELADA`.
- Si la reserva es gratuita o no tiene tasa, se anula localmente.
- La anulacion requiere motivo y observacion.

Proceso:

1. Ubicar la reserva en la lista.
2. Presionar **Anular**.
3. Seleccionar motivo autorizado.
4. Ingresar observacion de al menos 10 caracteres.
5. Confirmar la anulacion.
6. Verificar que el estado cambie a `CANCELADA`.

Importante: una reserva pagada no debe anularse como si fuera pendiente. Si el usuario no asistio, corresponde registrar `NO_SHOW`; si se requiere devolucion o sancion economica, debe seguir el procedimiento administrativo externo.

### 9.10 Registro de No Show

El estado `NO_SHOW` se usa cuando el usuario no se presenta a una reserva ya pagada o en curso.

Reglas:

- Solo se puede registrar cuando la reserva esta `PAGADA` o `EN_CURSO`.
- Debe realizarlo un usuario autorizado con permiso `ACTUALIZAR`.
- No cancela la reserva.
- No anula la tasa en RUAT.
- No genera reembolso.
- Mantiene la trazabilidad para reportes y posibles sanciones administrativas.
- En dashboard, puede contar como ingreso si la reserva ya estaba pagada, pero no como reserva usada exitosamente.

Proceso:

1. Ingresar a la lista de reservas puntuales o recurrentes.
2. Ubicar una reserva en estado `PAGADA` o `EN_CURSO`.
3. Presionar la accion **No Show**.
4. Revisar los datos de la reserva.
5. Ingresar observacion obligatoria.
6. Confirmar el registro.
7. Verificar que el estado cambie a `NO_SHOW`.

### 9.11 Generacion de ticket

El ticket o comprobante puede consultarse desde:

- Finalizacion de una nueva reserva.
- Lista de reservas puntuales.
- Lista de reservas recurrentes.
- Detalle de reserva.
- Mensualidades escolares.

Puede incluir:

- Numero de reserva.
- Numero de tasa.
- Datos del contribuyente.
- Organizacion o estudiante.
- Complejo y campo.
- Fecha, periodo u horario.
- Tipo de cobro.
- Monto total.
- Estado de reserva.
- Datos de pago si existen.

### 9.12 Exportacion de datos

Proceso general:

1. Ingresar a la lista correspondiente.
2. Aplicar filtros si se desea exportar solo un subconjunto.
3. Seleccionar filas o usar la opcion de exportacion disponible.
4. Presionar **Exportar**.
5. Guardar el archivo generado.

La informacion exportada debe respetar los filtros, permisos y alcance del usuario.

### 9.13 Validaciones generales de reservas

El sistema aplica validaciones para proteger la disponibilidad, el calculo y el cumplimiento operativo.

Validaciones generales:

- Campos obligatorios completos.
- Fecha valida.
- Hora de inicio menor que hora de fin.
- Duracion dentro de limites configurados.
- Anticipacion minima cumplida.
- Campo deportivo activo y disponible.
- Tarifa vigente y compatible con el tipo de reserva.
- Clasificador RUAT valido cuando la reserva tiene costo.
- Contribuyente valido y no bloqueado para nuevas reservas.

Validaciones de disponibilidad:

- El horario debe estar dentro del horario configurado del campo.
- No debe existir solapamiento con otra reserva activa.
- Deben respetarse excepciones: mantenimiento, cerrado, evento municipal u horario especial.
- En recurrentes, cada slot del tablero debe ser validado.

Validaciones de pago:

- Una reserva con costo debe generar tasa RUAT.
- Una reserva `PENDIENTE` debe pagarse dentro del plazo configurado.
- Una reserva pagada pasa a `PAGADA` cuando RUAT confirma el pago.
- Una reserva sin pago puede pasar a `EXPIRADA`.

## 10. Escuelas Municipales y Mensualidades

El modulo **Escuelas Municipales** permite gestionar mensualidades vinculadas a estudiantes y organizaciones de tipo escuela. En este contexto, las reservas de periodo representan principalmente pagos de mensualidad o periodos de cobro asociados a estudiantes.

La lista puede mostrar:

- Complejo.
- Campo deportivo.
- Estudiante.
- Matricula.
- Escuela.
- Mes y ano.
- Periodo.
- Monto.
- Numero de reserva.
- Numero de tasa.
- Estado de reserva.
- Estado de validacion.
- Estado de pago.
- Disciplina.
- Entrenador.
- Fecha de pago.
- Observaciones.

Flujo general:

1. Ingresar a **Reservas > Escuelas Municipales**.
2. Crear mensualidad o periodo.
3. Seleccionar escuela municipal.
4. Seleccionar estudiante.
5. Definir mes, gestion o periodo.
6. Revisar monto.
7. Generar reserva, mensualidad o tasa segun corresponda.
8. Consultar pago RUAT si existe tasa.
9. Generar comprobante.

Reglas:

- La mensualidad debe estar vinculada a una escuela o estudiante valido.
- El monto debe corresponder a la tarifa o configuracion vigente.
- Si genera tasa, debe existir clasificador RUAT valido.
- La consulta de pago actualiza el estado solo si RUAT devuelve pago valido.
- Las mensualidades no deben documentarse como reservas recurrentes comunes, aunque compartan estados y comprobantes.

## 11. Gestion de Contribuyentes

El modulo **Contribuyentes** permite registrar y mantener ciudadanos o usuarios contribuyentes.

La lista incluye, entre otros campos:

- Nombre completo.
- Numero de documento.
- Telefono.
- Estado de usuario.
- Estado RUAT.
- Deportista de elite.
- Puede reservar gratis.
- Pertenece a escuela municipal.
- Registro Unico Deportivo.
- Fecha de ultimo uso gratuito.
- Observaciones municipales.
- Estado de sancion.

Acciones comunes:

- Ver detalle.
- Crear contribuyente.
- Actualizar datos permitidos.
- Bloquear o sancionar.
- Exportar.
- Vincular estudiantes.
- Vincular organizaciones.

Reglas importantes:

- Un contribuyente debe estar registrado o validado con RUAT para operaciones tributarias.
- No se debe eliminar o bloquear sin revisar dependencias activas.
- Las sanciones pueden impedir nuevas reservas.
- Los campos obligatorios se muestran marcados en el formulario.

Estados del contribuyente:

| Estado | Significado operativo |
|---|---|
| `ACTIVO` | Usuario habilitado en RUAT y sistema; puede realizar operaciones normales |
| `INACTIVO` | Usuario deshabilitado; no debe realizar reservas |
| `SANCIONADO` | Tiene sancion activa; puede tener restricciones temporales |
| `BLOQUEADO` | No puede reservar ni acceder hasta revision administrativa |
| `PENDIENTE_VERIFICACION` | Registro pendiente de validacion |

Perfiles especiales:

- **Deportista de elite:** puede acceder a beneficios de gratuidad segun configuracion y reglas institucionales.
- **Representante de organizacion:** puede operar reservas para organizaciones vinculadas.
- **Tutor o responsable de estudiantes:** puede vincular estudiantes para mensualidades o escuelas municipales.
- **Reserva gratuita habilitada:** permite aplicar gratuidad cuando la normativa o autorizacion administrativa lo respalda.

Proceso de actualizacion:

1. Ingresar a **Contribuyentes**.
2. Buscar el registro por nombre, documento u otro filtro disponible.
3. Abrir el detalle o editar.
4. Revisar secciones de informacion basica, estudiantes, organizaciones e informacion deportiva.
5. Modificar datos permitidos.
6. Guardar cambios.
7. Verificar que los cambios se apliquen inmediatamente.

Gestion de sanciones:

1. Seleccionar el contribuyente.
2. Usar la accion de bloquear o sancionar, segun permisos.
3. Registrar motivo.
4. Definir fecha de fin de sancion si corresponde.
5. Agregar observaciones administrativas.
6. Confirmar la accion.

Filtros comunes:

- Busqueda por nombre, apellidos o numero de documento.
- Estado de usuario.
- Estado RUAT.
- Tipo de contribuyente.
- Indicador de reserva gratuita.

## 12. Gestion de Organizaciones

El modulo **Organizaciones** administra escuelas, asociaciones, clubes y otras organizaciones.

Tipos principales:

| Tipo | Uso |
|---|---|
| `ESCUELA_MUNICIPAL` | Escuela con estudiantes, entrenadores, disciplinas y posibles mensualidades |
| `ASOCIACION` | Asociacion deportiva con representante |
| `CLUB` | Club deportivo con representante |
| `ORGANIZACION` | Organizacion general |

La lista incluye:

- Nombre.
- Tipo de organizacion.
- Telefono.
- Email.
- Direccion.
- Personeria juridica.
- NIT.
- Estado.
- Representante.
- Datos de contacto del representante.

Acciones comunes:

- Ver detalle.
- Crear organizacion.
- Actualizar datos.
- Anular o eliminar segun permisos.
- Asociar representante.
- Configurar si permite reservas gratuitas.

Privilegios por tipo de organizacion:

| Tipo | Privilegios o reglas |
|---|---|
| `ESCUELA_MUNICIPAL` | Puede manejar estudiantes, disciplinas, entrenadores, reservas gratuitas y mensualidades |
| `ASOCIACION` | Puede tener reservas gratuitas si existe autorizacion municipal |
| `CLUB` | Puede gestionar actividades regulares y, si corresponde, mensualidades |
| `ORGANIZACION` | Usa configuracion flexible segun autorizacion |

Proceso de creacion:

1. Ingresar a **Organizaciones**.
2. Presionar la accion de creacion.
3. Completar nombre, tipo, datos de contacto, NIT o personeria juridica si corresponde.
4. Seleccionar o vincular representante.
5. Configurar privilegios de gratuidad o mensualidad si aplica.
6. Guardar.

Proceso de actualizacion:

1. Buscar la organizacion.
2. Abrir detalle o editar.
3. Modificar datos permitidos.
4. Guardar cambios.

Reglas:

- Una organizacion debe tener representante cuando el flujo lo requiera.
- Las escuelas municipales deben mantener relacion con estudiantes para mensualidades.
- La gratuidad debe activarse solo con respaldo administrativo.
- No se debe eliminar una organizacion con reservas, mensualidades o estudiantes vinculados sin revision previa.

## 13. Administracion de Complejos

El modulo **Complejos Deportivos** permite administrar infraestructura deportiva.

Campos visibles principales:

- Nombre.
- Tipo de estructura.
- Estado actual.
- Telefono.
- Distrito.
- Ubicacion.
- Iluminacion.
- Vestuarios.
- Graderias.

Acciones principales:

- Crear complejo.
- Editar informacion.
- Ver ubicacion en mapa.
- Dar de baja si no tiene dependencias activas.
- Exportar datos.

Proceso de creacion:

1. Ingresar a **Administracion > Complejos Deportivos**.
2. Presionar el boton de creacion disponible en la cabecera de la lista.
3. Completar datos generales del complejo.
4. Seleccionar tipo de estructura y distrito.
5. Registrar ubicacion o seleccionar geolocalizacion en el mapa.
6. Guardar el registro.
7. Verificar que el complejo aparezca en la lista con estado correcto.

Proceso de actualizacion:

1. Ubicar el complejo en la lista.
2. Presionar la accion de editar.
3. Modificar datos permitidos.
4. Guardar cambios.
5. Verificar que la informacion se actualice sin afectar campos o reservas vinculadas.

Proceso de baja o eliminacion:

1. Seleccionar la accion de eliminar o anular.
2. Confirmar la accion.
3. El sistema debe verificar dependencias activas.
4. Si existen campos, reservas u otros registros vinculados, no debe permitir la eliminacion.

Un complejo no debe eliminarse si tiene campos, reservas u otras dependencias activas.

## 14. Administracion de Campos Deportivos

El modulo **Campos Deportivos** administra cada cancha o espacio deportivo.

Datos principales:

- Complejo.
- Codigo.
- Nombre.
- Categoria.
- Superficie.
- Iluminacion.
- Acceso libre.
- Requiere aprobacion.
- Estado actual.
- Dimensiones.
- Capacidad.
- Observaciones.

Acciones principales:

- Ver detalle del campo.
- Crear campo deportivo.
- Editar datos generales.
- Configurar horarios.
- Configurar excepciones.
- Configurar tarifas.
- Importar campos desde archivo cuando la opcion este disponible.
- Exportar registros seleccionados o toda la lista.
- Dar de baja si no tiene dependencias activas.

Proceso de creacion:

1. Ingresar a **Configuraciones > Campos Deportivos**.
2. Presionar la accion de creacion.
3. Seleccionar complejo activo.
4. Completar codigo, nombre, categoria, superficie, estado y capacidad.
5. Definir si el campo requiere aprobacion.
6. Registrar horarios de atencion.
7. Registrar tarifas asociadas.
8. Guardar y verificar que el campo aparezca en la lista.

Validaciones:

- El campo debe pertenecer a un complejo activo.
- La superficie y categoria deben existir.
- La capacidad debe ser coherente con el uso del campo.
- Los horarios no deben solaparse de forma invalida.
- Las tarifas deben tener tipo de cobro, precio base y clasificador RUAT cuando generen tasa.
- No se debe eliminar un campo con reservas asociadas.

### 14.1 Horarios

Cada campo puede tener horarios de atencion por dia. El sistema valida que las reservas se encuentren dentro de esos horarios.

Recomendaciones:

- Registrar horarios por dia de la semana.
- Mantener consistencia entre hora de apertura y cierre.
- Evitar franjas solapadas.
- Actualizar horarios antes de habilitar nuevas reservas.

### 14.2 Excepciones

Las excepciones bloquean o modifican disponibilidad:

- Cerrado.
- Mantenimiento.
- Evento municipal.
- Horario especial.

Uso operativo:

- **Cerrado:** impide reservas por cierre temporal.
- **Mantenimiento:** bloquea el campo por trabajos programados.
- **Evento municipal:** reserva o bloquea espacio para actividad prioritaria.
- **Horario especial:** ajusta disponibilidad para una fecha o condicion concreta.

### 14.3 Tarifas

Las tarifas definen:

- Tipo de cobro.
- Precio base.
- Fecha de inicio y fin.
- Rango horario `desde` y `hasta`.
- Clasificador RUAT.
- Categorias asociadas.
- Conceptos adicionales.
- Frecuencia y sesiones incluidas para mensualidades.

Tipos de cobro:

| Tipo | Descripcion |
|---|---|
| `por_hora` | Costo por horas de uso |
| `por_persona` | Costo por cantidad de personas |
| `por_evento` | Costo por evento |
| `por_club` | Costo mensual para club u organizacion |
| `por_sesion` | Costo por sesion u horas facturables |
| `mensualidad` | Costo mensual |

Conceptos adicionales:

| Tipo | Uso |
|---|---|
| `fijo` | Suma un monto fijo |
| `porcentaje` | Calcula porcentaje sobre subtotal |
| `por_hora` | Calcula monto por horas dentro de un rango |

Validaciones de tarifas:

- El precio base debe ser mayor o igual a cero.
- El tipo de cobro debe coincidir con el uso del campo.
- Las tarifas de evento deben respetar configuraciones de anticipacion y duracion maxima.
- Las tarifas por persona requieren cantidad de personas en la reserva.
- Las tarifas recurrentes deben ser usadas en flujos recurrentes o mensualidades.
- Si la reserva tiene costo, la tarifa debe contar con clasificador RUAT valido.

## 15. Administracion General

### 15.1 Encargados

Permite asignar personal a complejos deportivos. La lista muestra:

- Nombre.
- Complejo.
- Telefono.
- Estado activo.
- Fecha de asignacion.
- Fecha fin.
- Hora entrada.
- Hora salida.

Proceso de asignacion:

1. Ingresar a **Administracion > Encargados**.
2. Crear nueva asignacion.
3. Buscar o seleccionar funcionario registrado en GAMQSIS.
4. Seleccionar complejo deportivo.
5. Definir fecha de asignacion, fecha fin si corresponde, hora de entrada y hora de salida.
6. Guardar la asignacion.

Reglas:

- Un encargado debe estar vinculado a un complejo para operar como staff.
- La asignacion activa determina el alcance operativo.
- No se debe eliminar una asignacion si afecta procesos pendientes sin revision administrativa.

### 15.2 Superficies

Permite registrar tipos de superficie, por ejemplo cesped sintetico, cemento u otros materiales. Se valida que no se eliminen superficies usadas por campos.

Vista principal:

- Descripcion.
- Estado o acciones disponibles.

Acciones:

- Crear superficie.
- Ver detalle.
- Actualizar descripcion.
- Eliminar si no esta en uso.
- Importar datos desde Excel cuando la opcion este disponible.
- Exportar registros.

Validaciones:

- La descripcion debe ser obligatoria y unica.
- No se debe eliminar una superficie vinculada a campos deportivos.

### 15.3 Categorias o disciplinas

Permite registrar categorias deportivas. Campos principales:

- Codigo.
- Nombre.
- Descripcion.
- Tipo de cobro.
- Activo.
- Para asociacion.

Acciones:

- Crear categoria.
- Ver detalle.
- Actualizar datos permitidos.
- Eliminar si no esta en uso.
- Importar datos desde Excel cuando la opcion este disponible.
- Exportar registros.

Validaciones:

- El codigo debe ser unico.
- El nombre es obligatorio.
- El tipo de cobro debe corresponder a los valores permitidos.
- No se debe eliminar una categoria asociada a campos o tarifas.

### 15.4 Clasificadores RUAT

Modulo tecnico para asociar tarifas con clasificadores RUAT. Debe ser administrado por usuarios autorizados, ya que afecta la generacion de tasas.

Campos principales:

- Codigo.
- Nombre.
- Descripcion.
- Tipo de arancel.
- Estado.

Reglas:

- El clasificador debe coincidir con el servicio municipal correspondiente.
- Tarifas con costo deben estar vinculadas a un clasificador valido.
- Errores de clasificador o tipo de arancel pueden impedir el registro de tasa en RUAT.

### 15.5 Configuraciones de Sistema

Modulo para parametros globales o por ambito. Campos principales:

- Clave.
- Nombre.
- Categoria.
- Valor.
- Valor numerico.
- Valor booleano.
- Unidad.
- Estado.
- Modificable.
- Requiere aprobacion.
- Aplica a.

Configuraciones importantes:

| Clave | Uso |
|---|---|
| `CODIGO_ALCALDIA_RUAT` | Codigo de alcaldia para RUAT |
| `SERVICIO_MUNICIPAL_RUAT` | Servicio municipal usado en tasas |
| `USUARIO_RUAT` | Usuario de autenticacion RUAT |
| `CLAVE_RUAT` | Clave de autenticacion RUAT |
| `CODIGO_USUARIO_RUAT` | Usuario operador para tasas |
| `HABILITAR_RESERVAS_EVENTOS` | Activa reservas directas por evento |
| `HABILITAR_SOLICITUD_RESERVAS_EVENTOS` | Activa solicitudes por evento |
| `HABILITAR_RESERVAS_ORGANIZACIONES` | Activa reservas para organizaciones |
| `HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES` | Activa solicitudes para organizaciones |
| `HABILITAR_RESERVAS_RECURRENTES` | Activa reservas recurrentes |
| `HABILITAR_SOLICITUD_RESERVAS_RECURRENTES` | Activa solicitudes recurrentes |
| `HORAS_ANTICIPACION_RESERVAS_PUNTUALES` | Anticipacion minima de puntuales |
| `DIAS_ANTICIPACION_EVENTOS` | Anticipacion minima de eventos |
| `HORAS_ANTICIPACION_RECURRENTES` | Anticipacion minima de recurrentes |
| `DURACION_MINIMA_RESERVA` | Duracion minima de reserva |
| `DURACION_MAXIMA_EVENTOS` | Duracion maxima de eventos |
| `HORAS_VALIDACION_PAGO` | Plazo para pagar una tasa |
| `MAXIMO_RESERVAS_ACTIVAS_POR_USUARIO` | Limite de reservas activas por usuario |
| `MAXIMO_RESERVAS_POR_DIA_USUARIO` | Limite diario por usuario |
| `MAXIMO_INTENTOS_REINTENTO_RESERVAS` | Reintentos permitidos |
| `MINUTOS_GRACIA_NO_SHOW` | Gracia antes de marcar no show |
| `MAXIMO_NO_SHOWS_ANTES_SUSPENSION` | Limite para sancion |

## 16. Pagos y RUAT

Esta seccion explica, en lenguaje operativo, que significan la tasa RUAT, el pago y los estados asociados. Las acciones paso a paso para consultar pago o anular una reserva se describen en la seccion **9. Listas de Reservas y Acciones Operativas**, porque esas acciones se realizan desde las listas de reservas.

### 16.1 Que es una tasa RUAT

Cuando una reserva tiene costo, el sistema genera una **tasa**. La tasa es el numero que el contribuyente usa para pagar por los canales autorizados.

El usuario debe entender lo siguiente:

- Si la reserva tiene costo, necesita una tasa para pagar.
- Si la reserva es gratuita, no genera tasa.
- El numero de tasa aparece en la reserva y en el ticket.
- La reserva queda normalmente en estado `PENDIENTE` hasta que el pago sea verificado.
- El pago no se registra manualmente; se verifica mediante consulta al sistema RUAT desde DEPORTESAPP.

### 16.2 Que debe hacer el contribuyente

Despues de generar una reserva con costo:

1. Revisar el ticket o comprobante.
2. Identificar el numero de tasa.
3. Realizar el pago por los canales habilitados.
4. Esperar la verificacion del pago.
5. Si el pago ya fue realizado y la reserva sigue pendiente, solicitar o realizar la consulta de pago segun permisos.

### 16.3 Que debe hacer el encargado o administrador

Cuando un usuario informa que ya pago:

1. Ingresar a la lista de reservas correspondiente.
2. Ubicar la reserva por contribuyente, fecha, campo o numero de tasa.
3. Usar la accion **Consultar**.
4. Revisar el resultado.
5. Confirmar que la reserva cambie a `PAGADA` si RUAT devuelve pago valido.

El procedimiento detallado esta en **9.7 Consulta de pago RUAT**.

### 16.4 Resultado de la consulta de pago

| Resultado | Que significa | Accion sugerida |
|---|---|---|
| Pago encontrado | RUAT confirma que la tasa fue pagada | Verificar que la reserva pase a `PAGADA` |
| Pago no encontrado | RUAT no reporta pago para esa tasa | Indicar al contribuyente que revise su pago o espere actualizacion |
| Error de conexion | No se pudo consultar RUAT | Reintentar mas tarde o contactar soporte |
| Datos incompletos | Falta tasa o informacion necesaria | Revisar la reserva y reportar si corresponde |

### 16.5 Plazo de pago

Toda reserva pendiente de pago debe ser pagada dentro del plazo configurado por el sistema.

Si el pago no se realiza a tiempo:

- La reserva puede pasar a `EXPIRADA`.
- El horario puede volver a estar disponible.
- El usuario debe realizar una nueva reserva si aun necesita el campo.

### 16.6 Anulacion y pagos

La anulacion se usa principalmente antes del pago, cuando la reserva esta `PENDIENTE`.

Reglas importantes:

- Si la reserva esta pendiente y tiene tasa, el sistema intenta anular la tasa.
- Si la reserva ya fue pagada, no debe tratarse como anulacion comun.
- Si el usuario no se presento a una reserva pagada o en curso, corresponde registrar `NO_SHOW`.
- Cualquier devolucion o sancion economica debe gestionarse por procedimiento administrativo externo, no desde el flujo normal de reserva.

El procedimiento detallado esta en **9.9 Anulacion** y **9.10 Registro de No Show**.

## 17. Tickets y Comprobantes

El sistema permite generar comprobantes desde:

- Finalizacion de una nueva reserva.
- Lista de reservas puntuales.
- Lista de reservas recurrentes.
- Mensualidades de escuelas.

Un ticket puede incluir:

- Numero de reserva.
- Numero de tasa.
- Datos del contribuyente.
- Organizacion o estudiante.
- Complejo y campo.
- Fecha y horario.
- Tipo de reserva.
- Monto total.
- Estado de reserva y pago.
- Datos de pago si existen.

## 18. Reportes

El sistema ofrece reportes para seguimiento de reservas, pagos, ingresos y mensualidades. Estos reportes apoyan la gestion operativa y la toma de decisiones administrativas.

### 18.1 Reporte de pagos

Ruta: `/reports/payments`.

Permite revisar pagos registrados y estados asociados a tasas.

Informacion esperada:

- Numero de tasa.
- Numero de reserva.
- Contribuyente.
- Monto pagado.
- Fecha de pago.
- Forma de pago.
- Entidad financiera.
- Estado del pago.

Uso:

1. Ingresar a **Reportes > Pagos**.
2. Aplicar filtros disponibles.
3. Revisar pagos encontrados.
4. Contrastar con reservas cuando sea necesario.

### 18.2 Reportes por tipo

Ruta: `/reports/list/:tipoReporte`.

Tipos usados por el sistema:

- Reservas puntuales.
- Reservas recurrentes.
- Reservas mensuales o mensualidades.

Filtros comunes:

- Rango de fechas.
- Complejo deportivo.
- Tipo de cobro.
- Estado de reserva.
- Estado de pago.
- Organizacion o escuela.
- Estudiante, cuando corresponde.

### 18.3 Reporte de ingresos

Este reporte muestra un resumen de ingresos generados por reservas y pagos en un periodo.

Caracteristicas:

- Filtrado por rango de fechas.
- Resumen de ingresos totales.
- Desglose por tipo de reserva o tipo de cobro, si esta disponible.
- Apoyo para control de recaudacion.

Proceso:

1. Ingresar al menu **Reportes**.
2. Seleccionar el reporte de ingresos o pagos segun permisos.
3. Definir rango de fechas.
4. Generar o consultar resultados.

### 18.4 Reporte de reservas puntuales

Este reporte muestra reservas de uso unico, eventos o reservas por persona.

Filtros comunes:

- Rango de fechas.
- Complejo deportivo.
- Tipo de cobro: por hora, por persona o por evento.
- Estado de reserva: solicitada, pendiente, pagada, en curso, completada, cancelada, expirada o no show.

Informacion esperada:

- Numero de reserva.
- Contribuyente.
- Complejo y campo.
- Fecha y horario.
- Tipo de cobro.
- Monto.
- Numero de tasa.
- Estado de reserva y pago.

### 18.5 Reporte de reservas recurrentes

Este reporte permite revisar actividades periodicas, entrenamientos, clases o reservas repetidas.

Filtros comunes:

- Rango de fechas.
- Complejo deportivo.
- Tipo de cobro recurrente: por sesion o mensualidad.
- Estado de reserva.
- Organizacion o contribuyente.

Informacion esperada:

- Periodo de uso.
- Dias de semana.
- Cantidad de sesiones.
- Campo deportivo.
- Monto total.
- Estado de validacion, reserva y pago.

### 18.6 Reporte de mensualidades

Este reporte se usa para seguimiento de mensualidades, especialmente de escuelas municipales.

Filtros comunes:

- Rango o periodo.
- Escuela u organizacion.
- Estudiante.
- Estado de mensualidad o pago.
- Numero de tasa.

Informacion esperada:

- Estudiante.
- Matricula.
- Escuela.
- Mes y ano.
- Monto.
- Numero de reserva.
- Numero de tasa.
- Estado de pago.

## 19. Politicas y Condiciones de Uso

El uso del sistema implica aceptar las reglas operativas, politicas institucionales y condiciones de uso aplicables al servicio de reservas deportivas.

### 19.1 Politica de privacidad

El GAMQ debe proteger la informacion personal utilizada en DEPORTESAPP. El sistema puede procesar datos necesarios para:

- Gestion de cuentas.
- Gestion de reservas.
- Generacion de tasas RUAT.
- Notificaciones.
- Reportes administrativos.
- Cumplimiento normativo.

Informacion que puede ser registrada:

- Datos de identificacion.
- Informacion de contacto.
- Datos de reservas.
- Datos de organizaciones o estudiantes vinculados.
- Datos de pago necesarios para control de tasas.
- Estados de sancion o bloqueo cuando correspondan.

Uso de la informacion:

- Administrar usuarios y reservas.
- Generar y consultar tasas RUAT.
- Realizar seguimiento de pagos.
- Emitir comprobantes.
- Mejorar el control administrativo.
- Cumplir obligaciones legales o municipales.

La informacion no debe ser compartida fuera de los fines institucionales, salvo requerimiento legal, integracion necesaria con RUAT o procesos administrativos autorizados.

### 19.2 Terminos y condiciones de uso

El uso del sistema implica:

- Proporcionar informacion verdadera y actualizada.
- Aceptar terminos y condiciones antes de registrar reservas.
- Cumplir horarios de uso.
- Respetar infraestructura deportiva.
- Pagar tasas dentro del plazo establecido.
- No usar el sistema para fines fraudulentos o no autorizados.
- Aceptar que reservas sin pago pueden expirar o cancelarse.

Reglas de reserva:

- Las reservas estan sujetas a disponibilidad.
- Las tarifas y reglas pueden cambiar segun normativa o configuracion vigente.
- Las tasas generadas deben pagarse por canales autorizados.
- Las reservas no pagadas dentro del plazo establecido pueden expirar o cancelarse.
- Las modificaciones estan sujetas a disponibilidad y permisos.

Reglas de uso del campo deportivo:

- El usuario debe respetar el horario reservado.
- El usuario debe cuidar las instalaciones.
- El usuario debe reportar desperfectos o problemas detectados.
- El incumplimiento puede generar sanciones administrativas.

Responsabilidades del usuario:

- Mantener confidencialidad de sus credenciales.
- No compartir su cuenta.
- Usar el sistema de forma legal y autorizada.
- Respetar al personal del GAMQ y a otros usuarios.

### 19.3 Conductas no permitidas

Esta prohibido:

- Usar datos falsos para realizar reservas.
- Intentar acceder a modulos no autorizados.
- Interferir con el funcionamiento del sistema.
- Usar el sistema para fines fraudulentos.
- Realizar reservas que incumplan reglas municipales.
- Omitir informacion relevante cuando se solicita una reserva o anulacion.

## 20. Soporte Tecnico

Para problemas de acceso, permisos, configuraciones, RUAT o funcionamiento general, contactar al soporte designado por el GAMQ.

Datos de referencia heredados del manual anterior:

- Correo: `gamqtdi@gmail.com`
- Telefono: `(+591) 72248669`

Al solicitar soporte, incluir:

- Nombre completo.
- Numero de CI.
- Usuario o correo institucional.
- Modulo donde ocurre el problema.
- Descripcion breve.
- Captura de pantalla si corresponde.

## 21. Matriz de Validacion Funcional

| Funcion | Procedimiento | Criterio de validacion |
|---|---|---|
| Superficies | Crear, actualizar, eliminar | No debe eliminarse si esta en uso |
| Categorias | Crear, actualizar, eliminar | No debe eliminarse si esta asociada a campos o tarifas |
| Complejos | Crear, actualizar, dar de baja | No debe darse de baja con dependencias activas |
| Campos | Crear, configurar horarios y tarifas | Debe validar complejo activo, horarios, tarifas y RUAT |
| Encargados | Asignar a complejo | Debe recuperar usuarios y limitar alcance por complejo |
| Contribuyentes | Registrar y actualizar | Debe validar datos y vinculacion RUAT |
| Organizaciones | Registrar y vincular representante | Debe controlar tipo, gratuidad y estado |
| Reservas puntuales | Crear, validar, pagar, anular | Debe calcular costo, generar tasa y evitar conflictos |
| Reservas recurrentes | Crear periodo, sesiones y pagos | Debe validar franjas, calendario y conflictos |
| Escuelas municipales | Generar mensualidades | Debe vincular escuela, estudiante, monto y tasa |
| Pagos | Consultar RUAT | Debe actualizar pago solo si RUAT devuelve datos validos |
| Anulaciones | Anular reserva/tasa | Debe sincronizar con RUAT si existe tasa |
| Reportes | Generar por filtros | Debe reflejar reservas, pagos y mensualidades |

## 22. Glosario

| Termino | Definicion |
|---|---|
| GAMQ | Gobierno Autonomo Municipal de Quillacollo |
| RUAT | Registro Unico para la Administracion Tributaria |
| Contribuyente | Ciudadano registrado que puede operar reservas o pagos |
| Representante | Contribuyente vinculado a una organizacion |
| Complejo deportivo | Infraestructura que agrupa campos deportivos |
| Campo deportivo | Espacio especifico reservado para actividad deportiva |
| Tarifa | Configuracion de costo de uso |
| Concepto | Cargo adicional asociado a una tarifa |
| Clasificador RUAT | Codigo tributario usado para generar tasas |
| Reserva puntual | Reserva para una fecha y horario especifico |
| Reserva recurrente | Reserva con sesiones repetidas en un periodo |
| Mensualidad | Cobro mensual asociado a escuela, club u organizacion |
| Tasa | Obligacion de pago generada en RUAT |
| Ticket | Comprobante de reserva o pago |
| No Show | Incumplimiento por no presentarse al horario reservado |
