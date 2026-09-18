# DeportesApp GAMQ — descripción operativa del sistema

DeportesApp es el sistema municipal utilizado para controlar el uso de complejos, campos deportivos, escuelas municipales, contribuyentes, reservas, tasas y pagos. Su operación se basa en tres componentes coordinados:

1. **Frontend Angular**: muestra las vistas, solicita datos, guía los formularios, oculta acciones no permitidas y presenta los estados.
2. **`deportes-be`**: autentica, autoriza, valida reglas de negocio, guarda la información y decide si una operación puede continuar.
3. **RUAT**: consulta y registra contribuyentes, genera tasas, confirma pagos y anula tasas a través del backend.

El frontend nunca decide por sí solo si una operación es válida. Sus validaciones mejoran la experiencia y evitan envíos incompletos; la decisión definitiva se toma en el backend.

## 1. Modelo de control del sistema

### Inicio de sesión

El usuario introduce sus credenciales. El frontend las envía a `deportes-be` mediante `/auth/login`. El backend valida:

- identidad y contraseña;
- pertenencia al módulo DeportesApp;
- rol y permisos;
- estado del usuario;
- asignación de complejo para personal interno;
- disponibilidad de la integración RUAT.

La respuesta de login contiene token, usuario, tipo de usuario, indicador de administrador, información de personal, estado RUAT y menú autorizado.

El menú no es estático. Cada entrada recibida puede definir:

- una ruta;
- un recurso protegido (`permissionRoute`);
- una acción (`accion`);
- un módulo;
- hijos con acciones adicionales.

El frontend recorre todo el árbol de permisos y utiliza esas acciones para mostrar botones, abrir vistas y habilitar operaciones. Por ejemplo, tener acceso a **Reservas Puntuales** no implica tener automáticamente permiso para crear, validar, anular o cambiar horarios.

La autorización real se vuelve a comprobar en cada solicitud del backend. Un usuario que intente abrir una ruta directamente o enviar una operación manualmente no obtiene permisos adicionales.

Después de modificar roles, permisos, representación, asignación de complejo o estado RUAT, el usuario debe cerrar sesión e iniciar sesión nuevamente para recibir el menú actualizado.

### Tipos de usuario y alcance

#### Administrador

Puede recibir permisos para administrar catálogos, usuarios internos, configuraciones, reservas, validaciones y reportes. No puede ignorar las reglas de disponibilidad, estados, pagos, RUAT o configuración del sistema.

#### Encargado o personal interno

Trabaja con las acciones asignadas por Usuarios y con el complejo que tenga asignado durante el período correspondiente. Puede consultar, crear o validar reservas solo si esas acciones forman parte de su menú.

#### Contribuyente padre o tutor

Puede realizar las operaciones que su menú permita y registrar mensualidades de estudiantes que estén efectivamente a su cargo. Ser tutor no lo convierte en representante de una organización o escuela.

#### Contribuyente representante

Puede trabajar con organizaciones, escuelas, estudiantes y mensualidades vinculadas a una representación activa. La relación de representación limita los datos que puede seleccionar y las operaciones que puede realizar.

Los estados de usuario controlan el acceso:

- `PENDIENTE_VERIFICACION`: todavía no cumple la verificación requerida.
- `ACTIVO`: puede operar según sus permisos.
- `INACTIVO`: no puede utilizar las operaciones habilitadas.
- `SANCIONADO`: tiene una restricción vigente.
- `BLOQUEADO`: no puede reservar y puede tener bloqueado el acceso.

## 2. Interacción general de una operación

Todas las operaciones importantes siguen este ciclo:

```text
Usuario
  → selecciona una vista y una acción permitida
Frontend
  → valida campos, permisos y condiciones visibles
Backend
  → valida autorización, reglas, estados y duplicados
RUAT (si aplica)
  → consulta, registra tasa, confirma pago o anula
Backend
  → guarda el resultado y actualiza estados
Frontend
  → recarga la lista, muestra mensaje, ticket o error
```

Si una operación externa se completa pero el guardado local falla, el usuario no debe repetirla inmediatamente. Primero debe consultarse el resultado por número de tasa, folio o identificador de la operación para evitar duplicados.

## 3. Menú Inicio: cómo se utiliza

### Mapa — `/inicio/taxpayer`

Con `VER`, el usuario consulta complejos, campos, horarios, tarifas y disponibilidad. Con `RESERVAR`, elige un campo y comienza el flujo de reserva.

