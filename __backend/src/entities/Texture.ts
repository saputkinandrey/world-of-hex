import {Example} from "tsoa"
import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm"
import {ITexture, TextureTypes} from "../../../common/interfaces/ITexture";

@Entity('textures')
export class TextureEntity extends BaseEntity implements ITexture {
  @PrimaryGeneratedColumn('uuid')
  @Example('ed8d80b3-2f2f-4d23-a753-e1837b709d14')
    id?: string

  @Column('varchar')
  @Example('hex')
    type: TextureTypes = TextureTypes.Hex

  setType(type: TextureTypes) {
    this.type = type
    return this;
  }

  @Column('varchar')
  @Example('grass texture 1')
    name = ''

  setName(name: TextureTypes) {
    this.name = name
    return this;
  }

  @Column({"type": "bytea", "nullable": false})
    image?: Buffer

  setImage(image: Buffer) {
    this.image = image
    return this;
  }

}
