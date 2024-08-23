export const GlobalComponent = {
    
    URL : 'http://deportes-gamq.gob.bo/',
    headerToken : {'Authorization': `Bearer ${sessionStorage.getItem('token')}`},

    // RUAT_token : {'Authorization': `Bearer ${sessionStorage.getItem('ruatToken')}`}, 
    RUAT_token : `${sessionStorage.getItem('ruatToken')}`, 
    //Ruat Data Prueba
    apiRuatUrl: "https://verificacionjboss.ruat.gob.bo", //test
    // RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    // RUAT_clave: "fIH1z30a1SpB",

    //Ruat Data Produccion
    // apiRuatUrl: "https://aplicaciones.ruat.gob.bo" //Prod
    RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    RUAT_clave: "Gam#1209",
    
    RUAT_codigoUsuario: "ERODRIGUEZ2.QUI",
    RUAT_codigoAlcaldia: "QUI",
    RUAT_servicioMunicipal: "2174", //TASAS Y OTROS INGRESOS
    RUAT_tipoTasa: "TO", //TASAS Y OTROS INGRESOS
    RUAT_motivo: "REGISTRO TASAS Y OTROS INGRESOS",

    
    // Api backend Calling:
    CODE_APP : "SIS-013",
    API_URL : 'http://181.177.143.185:8081/api',
    complejos: '/complejos',
    camposDeportivos: '/canchas',
    contribuyente: '/contribuyente',
    encargado: '/encargado',
    categorias: '/deportes',
    reservas: '/reservas',
    horarios:'/horario',
    categoriasCampos:'/canchasDeporte',
    // orderId:'apps/order/',
} 