El mapa no habilita un campo por el solo hecho de mostrarlo. Antes de pasar al formulario se comprueba que el complejo y el campo estén operativos, que el encargado esté vigente cuando corresponda y que el horario seleccionado sea utilizable.

### Calendario — `/inicio/employee`

El personal consulta la ocupación y el estado de las reservas. El calendario sirve como vista operativa; la disponibilidad definitiva se vuelve a comprobar al guardar una reserva.

### Panel administrativo — `/inicio`

Presenta los indicadores y accesos que el menú del administrador permita. No concede operaciones por sí mismo.

## 4. Registro y control de contribuyentes

Ruta: `/taxpayers`.

Acciones disponibles en el perfil administrativo de referencia: `VER`, `CREAR`, `ACTUALIZAR`, `BLOQUEAR` y `EXPORTAR`.

### Registro de un contribuyente

1. El operador selecciona **Crear**.
2. El frontend solicita documento, tipo de documento y expedición.
3. El backend consulta RUAT a través de `/ruat/buscar`.
4. La interfaz muestra el resultado recibido y permite revisar los datos.
5. Si el flujo continúa, se completan los datos locales, cuenta, tipo de contribuyente, organización, representante o relación con estudiantes.
6. El backend valida duplicados y reglas de estado.
7. Se guarda el contribuyente y se recarga el listado.

El sistema controla duplicados por documento, NIT, correo y nombre de usuario. La validación del frontend solo anticipa el error; la unicidad definitiva pertenece al backend.

Cuando se requiere alta en RUAT, el backend ejecuta `/ruat/registro`. La respuesta determina si la verificación fue exitosa. No se debe marcar manualmente como verificado a un contribuyente que no tenga confirmación válida.

### Actualización, bloqueo y activación

`ACTUALIZAR` permite modificar los datos autorizados y mantener relaciones. `BLOQUEAR` cambia el estado según la causa y la operación permitida. Para activar un contribuyente, la interfaz controla que exista verificación RUAT cuando esta sea obligatoria.

La inactivación no borra reservas, pagos, estudiantes ni auditoría. Solo impide nuevas operaciones que requieran un usuario activo.

## 5. Organizaciones y representantes

Ruta: `/organizations`.

Acciones: `VER`, `CREAR`, `ACTUALIZAR` y `ANULAR`.

El operador registra la organización y después mantiene sus representantes. Una organización puede tener varios representantes. En una reserva o mensualidad, el sistema solo ofrece una organización o escuela si la relación del usuario es válida y está vigente.

Anular una organización no debe eliminar su historial ni permitir que se utilice para nuevas operaciones. Las reservas y pagos existentes se conservan conforme a sus propios estados.

## 6. Estudiantes, escuelas y responsables

Ruta: `/students`.

Acciones: `VER`, `CREAR`, `ACTUALIZAR`, `DAR DE BAJA` y `HABILITAR`.

### Alta

El personal registra al estudiante, selecciona una escuela, define el responsable y crea la relación estudiante–escuela. El responsable puede ser el propio contribuyente registrado o un contribuyente permitido por las reglas del sistema.

### Baja y reactivación

La baja desactiva la relación operativa, pero conserva la historia. La reactivación crea una nueva inscripción/matrícula. Si el estudiante cambia de escuela se crea otra relación, sin alterar las anteriores.

Estas relaciones son la base de la autorización de mensualidades: el sistema no debe permitir que cualquier contribuyente pague por cualquier estudiante.

## 7. Reserva puntual

Lista: `/reservations/one-time`. Detalle de creación: `/reservations/details`.

Acciones: `VER`, `CREAR`, `ACTUALIZAR`, `ANULAR`, `VALIDAR`, `CAMBIAR-HORARIO` y `GENERAR TICKET`.

### Flujo completo

1. El usuario entra desde el mapa, calendario o menú.
2. Selecciona complejo, campo, fecha y horario.
3. Selecciona beneficiario: contribuyente u organización.
4. Elige una tarifa compatible con el campo y el tipo de reserva.
5. El frontend calcula el detalle visible y comprueba campos obligatorios.
6. El backend verifica disponibilidad real, estado del campo, horario fijo, excepciones, conflictos, duración y anticipación.
7. Se crea la reserva.
8. Si la operación requiere autorización, queda en validación; si no, queda pendiente de pago según corresponda.
9. El personal con `VALIDAR` aprueba o rechaza.
10. Si es aprobada, el backend puede crear la tasa en RUAT.
11. El pago se confirma consultando RUAT.
12. Con pago confirmado, se actualiza la reserva y se habilita el ticket.

