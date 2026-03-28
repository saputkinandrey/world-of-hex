import { ApiProperty } from '@nestjs/swagger';
import { ShipSkillKey, ShipSkillsEntity } from './ship-skills.entity';
import { roll3d6UnderWithCrit, Roll3d6UnderWithCritResult } from '../../rps/utils/roll';
import { ShipType } from '../types/ship-type.type';

const idType = String;

export class ShipEntity {
    @ApiProperty({
        type: idType,
    })
    id: string;

    @ApiProperty()
    name: string;

    setName(name: string) {
        this.name = name;
        return this;
    }

    @ApiProperty()
    speed: number;

    setSpeed(speed: number) {
        this.speed = speed;
        return this;
    }

    @ApiProperty()
    type: ShipType;

    setShipType(shipType: ShipType) {
        this.type = shipType;
        return this;
    }

    @ApiProperty()
    skills: ShipSkillsEntity = new ShipSkillsEntity().setSeamanship(12).setTactics(10);

    rollSkill(skill: ShipSkillKey, modifier: number = 0): Roll3d6UnderWithCritResult {
        return roll3d6UnderWithCrit(this.skills[skill] + modifier);
    }

    resolveStartSpeed(seamanshipRoll: Roll3d6UnderWithCritResult) {
        if (seamanshipRoll.isCritSuccess) {
            return this.speed;
        }
        if (seamanshipRoll.isCritFailure) {
            return 0;
        }

        const averageSpeed = this.speed / 2;
        const nextSpeed = Math.floor(averageSpeed * (1 + seamanshipRoll.mos * 0.1));
        return Math.min(this.speed, Math.max(0, nextSpeed));
    }

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty()
    deletedAt: Date;
}
