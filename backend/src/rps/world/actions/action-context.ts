// world/actions/action-context.ts

import type { ActorEntity } from '../actor/actor.entity';
import { HexEntity } from '../hex.entity';

/**
 * Контекст выполнения экшена.
 *
 * Содержит:
 *  - ссылки на ключевые сущности (актор, гекс),
 *
 * Важно: экшен не лезет сам в геймлуп/репозитории, а работает через этот контракт.
 */
export interface ActionContext {
    /** Актор, который выполняет действие. */
    readonly actor: ActorEntity;

    /** Гекс, в котором сейчас находится актор. */
    readonly hex: HexEntity;
}
