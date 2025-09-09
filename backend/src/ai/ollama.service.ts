import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  OllamaDecisionDto,
  OllamaDecisionSchema,
} from './dto/ollama-decision.dto';
import { DecisionType } from './enums/decision-type.enum';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl: string;
  private readonly ollamaEndpoint: string;
  private readonly ollamaModel: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.ollamaModel = this.config.get<string>('OLLAMA_MODEL', 'gpt-oss:20b');
    this.ollamaUrl = this.config.get<string>(
      'OLLAMA_HOST',
      'http://127.0.0.1:11434',
    );
  }

  /**
   * Подготовка prompt и вызов Ollama.
   */
  async getDecision(
    npcId: string,
    context: string, // «что происходит сейчас», «чего ожидает NPC» и т.д.
    allowed: DecisionType[],
  ): Promise<OllamaDecisionDto> {
    const prompt = `
      Ты - ИИ, помогающий NPC принимать решения.
      Варианты действий: ${allowed.join(', ')}.
      Ответ должен быть строго в формате JSON, совпадающем с этой схемой:
      
      ${JSON.stringify(OllamaDecisionSchema, null, 2)}

      Учитывая контекст: ${context}
      Выбери действие и объясни свой выбор. Если ошибка – заполни поле errors.
    `;

    this.logger.debug(`Prompt for ${npcId}: ${prompt.slice(0, 120)}…`);

    const body = {
      model: this.ollamaModel, // или какой‑то другой, который у вас есть
      prompt,
      format: 'json', // *Ollama*‑специфичная опция: отдаёт только JSON
      stream: false, // не стримим
    };

    const url = `${this.ollamaUrl}/api/generate`;
    const { data } = await firstValueFrom(
      this.http.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // data.message содержит JSON‑строку (или объект, в зависимости от версии)
    const raw = typeof data === 'string' ? JSON.parse(data) : data;
    return raw as OllamaDecisionDto;
  }
}
