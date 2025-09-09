import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { OllamaDecisionDto } from './ollama-decision.dto';

export class OllamaResponseDto {
  /**
   * Если Ollama отдаёт только одно решение:
   *   { decision: { … } }
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => OllamaDecisionDto)
  decision?: OllamaDecisionDto;

  /**
   * Или массив решений (например, для группы NPC):
   *   { decisions: [ … ] }
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OllamaDecisionDto)
  decisions?: OllamaDecisionDto[];

  /**
   * Поля, которые иногда Ollama может вернуть в ошибках
   */
  @IsOptional()
  @IsArray()
  errors?: string[];
}
