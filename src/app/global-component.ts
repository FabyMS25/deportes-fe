export const GlobalComponent = {
    // Api Calling
    API_URL : 'http://127.0.0.1:3000/',
    headerToken : {'Authorization': `Bearer ${sessionStorage.getItem('token')}`},
    // Auth Api
    AUTH_API:"http://127.0.0.1:3000/auth/",

    RUAT_usuario: "SWTRAMITESURKUPINIAQUI",
    RUAT_clave: "fIH1z30a1SpB",

    // Categories Api
    cagtegorias:'/canchasDeporte',
    // orderId:'apps/order/',

    customer:'/horario',

    canchas: '/canchas',
    contribuyente: '/contribuyente',
    encargado: '/encargado',
    deporte: '/deportes',
    reservas: '/reservas',
}