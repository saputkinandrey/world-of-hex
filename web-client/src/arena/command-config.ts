import type { CommandKind, IndividualDirectiveKind } from "./model";


export const COMMAND_LABELS: Record<CommandKind, string> = {
    await_orders: "Ждать приказа",
    advance: "Сблизиться",
    press: "Натиск",
    hold: "Держать строй",
    withdraw: "Отходить",
};

export const INDIVIDUAL_DIRECTIVE_LABELS: Record<IndividualDirectiveKind, string> = {
    regroup: "\u0412\u0435\u0440\u043d\u0438\u0441\u044c \u0432 \u0441\u0442\u0440\u043e\u0439",
};

export const POOR_ORDER_COMPLIANCE_RATIO = 0.6;

export const ORDER_ASSESSMENT_VALID_ROUNDS = 3;

export const MIN_COMMAND_DELAY_ROUNDS = 2;

export const MAX_COMMAND_DELAY_ROUNDS = 6;

export const ORDER_DURATION_ROUNDS = MAX_COMMAND_DELAY_ROUNDS * 2;

export const INDIVIDUAL_DIRECTIVE_DURATION_ROUNDS = 4;

export const FOCUS_DURATION_ROUNDS = 2;

export const getCommandPlanningDelay = (tacticsSkill: number): number =>
    Math.max(
        MIN_COMMAND_DELAY_ROUNDS,
        Math.min(
            MAX_COMMAND_DELAY_ROUNDS,
            10 - Math.floor(tacticsSkill / 2),
        ),
    );
