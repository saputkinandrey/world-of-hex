// rps/world/vision.helpers.ts

import type { HexEntity } from "./hex.entity";
import {ActorEntity} from "./actor/actor.entity";

/**
 * Range penalty по мотивам GURPS Size and Speed/Range Table.
 *
 * В GURPS SSR используется степенная шкала:
 *   index ≈ round(6 * log10(range))
 *   penalty = -index
 *
 * Здесь rangeYards ≈ количество гексов (1 гекс ~ 1 ярд).
 */
export function getRangePenaltySSR(rangeYards: number): number {
    const d = Math.max(1, rangeYards); // 0 и дроби не нужны, минимум 1 ярд
    const index = Math.round(6 * Math.log10(d));
    return -index;
}

export interface VisionRollParams {
    /** Базовое Per существа. */
    per: number;

    /** Бонусы остроты зрения (GURPS Acute Vision и подобные). */
    acuteVisionMod?: number;

    /**
     * Модификатор сложности задачи:
     *   +10 — «проще некуда» (увидеть вообще что-нибудь),
     *    0  — обычная задача,
     *   −N  — сложнее.
     */
    taskDifficultyMod?: number;

    /**
     * Сводный модификатор среды:
     * освещение, контраст, туман и т.п.
     * Можно заранее суммировать в один envMod.
     */
    envMod?: number;

    /**
     * SM цели (size modifier по GURPS):
     *   0  — человекоподобный объект,
     *  +N  — крупнее, −N — мельче.
     */
    targetSM: number;
}

/**
 * Максимальная дистанция (в гексах/ярдах), на которой
 * Vision-ролл против конкретной цели будет **автоматическим успехом**
 * по правилу:
 *
 *   если skill >= 16 → автоуспех.
 *
 * Как мы считаем:
 *
 *   skill = Per + AcuteVision + taskMod + envMod + targetSM + rangePenalty
 *
 * Хотим:
 *   skill >= 16
 * ⇒ rangePenalty >= 16 - (Per + AcuteVision + taskMod + envMod + targetSM)
 *
 * Обозначим:
 *   B = Per + AcuteVision + taskMod + envMod + targetSM
 *   p_req = 16 - B  (минимально допустимое значение rangePenalty)
 *
 * rangePenalty всегда ≤ 0.
 * Если p_req > 0  → ни при какой дистанции автоуспеха нет.
 * Если p_req <= 0 → находим max range, где rangePenalty(range) >= p_req.
 *
 * Используем связи GURPS SSR:
 *   index ≈ round(6 * log10(rangeYards))
 *   rangePenalty ≈ -index
 *
 * Приближённо:
 *   index_max = floor(-p_req)
 *   range_max ≈ 10^(index_max / 6)
 */
export function getAutoSuccessVisionDistanceHexes(params: VisionRollParams): number {
    const {
        per,
        acuteVisionMod = 0,
        taskDifficultyMod = 0,
        envMod = 0,
        targetSM,
    } = params;

    // Эффективная "база" до учёта дальности:
    const B = per + acuteVisionMod + taskDifficultyMod + envMod + targetSM;

    // Требуемое значение rangePenalty, при котором skill >= 16:
    //   B + rangePenalty >= 16  → rangePenalty >= 16 - B
    const pReq = 16 - B;

    // Если pReq > 0 → нам нужна "положительная" penalty, что невозможно,
    // значит, автоуспеха не будет ни при какой реальной дистанции.
    if (pReq > 0) {
        return 0;
    }

    // pReq ≤ 0, penalties в GURPS дискретные целыми шагами.
    // rangePenalty = -index, index >= 0.
    // Условие:
    //   -index >= pReq  → index <= -pReq
    const indexMax = Math.floor(-pReq);

    // Инвертируем SSR-формулу:
    //   index ≈ 6 * log10(range)  → range ≈ 10^(index / 6)
    const rangeYards = Math.pow(10, indexMax / 6);

    // В нашей модели 1 гекс ~ 1 ярд
    const rangeHexes = Math.floor(rangeYards);

    // На всякий случай: минимум 0 (если вдруг математика дала <1)
    return Math.max(0, rangeHexes);
}



/**
 * Координаты гекса в axial-формате (q, r).
 * Предполагаем, что в HexEntity есть что-то такое.
 */
export interface HexCoordLike {
    q: number;
    r: number;
}

/**
 * Из HexEntity достаём его axial-координаты.
 * Если у тебя другое поле — поменяй реализацию здесь.
 */
export function getHexCoord(hex: HexEntity): HexCoordLike {
    // Например, если у тебя hex.coord: { q, r }:
    const coord = (hex as any).coord;
    if (!coord || typeof coord.q !== "number" || typeof coord.r !== "number") {
        throw new Error(
            `[vision] HexEntity не содержит coord {q,r}. ` +
            `Проверь структуру HexEntity.`,
        );
    }
    return coord as HexCoordLike;
}

