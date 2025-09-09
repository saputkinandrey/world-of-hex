import { HttpException, HttpStatus } from '@nestjs/common';

export class OllamaException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_GATEWAY) {
    super({ message, error: 'Ollama' }, status);
  }
}
