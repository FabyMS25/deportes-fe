export const UserRoles = {
    CONTRIBUYENTE: 'Contribuyente',
    REPRESENTANTE: 'Representante',
    ENCARGADO: 'Encargado',
    ADMIN: 'Admin'
} as const;
export type UserRoleName = typeof UserRoles[keyof typeof UserRoles];

const UserRole = [
    {
        "tipo":0,
        "id": "ADMINISTRADOR",
        "name": UserRoles.ADMIN,
        "institucion":"GAMQ DEPORTES",
        "avatarF":"avatar-super-w.png",
        "avatarM":"avatar-super-m.png"
    },
    {
        "tipo": 1,
        "id": "ENCARGADO",
        "name": UserRoles.ENCARGADO,
        "institucion":"GAMQ DEPORTES",
        "avatarF":"avatar-admin-w.png",
        "avatarM":"avatar-admin-m.png"
    },
    {
        "tipo": 2,
        "id": "CONTRIBUYENTE",
        "name": UserRoles.CONTRIBUYENTE,
        "institucion":"GAMQ DEPORTES",
        "avatarF":"avatar-op-w.png",
        "avatarM":"avatar-op-m.png"
    },
    {
        "tipo": 3,
        "id": "REPRESENTANTE",
        "name": UserRoles.REPRESENTANTE,
        "institucion":"GAMQ DEPORTES",
        "avatarF":"avatar-op-w.png",
        "avatarM":"avatar-op-m.png"
    }
]

const UserStatus = [
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
        "state": "Locked",//account is temporarily locked due to multiple failed login attempts. 
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

export{ UserRole , UserStatus , UserGender, UserCivilStatus, UserDocType};
