import {
  IsString,
  IsNumber,
  IsObject,
  IsArray,
  IsOptional,
  IsIn,
} from 'class-validator';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';

import { DecisionType } from '../enums/decision-type.enum';

export class OllamaDecisionDto {
  @IsString()
  npc_id: string;

  @IsString()
  @IsIn(Object.values(DecisionType), {
    message: `decision_type must be one of ${Object.values(DecisionType).join(', ')}`,
  })
  decision_type: DecisionType;

  @IsNumber()
  confidence: number; // 0‑1

  @IsString()
  explanation: string;

  @IsOptional()
  @IsObject()
  additional_info?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  errors?: string[];
}

export const OllamaDecisionSchema = validationMetadatasToSchemas();
