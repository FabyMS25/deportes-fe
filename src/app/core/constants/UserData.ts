const UserRol = [
    {
        "tipo":0,
        "id": "ADMINISTRADOR",
        "institucion":"GAMQ DEPORTES",
        "avatarF":"avatar-super-w.png",
        "avatarM":"avatar-super-m.png"
    },
    {
        "tipo": 1,
        "id": "ENCARGADO",
        "institucion":"GAMQ DEPORTES",
        "avatarF":"avatar-admin-w.png",
        "avatarM":"avatar-admin-m.png"
    },
    {
        "tipo": 2,
        "id": "CONTRIBUYENTE",
        "institucion":"GAMQ DEPORTES",
        "avatarF":"avatar-op-w.png",
        "avatarM":"avatar-op-m.png"
    }
]

const UserStates = [
    {
        "id":0,
        "state": "Pendiente",
    },
    {
        "id": 1,
        "state": "Activo",
    },
    {
        "id": 2,
        "state": "Bloqueado",
    },
    {
        "id": 3,
        "state": "Inactivo",
    },
    {
        "id": 4,
        "state": "Baja",
    },
    {
        "id": 6,
        "state": "Locked",//The account is temporarily locked due to multiple failed login attempts. 
    }
]

const UserGender = [
    {
        "id":"F",
        "description": "FEMENINO",
    },
    {
        "id": "M",
        "description": "MASCULINO",
    }
]


const UserCivilStatus = [
    {
        "type":"SO",
        "description": "SOLTERO(A)",
    },
    {
        "type": "CA",
        "description": "CASADO(A)",
    },
    {
        "type": "VI",
        "description": "VIUDO(A)",
    },
    {
        "type": "DI",
        "description": "DIVORCIADO(A)",
    }
]

const UserDocType = [
    {
        "type":"CI",
        "description": "CEDULA DE IDENTIDAD",
    },
    {
        "type": "CE",
        "description": "CARNET DE EXTRANJERO",
    }
]

export{ UserRol , UserStates , UserGender, UserCivilStatus, UserDocType};
