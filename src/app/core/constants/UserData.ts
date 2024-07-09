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
        "state": "Pending",
    },
    {
        "id": 1,
        "state": "Active",
    },
    {
        "id": 2,
        "state": "Blocked",
    },
    {
        "id": 3,
        "state": "Inactive",
    },
    {
        "id": 4,
        "state": "Closed",
    },
    {
        "id": 5,
        "state": "Password Reset Required",
    },
    {
        "id": 6,
        "state": "Locked",//The account is temporarily locked due to multiple failed login attempts. 
    }
]

export{ UserRol , UserStates};
