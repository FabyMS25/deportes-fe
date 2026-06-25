export const CityAcronym = [
    { id:1 , acronym:"CH", value:"CHUQUISACA" },
    { id:2 , acronym:"LP", value:"LA PAZ" },
    { id:3 , acronym:"CB", value:"COCHABAMBA" },
    { id:4 , acronym:"OR", value:"ORURO"  },
    { id:5 , acronym:"PT", value:"POTOSI" },
    { id:6 , acronym:"TJ", value:"TARIJA"  },
    { id:7 , acronym:"SC", value:"SANTA CRUZ" },
    { id:8 , acronym:"BN", value:"BENI" },
    { id:9 , acronym:"CO", value:"COBIJA" },
    // { "id":"9", "acronym": "PN",  "description": "PANDO" }
] 

export function getCityAcronym(expedido: string | number | null | undefined): string {
    if (expedido === null || expedido === undefined) {
        return '';
    }

    const normalizedValue = String(expedido).trim().toUpperCase();
    const city = CityAcronym.find(item =>
        item.acronym === normalizedValue ||
        item.value === normalizedValue ||
        String(item.id) === normalizedValue
    );

    return city?.acronym ?? normalizedValue;
}

export const Districts =
[
    {value:'Distrito 1', label:'(Tacata)', area:'Ámbito urbano', comprende: 'las zonas de Sapenco y Tacata.'},
    {value:'Distrito 2', label:'(Piñami)', area:'Ámbito urbano', comprende: 'Iquircollo Central.'},
    {value:'Distrito 3', label:'(Santo Domingo)', area:'Ámbito urbano', comprende: 'los sectores Purgatorio, Cota, Santo Domingo y Sapenco.'},
    {value:'Distrito 4', label:'(La Chulla)', area:'Ámbito rural-urbano', conprende: 'las comunidades de Paucarpata, Illataco, La Chulla, Esmeralda e Ironcollo.'},
    {value:'Distrito 5', label:'(Pandoja - Piñami)', area:'Ámbito urbano-rural', comprende: 'las comunidades de Pandoja, Piñami, Pojpocollo, Barrio Minero y Esquilan.'},
    {value:'Distrito 6', label:'(Urkupiña)', area:'Ámbito rural-urbano', comprende: 'las comunidades de Caico Alto, Molle Molle, Cotapachi y Urkupiña.'},
    {value:'Distrito 7', label:'(Bella Vista)', area:'Ámbito rural', comprende: 'las comunidades de Potrero, Bella Vista, Falsuri y Marquina.'},
    {value:'Distrito 8', label:'(El Paso)', area:'Ámbito rural-urbano', comprende: 'Las comunidades de Chocaya, Molle Molle, Urinzaya, Aranzaya, Pihusi, Apote, Mosoj Rancho,Okhosuru, Pandoja, Chojñacollo, Khorapata, Callajchullpa, Llaukenquiri, Totorcahua, Águila Rancho y El Paso.'},
    {value:'Distrito 9', label:'(Misicuni)',area: 'Ámbito rural-cordillera', comprende: 'todas las comunidades situadas en la Cordillera, con escasa densidad poblacional y accesibilidad.'},
    {value:'Distrito 10', label:'(Ámbito urbano)'}
]
