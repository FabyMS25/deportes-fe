export const GlobalComponent = {
    // Api Calling
    API_URL : 'http://127.0.0.1:3000/',
    headerToken : {'Authorization': `Bearer ${sessionStorage.getItem('token')}`},

    //Ruat Data Prueba
    RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    RUAT_clave: "fIH1z30a1SpB",
    RUAT_codigoAlcaldia: "QUI",
    RUAT_servicioMunicipal: "2174", //TASAS Y OTROS INGRESOS
    RUAT_tipoTasa: "TO", //TASAS Y OTROS INGRESOS
    RUAT_motivo: "REGISTRO TASAS Y OTROS INGRESOS",

    // Api backend Calling:
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