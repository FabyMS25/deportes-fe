interface ComplexNode {
    name: string;
    children?: ComplexNode[];
}

export const TREE_DATA: ComplexNode[] = [
  {
    name: 'GAMQ',
    children: [
      {
        name: 'Complejos Deportivos',
        children: [
          {
            name: 'Complejo 1',
            children: [
              {
                name: 'Campo Deportivo 1.1',
                children: [
                  { name: 'Horarios' },
                  { name: 'Tarifas' },
                  { name: 'Categoría' },
                  { name: 'Superficie' }
                ]
              },
              { name: 'Campo Deportivo 1.2' },
              { name: 'Campo Deportivo 1.n' }
            ]
          },
          {
            name: 'Complejo 2',
            children: [
              { name: 'Campo Deportivo 2.1' },
              { name: 'Campo Deportivo 2.2' },
              { name: 'Campo Deportivo 2.n' }
            ]
          },
          {
            name: 'Complejo n',
            children: [
              { name: 'Campo Deportivo n.1' },
              { name: 'Campo Deportivo n.2' },
              { name: 'Campo Deportivo n.n' }
            ]
          }
        ]
      }
    ]
  }
];

export const FAQCategory = [
{
  "title": "Preguntas Generales",
  "icon": "ri-question-line",
  "faqs": [
    {
      "question": "¿Para qué sirve la aplicación?",
      "answer": "Permite solicitar y consultar reservas de campos deportivos, organizar usos recurrentes y registrar mensualidades de escuelas municipales. Las opciones disponibles dependen de su autorización y de las condiciones del establecimiento."
    },
    {
      "question": "¿Qué diferencia hay entre reserva puntual, recurrente y mensualidad?",
      "answer": "La puntual corresponde a una fecha y horario. La recurrente reúne varias fechas de uso programadas. La mensualidad registra el cobro de los meses seleccionados para estudiantes de una escuela; no reserva por sí sola una hora de cancha."
    },
    {
      "question": "¿Dónde encuentro los campos y sus condiciones?",
      "answer": "Consulte el mapa o las opciones de complejos y campos disponibles en su cuenta. Revise los horarios, las tarifas y las características publicadas para el lugar elegido. Si falta información o no coincide con el establecimiento, consulte al encargado antes de confirmar."
    },
    {
      "question": "¿Qué tipos de cobro existen?",
      "answer": "El sistema contempla cobros por hora, persona, evento, club, sesión y mensualidad. No todos están disponibles en todos los campos. Elija una tarifa ofrecida para su trámite y revise cómo se calcula el total antes de confirmar."
    },
    {
      "question": "¿Qué debo revisar antes de confirmar?",
      "answer": "Compruebe el campo, las fechas y horarios, el responsable, la organización si corresponde, las personas o sesiones y el importe. En mensualidades, revise escuela, estudiantes y meses. Lea los términos; confirme solo cuando los datos sean correctos."
    },
    {
      "question": "¿Por qué mi reserva queda como Solicitada?",
      "answer": "El trámite necesita aprobación. Todavía no se ha emitido un cobro para pagar. El personal autorizado podrá aprobarlo o rechazarlo e indicar el motivo. Una solicitud no equivale a una reserva aprobada ni a un pago confirmado."
    },
    {
      "question": "¿Por qué no puedo seleccionar un horario?",
      "answer": "Puede estar ocupado, fuera de los horarios habilitados o no cumplir las condiciones de fecha, anticipación o duración. Revise el aviso mostrado. En una reserva recurrente, compruebe también las sesiones individuales y los días excluidos."
    },
    {
      "question": "¿Puedo reservar para una organización?",
      "answer": "Cuando la opción esté disponible, seleccione la organización correspondiente y revise quién será responsable del trámite. La organización no reemplaza al contribuyente responsable del cobro. Solo realice gestiones para las que esté autorizado."
    },
    {
      "question": "¿Quién puede registrar una reserva gratuita?",
      "answer": "La gratuidad depende de las condiciones y autorizaciones del sistema; no se obtiene simplemente omitiendo el pago. Cuando se autoriza una reserva gratuita no se emite un cobro y no se aplica anulación automática por falta de pago."
    },
    {
      "question": "¿Por qué no aparece una reserva de escuela al registrar mensualidades?",
      "answer": "La lista depende de la escuela seleccionada, de su acceso y de las reservas disponibles. Una reserva de escuela marcada como Completada deja de ofrecerse para nuevas mensualidades. Consulte al encargado si falta la que necesita; no cree otra únicamente para evitar esa restricción."
    },
    {
      "question": "¿Por qué no puedo seleccionar un mes de un estudiante?",
      "answer": "Solo se ofrecen los períodos permitidos por la reserva de la escuela. Los meses que ya tienen una mensualidad registrada no se pueden seleccionar nuevamente. Consulte el registro existente y su estado antes de intentar otro cobro."
    },
    {
      "question": "¿Qué significan los estados?",
      "answer": "Solicitada: espera aprobación. Pendiente: espera pago o confirmación. Pagada: pago confirmado. En curso: período de uso. Completada: uso finalizado. Cancelada: cancelación o rechazo procesado. Expirada: vencimiento con anulación confirmada. No Show: inasistencia registrada. Aprobada se refiere a la autorización, no al pago."
    },
    {
      "question": "¿Puedo cambiar o cancelar una reserva?",
      "answer": "Solicite ayuda al personal autorizado. El cambio de horario está previsto para puntuales pendientes que cumplan las condiciones, manteniendo duración e importe. Un pedido todavía sin cobro puede rechazarse; si existe un cobro pendiente, cancelarlo requiere confirmación de RUAT. Una gratuita aprobada puede cancelarse sin anular un cobro."
    },
    {
      "question": "¿Cómo encuentro una reserva o compruebo qué cambió?",
      "answer": "Use las pestañas, filtros y búsqueda de la lista y abra el detalle del registro. Revise por separado la aprobación, el estado de la reserva y el pago. Si una revisión informa cambios o problemas, lea los registros y mensajes del resumen; no significa que todo lo listado haya cambiado."
    },
    {
      "question": "¿Qué información envío si necesito ayuda?",
      "answer": "Indique la acción que realizó, el número de reserva o de cobro, el campo o escuela y el mensaje recibido. Adjunte el comprobante si el problema es de pago. Oculte datos personales innecesarios en las capturas y nunca envíe contraseñas ni códigos de acceso."
    }
  ]
},
{
    title: "Pagos y revisión automática",
    icon: "ri-refresh-line",
    faqs: [
      {"question":"¿Qué diferencia hay entre el cobro, el ticket y el comprobante de pago?","answer":"La tasa es el cobro municipal y tiene un número que lo identifica. El ticket muestra ese cobro para que pueda pagarlo; no demuestra que ya pagó. Conserve el comprobante entregado al realizar el pago."},
      {"question":"¿Una reserva aprobada ya está pagada?","answer":"No. Aprobada significa que el pedido fue autorizado. El pago se comprueba por separado en RUAT. Una reserva gratuita no requiere pago."},
      {"question":"¿Cuándo empieza mi plazo para pagar?","answer":"Si su pedido necesita aprobación, primero debe ser aprobado y emitirse el cobro. Cuando corresponde anulación automática, el plazo se recalcula en ese momento, no desde el día en que envió la solicitud. Revise la fecha y hora definitivas que muestra la reserva."},
      {"question":"¿Todas las reservas tienen el mismo plazo?","answer":"No. Las puntuales por hora o persona, los eventos y las recurrentes pueden tener plazos distintos. La tabla de esta página muestra los valores disponibles en su sesión. Para una reserva ya registrada, respete su fecha y hora límite; una configuración posterior no es un nuevo vencimiento para ese trámite."},
      {"question":"¿Qué significa anulación automática por falta de pago?","answer":"Significa que el sistema puede solicitar anular el cobro si no fue pagado y ya pasó el plazo de esa reserva. Primero consulta el pago. No significa que toda reserva pendiente se anule ni que la anulación ocurra exactamente al llegar la hora límite."},
      {"question":"¿En qué orden se revisa mi reserva?","answer":"Primero se consulta si el cobro ya fue pagado. Si RUAT lo confirma, se registra el pago y se actualiza el estado según el tipo de trámite y las fechas de uso. Solo si no hay pago se comprueba el plazo y si corresponde anulación automática. La reserva pasa a Expirada después de que RUAT confirma la anulación."},
      {"question":"¿Qué sucede si no tengo anulación automática?","answer":"El pago se sigue consultando y se actualiza cuando RUAT lo confirma, pero no se anula por vencimiento. Si necesita cancelar, consulte al personal autorizado."},
      {"question":"¿Las mensualidades vencen o se completan al terminar el mes?","answer":"No se anulan automáticamente por plazo ni pasan a Completada al terminar el mes. Representan el pago de los meses y estudiantes seleccionados. Una vez confirmado el pago, quedan como Pagadas. Terminar el mes no acredita el pago ni elimina el cobro."},
      {"question":"¿Cuándo se revisan los pagos y se actualiza la lista?","answer":"Al entrar o actualizar la lista se solicita una revisión. Mientras permanece abierta se vuelve a solicitar cada cinco minutos. También puede usar Consultar cuando la opción esté disponible. No es necesario crear de nuevo la reserva para comprobar el pago."},
      {"question":"¿Se revisan solo las cinco filas que veo?","answer":"No. La revisión automática comprende los registros que requieren revisión entre los que usted puede consultar, aunque estén en otras páginas. Cambiar de página, ordenar o filtrar no inicia por sí solo otra revisión."},
      {"question":"¿Consultar seleccionados revisa toda la lista?","answer":"No. El botón Consultar de la selección consulta las filas que usted seleccionó. El botón de una fila consulta ese registro. Esto es distinto de la revisión automática que se realiza al cargar o actualizar la lista."},
      {"question":"¿Por qué mi pago aún no aparece?","answer":"La confirmación puede no verse inmediatamente. Consulte de nuevo cuando corresponda y revise el mensaje recibido. Si ya pagó pero sigue pendiente, conserve el comprobante y comunique al encargado el número del cobro y la fecha del pago. No genere otra reserva ni otro cobro para resolverlo."},
      {"question":"¿Qué significa “no tiene pagos realizados”?","answer":"La consulta no encontró un pago para ese cobro. No significa por sí sola que se perdió la conexión. Si usted ya pagó, consulte al encargado con el comprobante. Si el mensaje dice que el registro no existe, solicite que se verifique el número del cobro; ese mensaje por sí solo no demuestra una anulación."},
      {"question":"¿Qué pasa si RUAT no responde o la revisión queda incompleta?","answer":"La lista sigue disponible, pero una operación que no pudo confirmarse no se registra como pago o anulación confirmados. El aviso identifica los registros pendientes o con problemas; no significa que todas las reservas hayan fallado. Puede solicitar otra revisión y, si persiste, comunicar el mensaje al encargado."},
      {"question":"¿Por qué una reserva pagada aparece En curso o Completada?","answer":"El estado de la reserva también describe el uso del campo. Después de confirmar el pago puede pasar a En curso durante su horario o a Completada cuando termine. Eso no elimina el pago. Las mensualidades no se completan por fecha y las reservas gratuitas de escuelas se cierran por personal autorizado."},
      {"question":"¿Qué significa Expirada y qué diferencia tiene con Cancelada?","answer":"Expirada indica que venció el plazo y se confirmó la anulación del cobro. Cancelada corresponde a una cancelación o a un rechazo ya procesado. Una revisión automática no reactiva registros cancelados, expirados, completados o marcados como inasistencia."},
      {"question":"¿En curso significa que una reserva recurrente está usando la cancha en este momento?","answer":"No necesariamente. En las recurrentes, el estado se activa según el rango de fechas y los días programados; no vuelve a Pagada entre sesiones. Consulte el calendario y los horarios para conocer cuándo corresponde el uso. En las puntuales, el estado se calcula con la fecha y el horario concretos."},
      {"question":"¿Anular un cobro devuelve el dinero?","answer":"No. La anulación no produce un reembolso automático. Si considera que corresponde una devolución, presente su caso al GAMQ con el comprobante y siga el procedimiento que le indiquen."},
      {"question":"¿Qué hago si se emitió el cobro pero apareció un error al registrar?","answer":"Conserve el número del cobro y el mensaje. No vuelva a emitirlo para intentar corregir el problema. Solicite al encargado que verifique el resultado antes de repetir el trámite; así evita cobros duplicados."}
    ]
  },
{
  "title": "Gestión de Cuenta",
  "icon": "ri-user-settings-line",
  "faqs": [
    {
      "question": "¿Qué necesito para crear una cuenta de contribuyente?",
      "answer": "Prepare su documento de identidad, nombres y apellidos, fecha de nacimiento, género, teléfono y un correo al que tenga acceso. Complete los campos obligatorios del formulario; otros datos, como dirección o NIT, se solicitan según corresponda. Revise los términos antes de enviar."
    },
    {
      "question": "¿Por qué algunos datos de identificación aparecen bloqueados?",
      "answer": "Cuando se encuentran sus datos en RUAT, el formulario completa y bloquea varios campos de identificación para no sustituirlos libremente. Si encuentra un error, consulte al personal responsable sobre su corrección antes de continuar."
    },
    {
      "question": "¿Cómo confirmo mi correo durante el registro?",
      "answer": "El formulario envía un código de cuatro dígitos al correo indicado. Escríbalo en la pantalla de confirmación. Esta comprobación forma parte del registro; recibir el primer correo no significa que todos los pasos hayan terminado."
    },
    {
      "question": "¿Qué hago si no recibo el código?",
      "answer": "Revise que el correo sea correcto, la carpeta de correo no deseado y el mensaje mostrado por la aplicación. Puede utilizar la opción de reenviar en la pantalla de verificación. No cierre esa pantalla mientras completa el registro; si perdió los datos del trámite, vuelva al formulario y compruebe antes si la cuenta ya fue creada."
    },
    {
      "question": "¿Cuáles son mis datos iniciales de acceso?",
      "answer": "En el registro actual de contribuyentes, el sistema asigna inicialmente el número de documento como usuario y contraseña y envía los datos de acceso al completar el registro. Cambie esa contraseña por una personal al ingresar. Para cuentas del personal municipal, utilice las credenciales indicadas por su administrador."
    },
    {
      "question": "¿Qué hago si el sistema dice que mis datos ya están registrados?",
      "answer": "No intente crear otra identidad para evitar el aviso. Si ya tiene cuenta, intente iniciar sesión o recuperar la contraseña. Si no reconoce el registro o hay un error en sus datos, contacte al personal responsable."
    },
    {
      "question": "¿Cómo recupero una contraseña olvidada?",
      "answer": "Use la opción de recuperación de contraseña de la pantalla de acceso e indique el correo registrado. Abra el enlace recibido y siga las instrucciones para establecer una nueva contraseña. Si no tiene acceso a ese correo, solicite ayuda; no comparta el enlace con otras personas."
    },
    {
      "question": "¿Cómo cambio mi contraseña o mis datos de contacto?",
      "answer": "Revise las opciones de configuración de su perfil. Utilice la opción de cambio de contraseña y los campos de contacto habilitados. Si el dato está bloqueado o su cuenta se administra mediante el sistema de personal municipal, solicite la corrección al responsable."
    },
    {
      "question": "¿Por qué no veo un botón o una sección que otra persona sí tiene?",
      "answer": "Las funciones dependen de su cuenta, de las autorizaciones asignadas y del estado del registro. Tener una cuenta activa no habilita todas las acciones. Si necesita una función para su trabajo, solicite que revisen su acceso."
    },
    {
      "question": "¿Qué hago si mi cuenta aparece bloqueada o restringida?",
      "answer": "Consulte el aviso mostrado y comuníquese con el personal responsable para conocer el motivo y solicitar revisión. No cree otra cuenta para eludir la restricción."
    },
    {
      "question": "¿Qué sucede cuando vence mi sesión?",
      "answer": "Debe volver a iniciar sesión para continuar con las funciones protegidas. Los términos públicos siguen disponibles sin ingresar. Si estaba registrando un trámite, compruebe su resultado antes de repetirlo; un cierre de sesión no demuestra que un cobro no se haya emitido."
    },
    {
      "question": "¿Puedo compartir mi cuenta para que otra persona haga un trámite?",
      "answer": "No comparta su usuario y contraseña. Cada persona debe utilizar su propio acceso y las autorizaciones correspondientes. Si necesita gestionar estudiantes u organizaciones a su cargo, solicite que esas relaciones y permisos estén registrados correctamente."
    }
  ]
},
{
  "title": "Privacidad y Seguridad",
  "icon": "ri-shield-keyhole-line",
  "faqs": [
    {
      "question": "¿Quién puede consultar mis datos?",
      "answer": "Usted y el personal autorizado pueden consultar la información necesaria según sus funciones y el trámite. No todas las cuentas tienen el mismo acceso. Consulte la Política de Privacidad o contacte al GAMQ para aclarar el uso de sus datos."
    },
    {
      "question": "¿Por qué se consulta información en RUAT?",
      "answer": "La aplicación utiliza RUAT para comprobar información del contribuyente, emitir cobros y consultar pagos o anulaciones. RUAT no determina por sí solo si una cancha está en uso; esa situación se gestiona en la aplicación deportiva."
    },
    {
      "question": "¿Cómo protejo mi cuenta?",
      "answer": "Cambie la contraseña inicial, utilice una contraseña personal difícil de adivinar y no la reutilice en otros servicios. No comparta códigos ni enlaces de recuperación. Cierre sesión al terminar, especialmente en equipos compartidos."
    },
    {
      "question": "¿Qué hago si sospecho que alguien utilizó mi cuenta?",
      "answer": "Cambie la contraseña si todavía puede ingresar, revise sus trámites y comunique al GAMQ cualquier operación que no reconozca. Si perdió el acceso, utilice la recuperación o solicite ayuda al responsable."
    },
    {
      "question": "¿Es seguro enviar capturas para pedir ayuda?",
      "answer": "Envíe solo la información necesaria para identificar el problema. Oculte contraseñas, códigos de verificación, enlaces de recuperación y datos personales ajenos al caso. Utilice los medios de atención indicados por el GAMQ."
    },
    {
      "question": "¿Cómo cuido los datos de estudiantes y menores?",
      "answer": "Consulte y registre únicamente información de estudiantes que esté autorizado a gestionar. Compruebe al responsable de pago y evite compartir listados, documentos o capturas con personas ajenas al trámite."
    },
    {
      "question": "¿Dónde encuentro la Política de Privacidad?",
      "answer": "Puede leerla sin iniciar sesión mediante el enlace de los Términos y Condiciones de Uso. Allí se describe el tratamiento de la información personal; consulte al GAMQ si requiere una aclaración o corrección."
    },
    {
      "question": "¿Dónde están los términos y la guía de ayuda?",
      "answer": "Los Términos y Condiciones de Uso se abren desde los formularios y desde esta página; no requieren iniciar sesión. Contienen las condiciones que acepta. Las instrucciones, ejemplos y respuestas sobre cómo usar la aplicación están en Preguntas frecuentes."
    },
    {
      "question": "¿Abrir o cerrar los términos significa que ya los acepté?",
      "answer": "No. Leerlos o pulsar Volver no marca las casillas de aceptación de reservas o mensualidades. Debe aceptarlos expresamente antes de confirmar esos formularios. En el registro de cuenta, lea el aviso de aceptación antes de enviarlo."
    },
    {
      "question": "¿Puedo aceptar y registrar por otra persona?",
      "answer": "Solo si está autorizado para realizar ese trámite. Revise a quién corresponde el cobro y qué estudiantes o personas incluye. La aceptación de términos no concede permisos adicionales ni sustituye la autorización para representar a otra persona."
    },
    {
      "question": "¿Puedo pedir que corrijan o eliminen mis datos?",
      "answer": "Comuníquese con el GAMQ e identifique la información y el trámite relacionados, sin enviar contraseñas. Una cancelación de reserva o una restricción de cuenta no equivale por sí sola a eliminar datos o comprobantes; el tratamiento de su solicitud depende del procedimiento y de las obligaciones aplicables."
    }
  ]
}
];