### Estados

- `SOLICITADA`: espera validación administrativa.
- `PENDIENTE`: creada o aprobada, pendiente de pago.
- `PAGADA`: pago confirmado.
- `EN_CURSO`: se encuentra dentro del horario de uso.
- `COMPLETADA`: terminó correctamente.
- `CANCELADA`: fue anulada por una acción autorizada o por una regla del sistema.
- `EXPIRADA`: venció el plazo de pago.
- `NO_SHOW`: el usuario no se presentó.

### Cambio de horario

`CAMBIAR-HORARIO` solo está disponible con el permiso correspondiente. El nuevo horario se valida como una reserva nueva: disponibilidad, conflictos, límites, tarifa y anticipación. Si se confirma, el backend actualiza la reserva y puede generar notificaciones.

### Anulación

`ANULAR` no es un borrado físico. El sistema revisa estado, pago, fecha, tasa asociada y motivo. Cuando existe una tasa RUAT, puede ser necesario anularla en RUAT antes de completar la operación local.

## 8. Reserva recurrente

Lista: `/reservations/recurrent`. Creación: `/reservations/details`.

Acciones: `VER`, `CREAR`, `ACTUALIZAR`, `ANULAR`, `VALIDAR`, `GENERAR TICKET` y `CREAR-POSTPAGO`.

El usuario define rango de fechas, días de uso, sesiones, duración, campo, beneficiario y tarifa. El sistema valida cada combinación de fecha y horario contra horarios fijos, excepciones y reservas existentes.

El personal con `VALIDAR` aprueba o rechaza solicitudes. El personal con `CREAR-POSTPAGO` puede crear una reserva posterior al uso únicamente si las configuraciones y reglas del backend lo permiten.

El pago recurrente tiene fecha límite. Si el pago no se confirma dentro del plazo, la reserva puede expirar y cancelarse automáticamente. El frontend informa el resultado y recarga la lista para no mostrar una reserva como activa cuando ya expiró.

## 9. Escuelas municipales y mensualidades

Lista: `/reservations/schools`. Registro: `/reservations/schools/new`.

Acciones: `VER`, `CREAR`, `ACTUALIZAR`, `ANULAR` y `GENERAR TICKET`.

### Flujo de registro

1. El usuario entra a **Agregar mensualidad**.
2. El frontend obtiene las reservas recurrentes disponibles para su alcance.
3. Se selecciona una reserva base de escuela que esté activa/aprobada.
4. La tarifa de la reserva base debe ser de tipo `mensualidad`.
5. Se valida que las fechas de inicio y fin sean correctas.
6. Se muestran solo estudiantes activos relacionados con la escuela y el usuario permitido.
7. Se seleccionan los períodos mensuales.
8. Se selecciona el pagador permitido.
9. Se revisan importes, entrenador, estudiantes y períodos.
10. El backend crea la tasa en RUAT.
11. El sistema consulta el pago por número de tasa.
12. Con pago confirmado, guarda la mensualidad y el pago local.
13. Se puede aprobar, actualizar o emitir el ticket según la acción disponible.

Un tutor sin estudiantes activos a cargo no puede registrar mensualidades. Un representante solo puede trabajar con escuelas que representa. La reserva base puede pertenecer a otra persona si la relación estudiante–escuela autoriza al pagador.

## 10. RUAT y pagos

RUAT nunca se consume directamente desde el navegador con credenciales municipales. El frontend llama a `deportes-be`, que expone una capa protegida para estas operaciones:

| Operación | Endpoint interno | Resultado usado por DeportesApp |
|---|---|---|
| Buscar contribuyente | `/ruat/buscar` | Datos y estado de identificación. |
| Registrar contribuyente | `/ruat/registro` | Confirmación/código de contribuyente. |
| Crear tasa | `/ruat/creartasa` | Número de tasa y datos de cobro. |
| Confirmar pago | `/ruat/pago` | Folio, monto, fecha, entidad y estado pagado. |
| Anular tasa | `/ruat/anulartasa` | Confirmación de anulación. |

El frontend acepta respuestas RUAT en texto o JSON y extrae mensaje, datos y `continuarFlujo`. Si RUAT devuelve una respuesta sin datos, una fecha inválida o un error, se detiene el flujo y se informa al usuario.

