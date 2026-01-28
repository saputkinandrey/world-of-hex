import { ShipToEncounter } from '../../schemas/encounter.schema';
import Vector from 'vector2js';

export class ShipsCollisionDto {
    ships: ShipToEncounter[];

    position: Vector;
}
