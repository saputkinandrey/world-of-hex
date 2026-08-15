import {
    type AdvantageId,
    type DisadvantageId,
} from "../../src/arena/fighter-generation";
import {
    type HexCoord,
    type ManeuverKind,
    type CartesianPoint,
} from "../../src/arena/model";
export { COMMAND_LABELS } from "../../src/arena/communication";

const SQRT_3 = Math.sqrt(3);

export const HEX_SIZE = 18;

export const ROUND_DURATION_MS = 1000;

export const INITIAL_ARENA_SEED = 43117;

export const MANEUVER_LABELS: Record<ManeuverKind, string> = {
    do_nothing: "Бездействие",
    concentrate: "Концентрация",
    move: "Движение",
    attack: "Атака",
    move_and_attack: "Движение и атака",
    all_out_attack: "Полная атака",
    all_out_defense: "Полная защита",
    evaluate: "Оценка",
    wait: "Ожидание",
};

export const MANEUVER_GLYPHS: Record<ManeuverKind, string> = {
    do_nothing: "—",
    concentrate: "C",
    move: "M",
    attack: "A",
    move_and_attack: "MA",
    all_out_attack: "AA",
    all_out_defense: "AD",
    evaluate: "E",
    wait: "W",
};

export const VISIBLE_MANEUVERS: ManeuverKind[] = [
    "concentrate",
    "move",
    "attack",
    "move_and_attack",
    "all_out_attack",
    "all_out_defense",
    "evaluate",
    "wait",
    "do_nothing",
];

export const ADVANTAGE_LABELS: Record<AdvantageId, string> = {
    combat_reflexes: "Боевые рефлексы",
    high_pain_threshold: "Высокий болевой порог",
    peripheral_vision: "Периферическое зрение",
    fit: "Хорошая форма",
    flexibility: "Гибкость",
    penetrating_voice: "Лужёная глотка",
};

export const DISADVANTAGE_LABELS: Record<DisadvantageId, string> = {
    overconfidence: "Самоуверенность",
    impulsiveness: "Импульсивность",
    cowardice: "Трусость",
    stubbornness: "Упрямство",
    code_of_honor: "Кодекс чести",
    duty: "Долг перед кастой",
};

export const toPixel = (coord: HexCoord, size: number): CartesianPoint => ({
    x: size * 1.5 * coord.q,
    y: size * SQRT_3 * (coord.r + coord.q / 2),
});

export const buildHexPoints = (center: CartesianPoint): string => {
    const points: string[] = [];

    for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI / 180) * 60 * index;
        points.push(
            `${(center.x + HEX_SIZE * Math.cos(angle)).toFixed(2)},${(
                center.y +
                HEX_SIZE * Math.sin(angle)
            ).toFixed(2)}`,
        );
    }

    return points.join(" ");
};
