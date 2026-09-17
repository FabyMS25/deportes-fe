# Deportes GAMQ — frontend

Aplicación web para gestionar espacios deportivos del Gobierno Autónomo Municipal de Quillacollo. Utiliza Angular 17, TypeScript, Bootstrap/ng-bootstrap, NgRx, Leaflet, FullCalendar y componentes compartidos de formularios y listados.

## Funcionalidades

- Mapa y calendario de complejos/canchas; administración de superficies, categorías, encargados, horarios y tarifas.
- Contribuyentes, organizaciones, escuelas y varios representantes por organización.
- Estudiantes e inscripciones por escuela, tutor/responsable, matrículas, bajas, reactivaciones e historial de mensualidades.
- Reservas puntuales y recurrentes: disponibilidad, tarifas, aprobación, pagos, cambios de horario y anulación según permisos.
- Mensualidades para varios estudiantes y períodos, pagador, consulta de pagos y tickets.
- Listados, exportación de datos disponibles, reportes de reservas y pagos.
- Configuración del sistema, perfil, recuperación de acceso y notificaciones del usuario.

La [documentación del backend](../deportes-be/README.md) explica los flujos completos. Las operaciones pasan por deportes-be, que utiliza Usuarios y ruat-be; el navegador no debe contener claves del gateway ni credenciales municipales RUAT.

## Roles y flujo de trabajo

| Usuario | Comportamiento |
| --- | --- |
| Administrador / personal autorizado | Gestiona registros según permisos y alcance. Puede asignar como tutor a un contribuyente que no represente una organización. |
| Encargado | Acceso asociado a permisos de Usuarios y asignación de complejo. |
| Contribuyente padre/tutor | Registra mensualidades de sus estudiantes sin representar una organización. Ser tutor solamente no permite crear inscripciones. |
| Contribuyente representante | Inscribe estudiantes bajo su propia responsabilidad en escuelas que representa; gestiona mensualidades de esas escuelas. |

### Inicio de sesión

El frontend realiza una solicitud al backend. Deportes comprueba el acceso al gateway RUAT, autentica al usuario y devuelve token, menú y estado RUAT. Se presenta ese estado sin otra llamada automática de autenticación. Una indisponibilidad municipal puede mostrarse como aviso; el rechazo del acceso al gateway bloquea el login.

Las acciones visibles provienen del menú del backend. La autorización real se aplica en el servidor. Después de modificar permisos o representación, volver a iniciar sesión.

### Estudiantes y mensualidades

1. Registrar contribuyente, escuela y representantes cuando corresponda.
2. El personal registra el estudiante, selecciona escuela y puede asignar cualquier contribuyente como responsable.
3. Si registra un representante, el responsable es él mismo y solo se ofrecen sus escuelas; una única escuela se selecciona por defecto.
4. En **Mensualidades → Agregar**, seleccionar escuela, reserva recurrente base aprobada/activa, estudiantes, períodos y pagador permitido.
5. Un padre puede pagar sus estudiantes aunque la reserva base pertenezca a otra persona. Si no tiene estudiantes activos a cargo ni de una escuela que representa, se muestra: “Su usuario no tiene estudiantes a cargo, por lo que no puede registrar mensualidades.”
6. Revisar importes, registrar tasa y mensualidad, y consultar posteriormente pago, ticket e historial. Si falla el guardado después de crear una tasa, verificar el resultado antes de repetir.

La baja conserva el historial; reactivar genera una inscripción y matrícula nuevas. Para otra escuela se registra una nueva relación del estudiante.

## Desarrollo y compilación

Requisitos: Node.js 20 (usado por el Dockerfile), npm y backend configurado. Se usa el Angular CLI local del proyecto.

```powershell
npm ci
npm start
# Compilación de desarrollo
npm run build -- --configuration development
# Compilación de producción
npm run build -- --configuration production
```

Abrir `http://localhost:4200`. `src/environments/environment.ts` usa por defecto `http://localhost:8085/api`. Producción usa `environment.prod.ts` y API relativa `/api`. Configurar las URLs e integraciones públicas para cada entorno. `.npmrc` conserva `legacy-peer-deps=true` para las dependencias existentes.

Resultado: `dist/deportes-gamq`. Con dependencias instaladas también puede compilarse mediante `node node_modules/@angular/cli/bin/ng.js build --configuration development`, si el comando global npm de Windows necesita reparación.

## Organización

```text
src/app/
  core/                Modelos, servicios API, autenticación, guards y helpers
  layouts/             Navegación y disposición de la aplicación
  pages/
    dashboards/        Panel, mapa y calendario
    modules/           Administración, reservas, estudiantes y reportes
    modals/            Formularios y flujo de mensualidades
    account/           Perfil y configuración de cuenta
  public/              Acceso, registro, recuperación y páginas públicas
  shared/              Tablas, encabezados, widgets y componentes reutilizables
  store/               Estado NgRx
src/assets/            Imágenes, traducciones, estilos y recursos
src/environments/      Configuración por entorno
```

`pages/modals/mensuality` también contiene la página de registro `/reservations/schools/new`; no se utiliza exclusivamente como modal. Se conservan componentes y recursos del tema declarados o referenciados para mantener las vistas.

## Rutas principales

| Área | Ruta |
| --- | --- |
| Panel, calendario, mapa | `/inicio`, `/inicio/employee`, `/inicio/taxpayer` |
| Complejos y encargados | `/admin/facilities`, `/admin/employees` |
| Superficies y categorías | `/admin/area`, `/admin/categories` |
| Clasificadores y configuración | `/admin/classifiers`, `/admin/config` |
| Canchas | `/settings/fields` |
| Contribuyentes, organizaciones, estudiantes | `/taxpayers`, `/organizations`, `/students` |
| Puntuales / recurrentes | `/reservations/one-time`, `/reservations/recurrent` |
| Mensualidades / registro | `/reservations/schools`, `/reservations/schools/new` |
| Reserva / ticket | `/reservations/details`, `/reservations/ticket` |
| Reportes | `/reports/payments`, `/reports/list/:tipoReporte` |

El acceso depende de sesión y permisos; no todas las opciones aparecen para todos los usuarios.

## Despliegue

El Dockerfile compila con Node 20 y sirve con Nginx:

```powershell
docker build -t deportes-fe .
```

`.dockerignore` excluye dependencias locales, resultados y archivos de trabajo para no reemplazar las dependencias instaladas en la imagen. `default.conf` sirve los archivos y permite recargar rutas Angular. El proxy público debe dirigir `/api` y `/ws-notificaciones` al backend. `nginx.host.conf.backup` se conserva como referencia histórica, no lo usa el Dockerfile.

## Autoría

GAMQ · Fabiola Danny Morales Siles · moralessfaby.dev@gmail.com
