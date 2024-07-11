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

const UserDocType = [
    {
        "type":"CI",
        "description": "Carnet de Identidad",
    },
    {
        "type": "CE",
        "description": "Carnet de Extranjero",
    }
]


const UserCivilStatus = [
    {
        "type":"SO",
        "description": "Soltero(a)",
    },
    {
        "type": "CA",
        "description": "Casado(a)",
    },
    {
        "type": "VI",
        "description": "Ciudo(a)",
    },
    {
        "type": "DI",
        "description": "Divorciado(a)",
    }
]

export{ UserRol , UserStates , UserCivilStatus, UserDocType};
