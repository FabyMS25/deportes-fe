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

    /* RUAT CREDENTIALS TEST */
    // apiRuatUrl: "https://consolidacionjboss.ruat.gob.bo", 
    // RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    // RUAT_clave: "S1234567",
    // RUAT_codigoUsuario: "PRUEBAS_1.QUI", 
    // RUAT_passwordUsuario: "Ruat_123$",
    /* RUAT CREDENTIALS PRODUCTION */
    apiRuatUrl: "https://aplicaciones.ruat.gob.bo",
    RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    RUAT_clave: "Gam#1209",
    RUAT_codigoUsuario: "ERODRIGUEZ2.QUI", 
    
    RUAT_token : `${sessionStorage.getItem('ruatToken')}`,  
    RUAT_codigoAlcaldia: "QUI",
    RUAT_motivo: "REGISTRO TASAS Y OTROS INGRESOS",
    RUAT_servicioMunicipal: "2174",// "2174", 
    RUAT_tipoTasa: "TO", 

    /* RULES */
    VALID_HOURS : 4, // Hours to complete payment
    // ANTICIPATION_PUNTUAL_HOURS : 48, // Minimum advance booking for puntual (por_hora, por_persona)
    // ANTICIPATION_EVENT_HOURS : 168, // 7 days in hours for events
    // ANTICIPATION_EVENT_DAYS : 7, // 7 days in hours for events
    // ANTICIPATION_RECURRENT_DAYS : 15, // Days in advance for recurrent

  /* ==================== DURATION LIMITS ==================== */
    // MAX_DURATION_PUNTUAL_DEFAULT : 5, // Default max hours for puntual auto-approval
    // MAX_DURATION_EVENT : 12, // Maximum duration for events
}