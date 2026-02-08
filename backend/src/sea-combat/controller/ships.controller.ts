import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { ShipRepository } from '../repositories/ship.repository';
import { PlayerRepository } from '../../player/repositories/player.repository';
import { PostNewShipBodyDto } from '../dto/ships/post-new-ship-body.dto';

// @ApiBearerAuth()
// @Roles(RoleEnum.admin)
// @UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Sea-Combat-Ships')
@Controller({
    path: 'sea-combat/ships',
    // version: '1',
})
export class ShipsController {
    constructor(
        private readonly shipRepository: ShipRepository,
        private readonly playerRepository: PlayerRepository,
    ) {}

    @Post()
    postNewShip(@Body() body: PostNewShipBodyDto) {
        return this.shipRepository
            .create({
                name: body.name,
                type: body.type,
                speed: 5,
                tactics: body.tactics ?? 10,
            })
            .then((res) => res.toJSON());
    }

    @Get('list')
    getList() {
        return this.shipRepository
            .find({}, {}, { sort: { createdAt: -1 } })
            .then((result) => {
                return result.map((document) => document.toJSON());
            });
    }

    @Delete(':shipId')
    async deleteShip(@Param('shipId') shipId: string) {
        const ship = await this.shipRepository.findOneById(shipId);
        if (!ship) {
            throw new NotFoundException(`Ship with id ${shipId} not found`);
        }
        await this.shipRepository.deleteById(shipId);
        await this.playerRepository.removeShipFromAll(shipId);
    }
}
