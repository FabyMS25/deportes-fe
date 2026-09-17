import { Gestion } from "./gestion.model";
import { Position } from "./Position.model";
export interface GestionPosition
 {
    uuid: string,
    gestionDto: Gestion,
    cargoDto: Position,
    estado: boolean,
    designacionFuncionarioDtos: string[],
}