import { MenuItem } from './menu.model';
export const MENU_BASE: MenuItem[] = [
  // {
  //   "uuid":"91b69bcd-6273-479c-88a3-9c3bd796584c",
  //   "modulo":"DEPORTESAPP",
  //   "codigo":"SIS-013",
  //   "nombreMenu":"Dashboard de Admin",
  //   "accion":"VER",
  //   "ruta":"/inicio",
  //   "orden":1,
  //   "icono":"ri-dashboard-2-line",
  //   "estado":false,
  //   "permisoHijoListDto":[],
  //   "subNivel":false
  // },
  // {
  //   "uuid":"43e436ff-7bc4-416e-b0ea-21f93021a1c7",
  //   "modulo":"DEPORTESAPP",
  //   "codigo":"SIS-013",
  //   "nombreMenu":"Dashboard de Empleado",
  //   "accion":"VER",
  //   "ruta":"/inicio/employee",
  //   "orden":1,
  //   "icono":"ri-dashboard-2-line",
  //   "estado":false,
  //   "permisoHijoListDto":[],
  //   "subNivel":false
  // },
  {
    "uuid":"81a40727-d633-4e5e-9f08-663fd674fd4c",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Dashboard de Contribuyente",
    "accion":"VER",
    "ruta":"/inicio/taxpayer",
    "orden":1,
    "icono":"ri-dashboard-2-line",
    "estado":false,
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"2c5d6d42-4393-4cff-be30-5e51713265f6",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Reservas",
    "accion":"ACTUALIZAR",
    "ruta":"/reservations",
    "orden":2,
    "icono":"ri-profile-line",
    "estado":false,
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"cdff6f71-b264-470f-b4a4-80518f47f10e",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Reservas",
    "accion":"CREAR",
    "ruta":"/reservations",
    "orden":2,
    "icono":"ri-profile-line",
    "estado":false,
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"1e767a1a-e158-4373-8b03-0d7bd55221ee",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Reservas",
    "accion":"VER",
    "ruta":"/reservations",
    "orden":2,
    "icono":"ri-profile-line",
    "estado":false,
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"37ee150e-3970-4895-a488-9127673250be",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Reservas",
    "accion":"VERIFICAR PAGO",
    "ruta":"/reservations",
    "orden":2,
    "icono":"ri-profile-line",
    "estado":false,
    "permisoHijoListDto":[],
    "subNivel":false
  },
  // {
  //   "uuid":"a9f1892e-c0e8-4f28-aea1-1234fd80a1aa",
  //   "modulo":"DEPORTESAPP",
  //   "codigo":"SIS-013",
  //   "nombreMenu":"Contribuyentes",
  //   "accion":"VER",
  //   "ruta":"/taxpayers",
  //   "orden":3,
  //   "icono":"ri-account-circle-line",
  //   "estado":false,
  //   "permisoHijoListDto":[],
  //   "subNivel":false
  // },
  // {
  //   "uuid":"5d5d14c0-01cb-4b5e-b5c7-06df460097c3",
  //   "modulo":"DEPORTESAPP",
  //   "codigo":"SIS-013",
  //   "nombreMenu":"Reportes",
  //   "accion":"GENERAR",
  //   "ruta":"/reports",
  //   "orden":4,
  //   "icono":"ri-file-list-3-line",
  //   "estado":false,
  //   "permisoHijoListDto":[],
  //   "subNivel":false
  // },
  // {
  //   "uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
  //   "modulo":"DEPORTESAPP",
  //   "codigo":"SIS-013",
  //   "nombreMenu":"Administracion",
  //   "accion":"",
  //   "ruta":"",
  //   "orden":5,
  //   "icono":"ri-settings-3-line",
  //   "estado":false,
  //   "permisoHijoListDto":[
  //     {"uuid":"149a1fa1-c546-48c3-a4e6-01b7b5661cb9","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Encargados","accion":"VER","ruta":"/settings/employees","orden":1,"icono":"ri-user-2-fill","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"20ce9b41-2706-4541-bc8a-40e81628a909","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Encargados","accion":"ELIMINAR","ruta":"/settings/employees","orden":1,"icono":"ri-user-2-fill","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"94bb63fb-c3ba-4dcf-b98f-2e24e560cd70","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Encargados","accion":"CREAR","ruta":"/settings/employees","orden":1,"icono":"ri-user-2-fill","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"40d72007-ba8b-493f-8cf8-852fc77b4d38","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Complejos Deportivos","accion":"CREAR","ruta":"/settings/facilities","orden":2,"icono":"ri-government-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"d8dabaf3-6b80-49a9-be87-a146b13fd5e6","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Complejos Deportivos","accion":"ACTUALIZAR","ruta":"/settings/facilities","orden":2,"icono":"ri-government-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"e67c15c1-30ab-4330-bff3-03820d1b2003","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Complejos Deportivos","accion":"VER","ruta":"/settings/facilities","orden":2,"icono":"ri-government-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"a841f585-782f-452e-8d03-1454b33baba5","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Encargados","accion":"ACTUALIZAR","ruta":"/settings/employees","orden":1,"icono":"ri-user-2-fill","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"cf62c6d8-e0f6-439d-9d4c-d41ed27a21b5","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Categorias","accion":"VER","ruta":"/settings/categories","orden":4,"icono":"ri-football-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"6d101629-4096-4b4a-8ca7-0152589b8843","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Categorias","accion":"CREAR","ruta":"/settings/categories","orden":4,"icono":"ri-football-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"8cee97b5-60cd-4b5a-b9c2-1209bc0e67f3","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Categorias","accion":"ELIMINAR","ruta":"/settings/categories","orden":4,"icono":"ri-football-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"36d25505-f7a0-4ea2-b2fd-807520270000","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Categorias","accion":"ACTUALIZAR","ruta":"/settings/categories","orden":4,"icono":"ri-football-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"838b6e2f-4096-45d4-9e3d-4a297888d838","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Superficies","accion":"VER","ruta":"/settings/area","orden":5,"icono":"ri-home-6-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"1edf4db0-0afe-4fe1-b04d-921117d9e1ea","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Superficies","accion":"CREAR","ruta":"/settings/area","orden":5,"icono":"ri-home-6-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"bf0f67b9-c1c0-4c06-9214-b4e68da2372f","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Superficies","accion":"ACTUALIZAR","ruta":"/settings/area","orden":5,"icono":"ri-home-6-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"dfc0c1b0-fa62-4447-9d69-0b8c336fd9cf","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Superficies","accion":"ELIMINAR","ruta":"/settings/area","orden":5,"icono":"ri-home-6-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"07d298b6-9a39-4a6b-a763-a940f4cd2d49","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Complejos Deportivos","accion":"ELIMINAR","ruta":"/settings/facilities","orden":2,"icono":"ri-government-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"5c3d151e-d4c9-4932-aaa4-603d0fbe7b6d","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Campos Deportivos","accion":"ELIMINAR","ruta":"/settings/fields","orden":3,"icono":"ri-store-3-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"d64aa296-0f48-46d3-ba63-c09fa8634b90","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Campos Deportivos","accion":"VER","ruta":"/settings/fields","orden":3,"icono":"ri-store-3-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"68980c8c-0be3-4f4c-8ef9-411a1e789ee8","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Campos Deportivos","accion":"ACTUALIZAR","ruta":"/settings/fields","orden":3,"icono":"ri-store-3-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false},
  //     {"uuid":"937f67f7-33f0-47c7-8617-b41474b9feba","modulo":"DEPORTESAPP","codigo":"SIS-013","nombreMenu":"Campos Deportivos","accion":"CREAR","ruta":"/settings/fields","orden":3,"icono":"ri-store-3-line","estado":false,"permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},"permisoHijoListDto":[],"subNivel":false}
  //   ],
  //   "subNivel":false
  // },
  {
    "uuid":"20ce9b41-2706-4541-bc8a-40e81628a909",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Encargados",
    "accion":"ELIMINAR",
    "ruta":"/settings/employees",
    "orden":1,
    "icono":"ri-user-2-fill",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"149a1fa1-c546-48c3-a4e6-01b7b5661cb9",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Encargados",
    "accion":"VER",
    "ruta":"/settings/employees",
    "orden":1,
    "icono":"ri-user-2-fill",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"a841f585-782f-452e-8d03-1454b33baba5",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Encargados",
    "accion":"ACTUALIZAR",
    "ruta":"/settings/employees",
    "orden":1,
    "icono":"ri-user-2-fill",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"94bb63fb-c3ba-4dcf-b98f-2e24e560cd70",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Encargados",
    "accion":"CREAR",
    "ruta":"/settings/employees",
    "orden":1,
    "icono":"ri-user-2-fill",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"40d72007-ba8b-493f-8cf8-852fc77b4d38",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Complejos Deportivos",
    "accion":"CREAR",
    "ruta":"/settings/facilities",
    "orden":2,
    "icono":"ri-government-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"d8dabaf3-6b80-49a9-be87-a146b13fd5e6",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Complejos Deportivos",
    "accion":"ACTUALIZAR",
    "ruta":"/settings/facilities",
    "orden":2,
    "icono":"ri-government-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"e67c15c1-30ab-4330-bff3-03820d1b2003",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Complejos Deportivos",
    "accion":"VER",
    "ruta":"/settings/facilities",
    "orden":2,
    "icono":"ri-government-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"07d298b6-9a39-4a6b-a763-a940f4cd2d49",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Complejos Deportivos",
    "accion":"ELIMINAR",
    "ruta":"/settings/facilities",
    "orden":2,
    "icono":"ri-government-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"937f67f7-33f0-47c7-8617-b41474b9feba",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Campos Deportivos",
    "accion":"CREAR",
    "ruta":"/settings/fields",
    "orden":3,
    "icono":"ri-store-3-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee","modulo":"DEPORTESAPP","nombreMenu":"Administracion","accion":"","ruta":"","orden":5,"icono":"ri-settings-3-line","estado":false,"permisoHijoListDto":[],"subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"68980c8c-0be3-4f4c-8ef9-411a1e789ee8",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Campos Deportivos",
    "accion":"ACTUALIZAR",
    "ruta":"/settings/fields",
    "orden":3,
    "icono":"ri-store-3-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":
      "Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false},
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"5c3d151e-d4c9-4932-aaa4-603d0fbe7b6d",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Campos Deportivos",
    "accion":"ELIMINAR",
    "ruta":"/settings/fields",
    "orden":3,
    "icono":"ri-store-3-line",
    "estado":false,
    "permisoPadreDto":{
      "uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,
      "permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Campos Deportivos",
    "accion":"VER",
    "ruta":"/settings/fields",
    "orden":3,
    "icono":"ri-store-3-line",
    "estado":false,
    "permisoPadreDto":{
      "uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Categorias",
    "accion":"VER",
    "ruta":"/settings/categories",
    "orden":4,
    "icono":"ri-football-line",
    "estado":false,
    "permisoPadreDto":{
      "uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Categorias",
    "accion":"CREAR",
    "ruta":"/settings/categories",
    "orden":4,
    "icono":"ri-football-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Categorias",
    "accion":"ACTUALIZAR",
    "ruta":"/settings/categories",
    "orden":4,
    "icono":"ri-football-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Categorias",
    "accion":"ELIMINAR",
    "ruta":"/settings/categories",
    "orden":4,
    "icono":"ri-football-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Superficies",
    "accion":"VER",
    "ruta":"/settings/area",
    "orden":5,
    "icono":"ri-home-6-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Superficies",
    "accion":"ELIMINAR",
    "ruta":"/settings/area",
    "orden":5,
    "icono":"ri-home-6-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Superficies",
    "accion":"ACTUALIZAR",
    "ruta":"/settings/area",
    "orden":5,
    "icono":"ri-home-6-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "ombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  },
  {
    "uuid":"1edf4db0-0afe-4fe1-b04d-921117d9e1ea",
    "modulo":"DEPORTESAPP",
    "codigo":"SIS-013",
    "nombreMenu":"Superficies",
    "accion":"CREAR",
    "ruta":"/settings/area",
    "orden":5,
    "icono":"ri-home-6-line",
    "estado":false,
    "permisoPadreDto":{"uuid":"eccaab59-9916-4086-9320-59eebe8d2fee",
      "modulo":"DEPORTESAPP",
      "nombreMenu":"Administracion",
      "accion":"",
      "ruta":"",
      "orden":5,
      "icono":"ri-settings-3-line",
      "estado":false,"permisoHijoListDto":[],
      "subNivel":false
    },
    "permisoHijoListDto":[],
    "subNivel":false
  }
]
  export const MENU: MenuItem[] = [
  // ,
  {
    permisoPadreDto: 100,
    orden: 20,
    nombreMenu: 'MENUITEMS.CHARTS.TEXT',
    icono: 'ri-pie-chart-line',
    isCollapsed: true,
    permisoHijoListDto: [
          {
            orden: 1,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.LINE',
            ruta: '/charts/apex-line',
            permisoPadreDto: 20
          },
          {
            orden: 2,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.AREA',
            ruta: '/charts/apex-area',
            permisoPadreDto: 20
          },
          {
            orden: 3,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.COLUMN',
            ruta: '/charts/apex-column',
            permisoPadreDto: 20
          },
          {
            orden: 4,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.BAR',
            ruta: '/charts/apex-bar',
            permisoPadreDto: 20
          },
          {
            orden: 5,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.MIXED',
            ruta: '/charts/apex-mixed',
            permisoPadreDto: 20
          },
          {
            orden: 6,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.TIMELINE',
            ruta: '/charts/apex-timeline',
            permisoPadreDto: 20
          },
          {
            orden: 7,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.RANGEAREA',
            ruta: '/charts/range-area',
            badge: {
              variant: 'bg-success',
              text: 'MENUITEMS.DASHBOARD.BADGE',
            },
            permisoPadreDto: 20
          },
          {
            orden: 8,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.FUNNEL',
            ruta: '/charts/funnel',
            badge: {
              variant: 'bg-success',
              text: 'MENUITEMS.DASHBOARD.BADGE',
            },
            permisoPadreDto: 20
          },
          {
            orden: 9,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.CANDLSTICK',
            ruta: '/charts/apex-candlestick',
            permisoPadreDto: 20
          },
          {
            orden: 10,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.BOXPLOT',
            ruta: '/charts/apex-boxplot',
            permisoPadreDto: 20
          },
          {
            orden: 11,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.BUBBLE',
            ruta: '/charts/apex-bubble',
            permisoPadreDto: 20
          },
          {
            orden: 12,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.SCATTER',
            ruta: '/charts/apex-scatter',
            permisoPadreDto: 20
          },
          {
            orden: 13,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.HEATMAP',
            ruta: '/charts/apex-heatmap',
            permisoPadreDto: 20
          },
          {
            orden: 14,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.TREEMAP',
            ruta: '/charts/apex-treemap',
            permisoPadreDto: 20
          },
          {
            orden: 15,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.PIE',
            ruta: '/charts/apex-pie',
            permisoPadreDto: 20
          },
          {
            orden: 16,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.RADIALBAR',
            ruta: '/charts/apex-radialbar',
            permisoPadreDto: 20
          },
          {
            orden: 17,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.RADAR',
            ruta: '/charts/apex-radar',
            permisoPadreDto: 20
          },
          {
            orden: 18,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.POLARAREA',
            ruta: '/charts/apex-polar',
            permisoPadreDto: 20
          },
          {
            orden: 2,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.CHARTJS',
            ruta: '/charts/chartjs',
            permisoPadreDto: 20
          },
          {
            orden: 3,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.ECHARTS',
            ruta: '/charts/echarts',
            permisoPadreDto: 20
          }
        ]
  },
      {
        orden: 2,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.CHARTJS',
        ruta: '/charts/chartjs',
        permisoPadreDto: 20
      },
      {
        orden: 3,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.ECHARTS',
        ruta: '/charts/echarts',
        permisoPadreDto: 20
      },
      {
        orden: 1,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.LINE',
        ruta: '/charts/apex-line',
        permisoPadreDto: 20
      },

      {
        orden: 1,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.LINE',
        ruta: '/charts/apex-line',
        permisoPadreDto: 20
      },
      {
        orden: 2,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.AREA',
        ruta: '/charts/apex-area',
        permisoPadreDto: 20
      },
      {
        orden: 3,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.COLUMN',
        ruta: '/charts/apex-column',
        permisoPadreDto: 20
      },
      {
        orden: 4,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.BAR',
        ruta: '/charts/apex-bar',
        permisoPadreDto: 20
      },
      {
        orden: 5,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.MIXED',
        ruta: '/charts/apex-mixed',
        permisoPadreDto: 20
      },
      {
        orden: 6,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.TIMELINE',
        ruta: '/charts/apex-timeline',
        permisoPadreDto: 20
      },
      {
        orden: 7,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.RANGEAREA',
        ruta: '/charts/range-area',
        badge: {
          variant: 'bg-success',
          text: 'MENUITEMS.DASHBOARD.BADGE',
        },
        permisoPadreDto: 20
      },
      {
        orden: 8,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.FUNNEL',
        ruta: '/charts/funnel',
        badge: {
          variant: 'bg-success',
          text: 'MENUITEMS.DASHBOARD.BADGE',
        },
        permisoPadreDto: 20
      },
      {
        orden: 9,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.CANDLSTICK',
        ruta: '/charts/apex-candlestick',
        permisoPadreDto: 20
      },
      {
        orden: 10,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.BOXPLOT',
        ruta: '/charts/apex-boxplot',
        permisoPadreDto: 20
      },
      {
        orden: 11,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.BUBBLE',
        ruta: '/charts/apex-bubble',
        permisoPadreDto: 20
      },
      {
        orden: 12,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.SCATTER',
        ruta: '/charts/apex-scatter',
        permisoPadreDto: 20
      },
      {
        orden: 13,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.HEATMAP',
        ruta: '/charts/apex-heatmap',
        permisoPadreDto: 20
      },
      {
        orden: 14,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.TREEMAP',
        ruta: '/charts/apex-treemap',
        permisoPadreDto: 20
      },
      {
        orden: 15,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.PIE',
        ruta: '/charts/apex-pie',
        permisoPadreDto: 20
      },
      {
        orden: 16,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.RADIALBAR',
        ruta: '/charts/apex-radialbar',
        permisoPadreDto: 20
      },
      {
        orden: 17,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.RADAR',
        ruta: '/charts/apex-radar',
        permisoPadreDto: 20
      },
      {
        orden: 18,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.POLARAREA',
        ruta: '/charts/apex-polar',
        permisoPadreDto: 20
      },
];
