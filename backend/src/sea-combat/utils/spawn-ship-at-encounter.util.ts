import { AllDirections, DirectionToVectorOdd } from '../types/direction.type';
import { randomChoice, rollXd } from '../../utils/roll';

export const spawnShipAtEncounter = (radius: number) => {
  return DirectionToVectorOdd[randomChoice(AllDirections)]
    .mulScalar(radius)
    .rotateDegrees(rollXd(360))
    .apply((dim) => Math.round(dim));
};
