export const GlobalComponent = {
    
    URL : 'http://deportes-gamq.gob.bo/',
    headerToken : {'Authorization': `Bearer ${sessionStorage.getItem('token')}`},

    admin_deportes:{
        role:'Aministrador',
        avatar:'default-profile1.png',
        name:'Pedro Luis Sevilla Calderón',
        telf:'60367407',
    },

    /* RUAT CREDENTIALS TEST */
    apiRuatUrl: "https://verificacionjboss.ruat.gob.bo", 
    RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    RUAT_clave: "fIH1z30a1SpB",
    /* RUAT CREDENTIALS PRODUCTION */
    // apiRuatUrl: "https://aplicaciones.ruat.gob.bo" 
    // RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    // RUAT_clave: "Gam#1209",

    /* RUAT DATA */
    RUAT_token : `${sessionStorage.getItem('ruatToken')}`,  
    RUAT_codigoUsuario: "ERODRIGUEZ2.QUI",
    RUAT_codigoAlcaldia: "QUI",
    RUAT_motivo: "REGISTRO TASAS Y OTROS INGRESOS",
    RUAT_servicioMunicipal: "2174", //TASAS Y OTROS INGRESOS
    RUAT_tipoTasa: "TO", //TASAS Y OTROS INGRESOS

    
    /* Api backend Calling */
    CODE_APP : "SIS-013",
    API_URL : 'http://181.177.143.185:8081/api',
    VALID_HOURS: 4,
    facilities: '/complejos',
    fields: '/canchas',
    taxpayers: '/contribuyente',
    employees: '/encargado',
    categories: '/deportes',
    reservations: '/reservas',
    schedule:'/horario',
} 