import { ActorStateStrategy } from '../../actor/actor-activity';
import { ActorEntity } from '../../actor/actor.entity';

/**
 * Стратегия сна.
 *
 * Здесь мы:
 *  - во время сна постепенно восстанавливаем REST, снижаем STRESS;
 *  - по окончании сна переводим актора в idle.
 *
 * Конкретная математика восстановления — на твоей совести,
 * здесь только каркас.
 */
export const SleepState: ActorStateStrategy = {
    remainingSeconds: 0,
    id: 'sleep',

    onEnter(actor: ActorEntity, durationSeconds: number): void {
        // Здесь можно выставить позу сна из профиля существа.
        // Например:
        //
        // const profile = actor.profile; // CreatureTemplateEntity
        // if (profile.sleepPostureTag) {
        // 	actor.setPosture(profile.sleepPostureTag);
        // }
        //
        // state.remainingSeconds = durationSeconds; — ActorEntity сделает это сам.
    },

    advance(actor: ActorEntity, deltaSeconds: number): boolean {
        if (deltaSeconds <= 0) return false;

        // 1) Тратим "время сна"
        const dt = Math.min(deltaSeconds, this.remainingSeconds);
        this.remainingSeconds -= dt;

        // 2) Восстанавливаем REST/снижаем STRESS.
        // Здесь должна быть твоя логика нужд, пример псевдокода:
        //
        // actor.needs.restoreRest(dt);
        // actor.needs.reduceStress(dt);
        //
        // метаболизм во сне можно сделать более "экономичным":
        // actor.metabolism.advanceDuringSleep(dt);

        // 3) Считаем, нужно ли завершать сон.
        const timeOver = this.remainingSeconds <= 0;

        // Можно также завершать сон раньше, если REST уже в норме:
        // const restOk = actor.needs.isRestSatisfied();
        // return timeOver || restOk;

        return timeOver;
    },

    onExit(actor: ActorEntity): void {
        // Здесь можно "разбудить" — выставить позу "на ногах" и т.п.
        // const profile = actor.profile;
        // if (profile.idlePostureTag) {
        // 	actor.setPosture(profile.idlePostureTag);
        // }
    },
};

/**
 * Стратегия еды.
 *
 * Предполагается, что сама "нагрузка" еды (ingest) произошла при входе
 * в состояние (через экшен EAT), а здесь мы просто позволяем
 * организму переваривать еду во времени, если хочешь это моделировать.
 */
export const EatState: ActorStateStrategy = {
    remainingSeconds: 0,
    id: 'eat',

    onEnter(actor: ActorEntity, durationSeconds: number): void {
        // Здесь можно сделать что-то вроде:
        // actor.setPosture(actor.profile.eatPostureTag ?? actor.profile.idlePostureTag);
    },

    advance(actor: ActorEntity, deltaSeconds: number): boolean {
        if (deltaSeconds <= 0) return false;

        const dt = Math.min(deltaSeconds, this.remainingSeconds);
        this.remainingSeconds -= dt;

        // Псевдологика: переваривание, чуть-чуть восстановления FOOD,
        // перераспределение энергии и т.п.
        //
        // actor.metabolism.advanceDuringEating(dt);
        //
        // Завершаем, когда время приёма пищи закончилось:
        return this.remainingSeconds <= 0;
    },
};

/**
 * Стратегия питья.
 */
export const DrinkState: ActorStateStrategy = {
    remainingSeconds: 0,
    id: 'drink',

    advance(actor: ActorEntity, deltaSeconds: number): boolean {
        if (deltaSeconds <= 0) return false;

        const dt = Math.min(deltaSeconds, this.remainingSeconds);
        this.remainingSeconds -= dt;

        // Псевдологика перераспределения жидкости:
        // actor.metabolism.advanceDuringDrinking(dt);
        //
        return this.remainingSeconds <= 0;
    },
};
