import { ShipToEncounter } from '../../schemas/encounter.schema';
import Vector from 'vector2js';

export class ShipPathDto {
  ship: ShipToEncounter;

  path: Vector[];

  currentStep: number;
  hasCollided: boolean = false;
}
