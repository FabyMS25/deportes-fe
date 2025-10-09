export const GlobalComponent = {
    /* STORAGE KEYs */
    USER_KEY: 'currentUser',
    TOKEN_KEY: 'auth-token',    
    headerToken : {'Authorization': `Bearer ${sessionStorage.getItem('token')}`},

    /* APP DETAILS */
    CODE_APP : "SIS-013",
    NAME_APP : "DEPORTESAPP",
    ADMIN_MENU:'Administración',
    URL : 'http://deportes-gamq.gob.bo/',//'http://localhost:4200',

    super_admin:{
        username:'faby25',
        password:'password',
        whatsApp:'+59172248669',
        email:'moralessfaby.dev@gmail.com'
    },
    contact_info:{
        phone: '(591) 4 4362771-72-73',
        email: 'gamqtdi@gmail.com',
        address: 'Mercado Martín Cárdenas, Planta Baja, Quillacollo'
    },
    admin_deportes:{
        role:'Aministrador',
        avatar:'default-profile1.png',
        name:'Pedro Luis Sevilla Calderón',
        telf:'60367407',
    },
    EmailJS:{
        idService:'service_auth',
        idTemplate:'template_6htavso',
        publicKey:'X9362U1QpUzthcHGT'
    },

    /* RUAT CREDENTIALS TEST */
    apiRuatUrl: "https://consolidacionjboss.ruat.gob.bo", 
    RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    RUAT_clave: "S1234567",
    /* RUAT CREDENTIALS PRODUCTION */
    // apiRuatUrl: "https://aplicaciones.ruat.gob.bo",
    // RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    // RUAT_clave: "Gam#1209",
    
    RUAT_token : `${sessionStorage.getItem('ruatToken')}`,  
    RUAT_codigoUsuario: "PRUEBAS_1.QUI", 
    RUAT_passwordUsuario: "Ruat_123$",
    RUAT_codigoAlcaldia: "QUI",
    RUAT_motivo: "REGISTRO TASAS Y OTROS INGRESOS",
    RUAT_servicioMunicipal: "2453",// "2174", //TASAS Y OTROS INGRESOS
    RUAT_tipoTasa: "TO", //TASAS Y OTROS INGRESOS

    /* RULES */
    VALID_HOURS: 4, 
    ANTICIPATION_PUNTUAL_HOURS: 18,
    ANTICIPATION_EVENT_HOURS:48,
    ANTICIPATION_RECURRENT_DAYS: 7,
}