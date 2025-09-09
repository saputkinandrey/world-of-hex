import { Transform } from 'class-transformer';
import { Prop } from '@nestjs/mongoose';
import { now, Types } from 'mongoose';

export class EntityDocumentHelper {
  @Prop({
    type: String,
    default: () => new Types.ObjectId(),
    required: true,
  })
  @Transform(
    ({ value }) => (value?.toHexString ? value.toHexString() : 'unknown'),
    {
      toClassOnly: true,
    },
  )
  public _id: string;

  @Prop({ default: now })
  createdAt?: Date;

  @Prop({ default: now })
  updatedAt?: Date;

  @Prop()
  deletedAt?: Date;
}
