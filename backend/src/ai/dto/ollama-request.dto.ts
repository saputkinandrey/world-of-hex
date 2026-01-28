import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Состояние NPC, которое вы отправляете Ollama
 */
class MessageDto {
    @IsString()
    role: string; // "user" | "assistant" | "system"

    @IsString()
    content: string; // сообщение
}

export class OllamaRequestDto {
    @IsString()
    protocol_version = '1.0';

    @IsString()
    npc_id: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MessageDto)
    npc_state: MessageDto[]; // наш «known_info»

    @IsString()
    request: 'tactical' | 'strategic';

    @IsOptional()
    @IsArray()
    environment?: string[];

    @IsOptional()
    @ValidateNested()
    metadata?: Record<string, unknown>;

    /**
     * Параметры, которые могут пригодиться
     */
    @IsOptional()
    @IsString()
    language?: string;
}
