import { Injectable } from '@nestjs/common';
import { TerminalWorldEventError } from '../errors/world-event.errors';
import { WorldEventHandler } from '../handlers/world-event-handler.interface';

@Injectable()
export class WorldEventHandlerRegistryService {
    private readonly handlers = new Map<string, WorldEventHandler>();

    register(handler: WorldEventHandler) {
        const key = this.key(handler.type, handler.schemaVersion);
        if (this.handlers.has(key)) {
            throw new Error(`World event handler already registered for ${key}`);
        }
        this.handlers.set(key, handler);
    }

    get(type: string, schemaVersion: number): WorldEventHandler {
        const handler = this.handlers.get(this.key(type, schemaVersion));
        if (!handler) {
            throw new TerminalWorldEventError(
                'unknown_handler',
                `No world event handler registered for ${type}@${schemaVersion}`,
            );
        }
        return handler;
    }

    private key(type: string, schemaVersion: number) {
        return `${type}@${schemaVersion}`;
    }
}