/**
 * Расстояние между гексами в axial-координатах.
 * Классическая формула для гекса:
 *
 *  d = (|dq| + |dr| + |ds|) / 2
 *  где s = -q-r
 */
export function hexDistance(a: HexCoordLike, b: HexCoordLike): number {
    const dq = a.q - b.q;
    const dr = a.r - b.r;
    const ds = (-a.q - a.r) - (-b.q - b.r);
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

/**
 * Модификаторы видимости в духе GURPS:
 * - lightingMod    — модификатор за освещение (GURPS: -1, -2, ...);
 * - contrastMod    — за контраст цели/фона;
 * - fogMod         — туман/дым;
 * - miscMod        — любые прочие.
 *
 * Все эти модификаторы просто суммируются.
 */
export interface VisionEnvModifiers {
    lightingMod?: number;
    contrastMod?: number;
    fogMod?: number;
    miscMod?: number;
}

/**
 * Получить Per актора. Адаптируй под свой SecondaryAttributesEntity.
 */
export function getActorPer(actor: ActorEntity): number {
    const sec = (actor as any).secondary;
    if (sec && typeof sec.Per === "number") {
        return sec.Per;
    }
    return 10;
}

/**
 * Бонус Acute Vision (и подобных преимуществ) для актора.
 * Пока по умолчанию 0 — позже можно подвесить на преимущества/морфы.
 */
export function getActorAcuteVisionMod(actor: ActorEntity): number {
    // @TODO: интегрировать с системой преимуществ/морфов (Acute Vision).
    return 0;
}

/**
 * Максимальная дистанция автозамечания "чего-нибудь" (фон, движение и т.п.)
 * с учётом:
 *  - Per актора,
 *  - Acute Vision,
 *  - модификаторов среды,
 *  - SM цели (если знаем, кого ищем) или SM=0 для "типичной" цели.
 *
 * По умолчанию сложность задачи — "проще некуда" (+10).
 */
export interface ActorVisionEnv {
    lightingMod?: number;
    contrastMod?: number;
    fogMod?: number;
    miscMod?: number;

    /** Можно переопределить сложность задачи; по умолчанию +10. */
    taskDifficultyMod?: number;
}

export function getActorAutoVisionDistanceHexes(
    actor: ActorEntity,
    targetSM: number,
    env: ActorVisionEnv = {},
): number {
    const per = getActorPer(actor);
    const acute = getActorAcuteVisionMod(actor);

    const {
        lightingMod = 0,
        contrastMod = 0,
        fogMod = 0,
        miscMod = 0,
        taskDifficultyMod = 10, // "увидеть что-нибудь" — проще некуда
    } = env;

    const envMod = lightingMod + contrastMod + fogMod + miscMod;

    return getAutoSuccessVisionDistanceHexes({
        per,
        acuteVisionMod: acute,
        taskDifficultyMod,
        envMod,
        targetSM,
    });
}


/**
 * GURPS-подобная оценка максимальной дистанции видимости в гексах.
 *
 * Идея:
 *  - Per 10 в базовых условиях видит, скажем, до 7 гексов;
 *  - каждый +1 Per даёт примерно +1 гекс;
 *  - каждый -1 Per даёт -1 гекс;
 *  - модификаторы среды (освещение и т.д.) суммируются.
 *
 * Это НЕ точная копия GURPS Vision roll, но сохраняет интуицию:
 * лучше Per и условия → дальше видим.
 */
export function getMaxVisionDistanceHexes(
    actor: ActorEntity,
    env: VisionEnvModifiers = {},
): number {
    const per = getActorPer(actor);

    const basePer = 10;
    const baseRangeHexes = 7; // "дальность" при Per 10 в норме

    const perDelta = per - basePer;
    const envMod =
        (env.lightingMod ?? 0) +
        (env.contrastMod ?? 0) +
        (env.fogMod ?? 0) +
        (env.miscMod ?? 0);

    const raw = baseRangeHexes + perDelta + envMod;

    return Math.max(1, raw);
}

/**
 * Отфильтровать список гексов по видимости с точки зрения актора.
 *
 * Здесь пока:
 *  - игнорируем препятствия (стены, укрытия, туман);
 *  - используем только "по дальности" (range-based).
 *
 * Потом сюда можно добавить проверку линии видимости, высоты и т.п.
 */
export function getVisibleHexesForActor(
    actor: ActorEntity,
    originHex: HexEntity,
    allHexes: readonly HexEntity[],
    env: VisionEnvModifiers = {},
): HexEntity[] {
    const originCoord = getHexCoord(originHex);
    const maxDist = getMaxVisionDistanceHexes(actor, env);

    const result: HexEntity[] = [];

    for (const hex of allHexes) {
        const c = getHexCoord(hex);
        const dist = hexDistance(originCoord, c);
        if (dist <= maxDist) {
            result.push(hex);
        }
    }

    return result;
}
