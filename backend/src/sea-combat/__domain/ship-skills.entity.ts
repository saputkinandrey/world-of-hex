import { ApiProperty } from '@nestjs/swagger';

const idType = String;

export class ShipSkillsEntity {
  @ApiProperty({
    type: idType,
  })
  id: string;

  @ApiProperty()
  shipId: string;

  @ApiProperty()
  seamanship: number;

  setSeamanship(value: number) {
    this.seamanship = value;
    return this;
  }

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date;
}