Los pagos se identifican por número de tasa y folio. Antes de registrar un pago nuevo se comprueba que no exista ya. Esta protección evita duplicar pagos cuando el usuario reintenta después de un error de red.

## 11. Reglas y validaciones que controlan las reservas

Las reglas pueden variar por configuración, complejo, campo, contribuyente u organización. El sistema contempla:

- usuario activo y autorizado;
- RUAT disponible y contribuyente verificado cuando sea obligatorio;
- complejo y campo activos;
- ausencia de mantenimiento, cierre o evento municipal;
- horario operativo, horario fijo y excepciones;
- ausencia de conflicto con otra reserva;
- fecha futura y horas/días de anticipación;
- duración mínima y máxima;
- rango válido de una reserva recurrente;
- tarifa compatible y monto calculado;
- fecha límite de pago;
- permisos de crear, validar, actualizar, anular o cambiar horario;
- relaciones activas entre contribuyente, organización, escuela y estudiante.

La configuración del sistema puede habilitar o deshabilitar reservas de eventos, organizaciones y recurrentes, así como definir anticipación, duración, validación de pagos, notificaciones y controles protegidos.

## 12. Paginación e interacción de listados

Los listados operativos consultan al backend con página, tamaño, filtros y orden. La respuesta utiliza normalmente `content`, `totalElements`, `totalPages` y `pageable`.

La interfaz muestra la página desde 1, mientras que la API usa índice desde 0. Al cambiar página, tamaño, filtro u orden, se ejecuta una nueva consulta y se actualiza el total. Reservas y escuelas comienzan con cinco filas por página.

La paginación no cambia permisos: solo modifica qué parte del resultado autorizado se muestra. Las listas pequeñas cargadas completas para selectores son datos auxiliares y no sustituyen la consulta paginada.

## 13. Reportes y tickets

Los reportes se generan con la acción `GENERAR` y se filtran según el alcance autorizado:

- ingresos: `/reports/payments`;
- reservas puntuales: `/reports/list/puntual`;
- reservas recurrentes: `/reports/list/recurrente`;
- mensualidades: `/reports/list/mensual`.

El ticket se habilita mediante `GENERAR TICKET` y representa el resultado registrado por el sistema. No debe generarse como comprobante de pago antes de la confirmación requerida.

## 14. Administración y catálogos

Los catálogos controlan qué puede seleccionarse en los flujos:

- complejos: ubicación, estado y responsables;
- encargados: personal, complejo y vigencia de asignación;
- superficies y categorías: clasificación de campos;
- campos: horarios, excepciones, tarifas y estado operativo;
- clasificadores RUAT: conceptos utilizados en tasas;
- configuraciones: anticipación, duración, pagos, funcionalidades, límites y notificaciones.

Acciones administrativas disponibles según el menú: `VER`, `CREAR`, `ACTUALIZAR` y `ANULAR`. Anular un catálogo debe respetar dependencias e historial; no equivale a eliminar información utilizada por reservas anteriores.

## 15. Estados de pago y validación

- `PENDIENTE`: no existe confirmación de pago.
- `PAGADO`: pago confirmado en RUAT y registrado localmente.
- `PARCIAL`: se registró un pago incompleto cuando el flujo lo permite.
- `REEMBOLSADO`: devolución asociada a una cancelación.
- `FALLIDO`: intento de pago no confirmado.

La aprobación administrativa y el pago son controles diferentes. Una reserva puede estar aprobada pero seguir pendiente de pago. Una mensualidad puede tener tasa creada pero no estar pagada. El frontend presenta ambos estados para evitar confundir autorización con cobro.

## 16. Desarrollo y despliegue

Requisitos: Node.js 20, npm y `deportes-be` configurado.

```powershell
npm ci
npm start
npm run build -- --configuration development
npm run build -- --configuration production
```

Abrir `http://localhost:4200`. Desarrollo usa por defecto `http://localhost:8085/api`; producción usa `environment.prod.ts` y API relativa `/api`. El `Dockerfile` compila con Node 20 y sirve con Nginx. El proxy debe dirigir `/api` y `/ws-notificaciones` al backend.

No incluir tokens, contraseñas, credenciales RUAT ni respuestas completas de login en el repositorio, capturas, logs o documentación.

La documentación de `deportes-be` complementa este documento con contratos API, persistencia, autorización, configuraciones y la integración protegida con RUAT.
