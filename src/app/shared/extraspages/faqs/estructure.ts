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
    title: "Preguntas Generales",
    icon: "ri-question-line",
    faqs: [
      {
        question: "¿Qué es el sistema de reservas deportivas del GAMQ?",
        answer: "Es una plataforma diseñada para facilitar la reserva de campos deportivos municipales, permitiendo a los contribuyentes gestionar sus reservas de manera autónoma y promoviendo la transparencia en el uso de los recursos municipales."
      },
      {
        question: "¿Qué tipos de instalaciones deportivas puedo encontrar?",
        answer: "Puedes encontrar complejos deportivos que pueden ser 'Techados', 'Abiertos' o 'Cerrados', cada uno con diferentes tipos de campos deportivos según su superficie y categoría."
      },
      {
        question: "¿Cómo puedo buscar un complejo deportivo?",
        answer: "Los complejos deportivos están organizados por distrito y ubicación. Puedes ver su ubicación exacta en el mapa usando las coordenadas proporcionadas por el sistema."
      },
      {
        question: "¿Qué información puedo ver sobre un campo deportivo?",
        answer: "Puedes ver el código del campo, tipo de superficie, horarios de atención, tarifas según el tipo de actividad (por hora, evento o persona) y las categorías o disciplinas permitidas."
      },
      {
        question: "¿Cómo funcionan las reservas?",
        answer: "Las reservas se pueden realizar según los horarios disponibles de cada campo. Una vez realizada, deberás efectuar el pago correspondiente según la tarifa establecida antes de que la reserva venza."
      },
      {
        question: "¿Qué estados puede tener una reserva?",
        answer: "Una reserva puede estar en cuatro estados: 1) Pendiente: reserva recién generada en espera de pago 2) Pagado: la tasa fue cancelada 3) Vencido: no se realizó el pago en el plazo establecido 4) Anulado: la tasa fue anulada por un usuario autorizado."
      },
      {
        question: "¿Qué tipos de tarifas existen?",
        answer: "Las tarifas pueden ser por: 1) Evento 2) Hora 3) Persona. El costo varía según la categoría y/o disciplina del campo deportivo."
      },


      {
        question: "¿Cómo puedo hacer una reserva?",
        answer: "Para realizar una reserva, siga estos pasos: 1) Seleccione el complejo deportivo de su interés 2) Explore los campos deportivos disponibles y sus tarifas 3) Elija el horario que prefiera (según el tipo de tarifa) 4) Complete el formulario de reserva 5) Confirme y genere el ticket de pago"
      },
      {
        question: "¿Cómo puedo pagar mi reserva?",
        answer: "Después de generar el ticket de pago, puede realizar el pago a través de los canales autorizados por RUAT."
      },
      {
        question: "¿Puedo modificar mi reserva?",
        answer: "Una reserva solo puede ser modificada por un usuario autorizado, los unicos datos posibles para modificar en caso de requerirlo son: Fecha, horario de Entrada y Horario de salida, el intervalo de los horarios debe ser el mismo a los horarios previos registrados"
      },
      {
        question: "¿Puedo cancelar mi reserva?",
        answer: "Una cancelacion de reserva solo es posible si esta aun se encuantra pendiente (No fue pagada), para cancelar una reserva contacte al administrador o encargado del complejo."
      },
    ]
  },
  {
    title: "Gestión de Cuenta",
    icon: "ri-user-settings-line",
    faqs: [
      {
        question: "¿Qué datos necesito proporcionar para mi registro?",
        answer: "Necesitas proporcionar: 1) Información personal: nombres, apellidos, fecha nacimiento, género y estado civil 2) Documento de identidad: tipo, número y lugar de expedición 3) Información de contacto: celular y correo electrónico 4) Opcionalmente: dirección y NIT."
      },
      {
        question: "¿Puedo modificar mis datos después del registro?",
        answer: "Puedes modificar tu información de contacto y datos opcionales, sin embargo, los datos de identificación (tipo de documento, número y expedición) no pueden ser modificados después del registro inicial debido a la integración con el sistema RUAT."
      },
      {
        question: "¿Qué estados puede tener mi cuenta?",
        answer: "Tu cuenta puede estar en dos estados: 1) Activo: con acceso completo al sistema para realizar reservas y modificar datos personales 2) Bloqueado: solo permite visualización de datos históricos."
      },
      {
        question: "¿Qué necesito para registrarme?",
        answer: "Necesitas: 1) Tu documento de identidad 2) Un correo electrónico válido 3) Tus datos personales básicos como nombres, apellidos, fecha de nacimiento y estado civil."
      },
      {
        question: "¿Cómo funciona el proceso de verificación?",
        answer: "El proceso incluye una verificación inicial en RUAT con tu documento de identidad, seguido de una verificación de correo electrónico donde recibirás un código de 4 dígitos que deberás ingresar en el sistema."
      },
      {
        question: "¿Cuáles son mis credenciales iniciales?",
        answer: "Tus credenciales iniciales serán: Usuario: Tu número de documento de identidad. Contraseña: Tu número de documento de identidad. Se recomienda cambiar la contraseña inmediatamente después del primer inicio de sesión."
      },
      {
        question: "¿Qué hago si olvido mi contraseña?",
        answer: "Puedes usar la opción 'Olvidaste tu contraseña?' en la página de inicio de sesión. Recibirás un enlace de recuperación en tu correo electrónico registrado. Este enlace es válido por 24 horas."
      },
      {
        question: "¿Cómo puedo cambiar mi contraseña?",
        answer: "Para cambiar tu contraseña debes: 1) Acceder al sistema con tus credenciales 2) Ir a 'Configuraciones' 3) Seleccionar 'Cambiar Contraseña' 4) Seguir las instrucciones en pantalla."
      }
    ]
  },
  {
    title: "Privacidad y Seguridad",
    icon: "ri-shield-keyhole-line",
    faqs: [
      {
        question: "¿Cómo puedo mantener segura mi cuenta?",
        answer: "Recomendamos: 1) Usar una contraseña de al menos 8 caracteres combinando letras, números y símbolos 2) No compartir tus credenciales 3) Cerrar sesión al terminar de usar el sistema 4) Evitar usar información personal fácil de adivinar en tu contraseña"
      },
      {
        question: "¿Por qué necesito verificar mi correo electrónico?",
        answer: "La verificación del correo electrónico es necesaria para garantizar la seguridad de tu cuenta y asegurar que podamos enviarte información importante sobre tus reservas y recuperación de contraseña."
      },
      {
        question: "¿Por cuánto tiempo es válido el enlace de recuperación de contraseña?",
        answer: "Por razones de seguridad, el enlace de recuperación de contraseña es válido únicamente por 24 horas desde el momento en que se solicita."
      },
      {
        question: "¿Qué debo hacer si sospecho que alguien más está usando mi cuenta?",
        answer: "Si sospechas actividad no autorizada en tu cuenta: 1) Cambia tu contraseña inmediatamente 2) Verifica tus últimas reservas 3) Contacta con soporte técnico para reportar la situación."
      },
      {
        question: "¿Cómo se protege mi información personal?",
        answer: "Tu información se maneja según las normativas de protección de datos vigentes. El acceso está restringido según roles de usuario, se mantiene un registro de modificaciones, y la integración con RUAT asegura la validez de los datos de identificación."
      },
      {
        question: "¿Quién puede ver mis datos personales?",
        answer: "Como contribuyente, solo tú puedes ver tus datos completos. Los administradores y encargados tienen acceso limitado según sus permisos, siempre respetando las normativas de protección de datos."
      },
      {
        question: "¿Dónde puedo encontrar los Términos y Condiciones Generales?",
        answer: "Puedes acceder a nuestros Términos y Condiciones Generales completos a través del enlace directo que se encuentra en la parte inferior de cada página. Estos términos describen cómo se manejan los datos personales y la privacidad de los usuarios en nuestro sistema de reserva de instalaciones deportivas."
      },
      {
        question: "¿Dónde puedo encontrar la Política de Privacidad?",
        answer: "Nuestra Política de Privacidad está disponible a través del enlace directo en el pie de página. Este documento detalla cómo recopilamos, utilizamos y protegemos su información personal."
      },
      {
        question:"¿Qué es RUAT y por qué es necesario?",
        answer:"RUAT (Registro Único para la Administración Tributaria) es la plataforma oficial para:1) Verificar su registro como contribuyente 2) Generar las tasas de pago 3) Gestionar los pagos de manera transparente y legal 4) Validar el estado de sus reservas"  
      },
      {
        question: "¿Por qué necesito mi consentimiento para RUAT?",
        answer:"Su consentimiento es necesario para generar la tasa a través de RUAT, lo cual es esencial para procesar su reserva. Sin este consentimiento, no es posible completar el proceso de reserva."
      }
    ]
  }
];
