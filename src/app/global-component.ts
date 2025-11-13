export const GlobalComponent = {
    /* STORAGE KEYs */
    USER_KEY: 'currentUser',
    TOKEN_KEY: 'auth-token',    
    headerToken : {'Authorization': `Bearer ${sessionStorage.getItem('token')}`},
    // RUAT_token : `${sessionStorage.getItem('ruatToken')}`,

    /* APP DETAILS */
    CODE_APP : "SIS-013",
    NAME_APP : "DEPORTESAPP",
    ADMIN_MENU:'Administración',

    super_admin:{
        username:'faby25',
        password:'password',
        whatsApp:'+59172248669',
        email:'moralessfaby.dev@gmail.com'
    },
    admin_deportes:{
        role:'Aministrador',
        avatar:'default-profile1.png',
        name:'Pedro Luis Sevilla Calderón',
        phone:'60367407',
        email: 'gamqtdi@gmail.com',
        address: 'Mercado Martín Cárdenas, Planta Baja, Quillacollo'
    },

    /* RUAT CREDENTIALS PRODUCTION */
    // apiRuatUrl: "https://aplicaciones.ruat.gob.bo",
    RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    RUAT_clave: "Gam#1209",
    RUAT_codigoUsuario: "ERODRIGUEZ2.QUI",
    /* RUAT CREDENTIALS TEST */
    // apiRuatUrl: "https://consolidacionjboss.ruat.gob.bo", 
    // RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    // RUAT_clave: "S1234567",
    // RUAT_codigoUsuario: "PRUEBAS_1.QUI", 
    // RUAT_passwordUsuario: "Ruat_123$",
      
    RUAT_codigoAlcaldia: "QUI",
    // RUAT_motivo: "REGISTRO TASAS Y OTROS INGRESOS",
    // RUAT_servicioMunicipal: "2174", 
    // RUAT_tipoTasa: "TO", 
}