import { PREGENERATED_FIGHTERS } from "@wohex/domain-data/rps/characters";
import {
    beginTurn,
    checkExertion,
    createCombatant,
    endTurn,
    getCombatStats,
    attackWeapon,
    spendFatigue,
    restoreManaWithEffort,
    type AttackMode,
    type Combatant,
    type DiceSource,
} from "@wohex/domain-data/rps/combat";
import { getEquipmentItem } from "@wohex/domain-data/rps/equipment";
import {
    cardDefinition,
    defaultAttack,
    readyAttack,
    canTargetVitalArea,
    eligibleStratagems,
    heldEquipment,
    readyWeapon,
} from "./cards";
import { shuffleCards } from "./deck";
import {
    activateEquipment,
    equipmentAvailability,
    validateAttachments,
} from "./equipment-actions";
import {
    replacementAvailability,
    replaceHandCard,
    formationTranslation,
} from "./tactics";
import { createArmor, resolveArmorImpact } from "./armor";
import {
    defenseSource,
    sourceCopies,
    freeCopies,
    suitableDefense,
    techniqueCopies,
} from "./commitments";
import { resolveExchange } from "./exchange";
import {
    ECHELONS,
    DECK_SIZE,
    MIN_THROW_DISTANCE,
    PILUM_SHIELD_COOLDOWN,
    INITIAL_HAND,
    GUARANTEED_STARTING_CARDS,
    type Availability,
    type CardDefinition,
    type Duel,
    type DuelAction,
    type Duelist,
    type DuelSetup,
    type HandCard,
    type Side,
    type PreparedAttack,
    type ExtraEffort,
} from "./types";

const TAKE_WEAPON_AP = 3;

export function drawableWeapons(player: Duelist): HandCard[] {
    return player.deck.filter(
        (card) =>
            card.itemId && getEquipmentItem(card.itemId).kind === "weapon",
    );
}

export function getFighter(id: string) {
    const fighter = PREGENERATED_FIGHTERS.find((profile) => profile.id === id);
    if (!fighter) throw new Error(`Unknown fighter: ${id}`);
    return fighter;
}

export function distance(duel: Duel): number {
    return Math.abs(
        fieldPosition(duel.players[0], 0) - fieldPosition(duel.players[1], 1),
    );
}
export function fieldPosition(player: Duelist, side: Side): number {
    return side === 0
        ? ECHELONS - player.position
        : ECHELONS - 1 + player.position;
}
function tacticalShift(
    duel: Duel,
    direction: CardDefinition["direction"],
): number {
    if (!direction) throw new Error("Missing tactical shift direction");
    const step =
        (duel.active === 0 ? 1 : -1) * (direction === "corner" ? 1 : -1);
    return formationTranslation(
        [fieldPosition(duel.players[0], 0), fieldPosition(duel.players[1], 1)],
        step as -1 | 1,
    );
}
function movementTarget(
    duel: Duel,
    direction: "advance" | "retreat",
    amount = 1,
): number {
    const side = duel.active;
    const player = duel.players[side];
    const enemy = fieldPosition(
        duel.players[(1 - side) as Side],
        (1 - side) as Side,
    );
    const current = fieldPosition(player, side);
    const step = (side === 0 ? 1 : -1) * (direction === "advance" ? 1 : -1);
    const target = Math.max(
        0,
        Math.min(ECHELONS * 2 - 1, current + step * amount),
    );
    const unoccupied =
        direction === "advance"
            ? side === 0
                ? Math.min(target, enemy - 1)
                : Math.max(target, enemy + 1)
            : target;
    return side === 0 ? ECHELONS - unoccupied : unoccupied - ECHELONS + 1;
}
interface ActionPointBudget {
    maximum: number;
    recovery: number;
}
export function actionPointBudget(combatant: Combatant): ActionPointBudget {
    const speed = getCombatStats(combatant).basicSpeed;
    return { maximum: Math.floor(speed), recovery: 3 };
}
interface MovementPlan {
    position: number;
    steps: number;
    ap: number;
}
function movementPlan(duel: Duel, action: DuelAction): MovementPlan | null {
    if (action.type !== "move") return null;
    const player = duel.players[duel.active];
    const direction = action.direction;
    const limit = getCombatStats(player.combatant).move;
    const target = movementTarget(duel, direction, Math.min(1, limit));
    const possibleSteps = Math.abs(target - player.position);
    let steps = 0;
    let ap = 0;
    while (steps < possibleSteps) {
        const cost = player.movementSteps + steps + 1;
        if (ap + cost > player.ap || player.movementAP + ap + cost > limit)
            break;
        ap += cost;
        steps++;
    }
    return { position: movementTarget(duel, direction, steps), steps, ap };
}
function shieldSlamPlan(duel: Duel): MovementPlan {
    const player = duel.players[duel.active];
    const steps = Math.max(0, distance(duel) - 1);
    const paidSteps = Math.max(0, steps - 1);
    let ap = 0;
    for (let index = 0; index < paidSteps; index++)
        ap += player.movementSteps + index + 1;
    return {
        position: movementTarget(duel, "advance", steps),
        steps: paidSteps,
        ap,
    };
}
function equippedShield(player: Duelist) {
    return player.combatant.equipment.find(
        (entry) =>
            entry.item.kind === "shield" &&
            ["main-hand", "off-hand"].includes(entry.placement),
    );
}
function isPaidAttack(player: Duelist, action: DuelAction): boolean {
    if (action.type === "equipment") return action.verb !== "aim";
    if (action.type === "attack") return true;
    if (action.type !== "card") return false;
    const card = player.hand.find(
        (entry) => entry.instanceId === action.instanceId,
    );
    if (!card) return false;
    const definition = cardDefinition(card.definitionId);
    return definition.effect === "attack" && !definition.placeholder;
}
function activeEffort(player: Duelist, effort: ExtraEffort): boolean {
    if (player.efforts[effort] <= 0) return false;
    return true;
}
export function actionCost(duel: Duel, action: DuelAction): number {
    if (action.type === "take-weapon") return TAKE_WEAPON_AP;
    const player = duel.players[duel.active];
    if (player.efforts["free-attack"] > 0 && isPaidAttack(player, action)) {
        if (action.type !== "card") return 0;
        const card = player.hand.find(
            (candidate) => candidate.instanceId === action.instanceId,
        )!;
        return cardDefinition(card.definitionId).ap ?? 0;
    }
    if (action.type === "equipment")
        return equipmentCost(player, action.instanceId);
    const movement = movementPlan(duel, action);
    if (movement)
        return movement.steps
            ? movement.ap
            : duel.players[duel.active].movementSteps + 1;
    if (
        action.type === "end" ||
        action.type === "discard" ||
        action.type === "assign-defense" ||
        action.type === "release-defense"
    )
        return 0;
    if (action.type === "card") {
        const card = duel.players[duel.active].hand.find(
            (entry) => entry.instanceId === action.instanceId,
        );
        if (!card) return 0;
        const definition = cardDefinition(card.definitionId);
        if (definition.effect === "shield-slam") return shieldSlamPlan(duel).ap;
        return definition.effect === "attack" && !definition.placeholder
            ? (definition.ap ?? 0) +
                  (card.itemId === "pilum"
                      ? 1
                      : equipmentCost(
                            player,
                            card.itemId ??
                                readyWeapon(player.combatant)?.itemId,
                        ))
            : (definition.ap ?? 0);
    }
    if (action.type === "guard" && action.defense === "dodge")
        return player.movementSteps + 1;
    if (action.type === "guard")
        return equipmentCost(
            player,
            action.source ?? defenseSource(player, action.defense),
        );
    return action.type === "attack"
        ? equipmentCost(
              player,
              action.weaponId ?? readyWeapon(player.combatant)?.itemId,
          )
        : 1;
}
export function equipmentCost(player: Duelist, source?: string): number {
    return (source ? (player.equipmentUses[source] ?? 0) : 0) + 1;
}
export function handSize(player: Duelist): number {
    return player.hand.filter((card) => card.definitionId !== "equipment")
        .length;
}

interface RandomState {
    rng: number;
}
function randomSource(duel: RandomState): () => number {
    return () => {
        duel.rng = (Math.imul(1664525, duel.rng) + 1013904223) >>> 0;
        return duel.rng / 4294967296;
    };
}
function dieSource(duel: Duel): DiceSource {
    const random = randomSource(duel);
    return () => Math.floor(random() * 6) + 1;
}
function draw(player: Duelist, count: number, random: () => number): void {
    for (let index = 0; index < count; index++) {
        if (!player.deck.length && player.discard.length) {
            player.deck = shuffleCards(player.discard, random);
            player.discard = [];
        }
        const card = player.deck.shift();
        if (!card) break;
        player.hand.push(card);
    }
}
export function prepareEquipment(combatant: Combatant): Combatant {
    const main = readyWeapon(combatant)?.item;
    if (main?.kind !== "weapon" || !main.range || main.firearm)
        return combatant;
    const sword = combatant.equipment.find(
        (entry) => entry.itemId === "gladius" && entry.placement === "carried",
    );
    if (!sword)
        throw new Error("Throwing loadout needs a permanent melee weapon");
    return {
        ...combatant,
        equipment: combatant.equipment.map((entry) =>
            entry === sword
                ? { ...entry, placement: "main-hand" }
                : entry.placement === "main-hand"
                  ? { ...entry, placement: "carried" }
                  : entry,
        ),
    };
}

export function createDuel(setup: DuelSetup): Duel {
    if (setup.fighterIds[0] === setup.fighterIds[1])
        throw new Error("Choose two distinct fighters");
    if (!Number.isSafeInteger(setup.seed) || setup.seed < 0)
        throw new Error("Seed must be a nonnegative integer");
    const randomState: RandomState = { rng: setup.seed >>> 0 };
    const random = randomSource(randomState);
    const players = setup.fighterIds.map((fighterId, side) => {
        const position = setup.positions[side];
        if (!Number.isInteger(position) || position < 1 || position > ECHELONS)
            throw new Error("Position must be 1..5");
        let combatant = prepareEquipment(
            createCombatant(getFighter(fighterId)),
        );
        combatant = {
            ...combatant,
            equipment: combatant.equipment.flatMap((entry, index) =>
                entry.item.kind === "weapon" && entry.item.firearm
                    ? Array.from({ length: entry.quantity }, (_, copy) => ({
                          ...entry,
                          quantity: 1,
                          instanceId: `firearm:${index}:${copy}`,
                      }))
                    : [entry],
            ),
        };
        for (const entry of combatant.equipment) validateAttachments(entry);
        const cards: HandCard[] = [];
        const repertoire = eligibleStratagems(combatant);
        for (const [id, copies] of Object.entries(
            getFighter(fighterId).combatDeck.stratagems,
        )) {
            const definition = cardDefinition(id);
            if (
                !Number.isInteger(copies) ||
                copies < 0 ||
                copies > techniqueCopies(combatant, definition)
            )
                throw new Error(
                    `Card copies exceed skill limit: ${definition.id}`,
                );
            if (copies > 0 && !repertoire.some((card) => card.id === id))
                throw new Error(
                    `Technique is unavailable for ${fighterId}: ${id}`,
                );
            for (let copy = 0; copy < copies; copy++)
                cards.push({
                    instanceId: `${side}:${definition.id}:${copy}`,
                    definitionId: definition.id,
                });
        }
        for (const [itemId, copies] of Object.entries(
            getFighter(fighterId).combatDeck.equipment,
        )) {
            if (
                combatant.equipment.some(
                    (entry) =>
                        entry.itemId === itemId &&
                        entry.item.kind === "weapon" &&
                        entry.item.firearm,
                )
            )
                throw new Error(
                    `Firearms use physical quantities, not skill copies: ${itemId}`,
                );
            if (
                !heldEquipment(combatant).some(
                    (entry) => entry.itemId === itemId,
                ) ||
                !Number.isInteger(copies) ||
                copies < 1 ||
                copies > sourceCopies(combatant, itemId)
            )
                throw new Error(`Invalid equipment card: ${itemId}`);
            for (let copy = 0; copy < copies; copy++)
                cards.push({
                    instanceId: `${side}:equipment:${itemId}:${copy}`,
                    definitionId: "equipment",
                    itemId,
                });
        }
        for (const [index, entry] of combatant.equipment.entries()) {
            if (entry.item.kind === "weapon" && entry.item.firearm) {
                for (let copy = 0; copy < entry.quantity; copy++)
                    cards.push({
                        instanceId: `${side}:firearm:${index}:${copy}`,
                        definitionId: "equipment",
                        itemId: entry.itemId,
                        loaded: entry.loaded ?? true,
                        physicalId: entry.instanceId,
                    });
                continue;
            }
            if (entry.item.kind !== "weapon" || !entry.item.range) continue;
            for (let copy = 0; copy < entry.quantity; copy++)
                cards.push({
                    instanceId: `${side}:throw:${index}:${copy}`,
                    definitionId: "throw",
                    itemId: entry.itemId,
                });
        }
        if (cards.length !== DECK_SIZE)
            throw new Error(
                `Deck must contain exactly ${DECK_SIZE} cards: ${fighterId}; got ${cards.length}`,
            );
        if (
            !cards.some(
                (card) =>
                    card.itemId &&
                    getEquipmentItem(card.itemId).kind === "weapon",
            )
        )
            throw new Error("Deck needs a weapon");
        const player: Duelist = {
            ownTurn: 1,
            fighterId,
            combatant,
            position,
            ap: actionPointBudget(combatant).maximum,
            movementSteps: 0,
            movementAP: 0,
            equipmentUses: {},
            extraEffortRound: null,
            efforts: {
                "maximum-defense": 0,
                "maximum-attack": 0,
                "free-attack": 0,
            },
            defenses: [],
            attacks: [],
            armor: createArmor(combatant),
            hand: [],
            deck: shuffleCards(cards, random),
            discard: [],
            spent: [],
        };
        const startingCards = getFighter(fighterId).combatDeck.startingCards;
        if (
            startingCards.length !== GUARANTEED_STARTING_CARDS ||
            new Set(startingCards).size !== GUARANTEED_STARTING_CARDS
        )
            throw new Error(
                `Choose exactly three distinct starting copies: ${fighterId}`,
            );
        for (const id of startingCards) {
            const index = player.deck.findIndex(
                (card) => card.instanceId === `${side}:${id}`,
            );
            if (index < 0)
                throw new Error(
                    `Starting card is absent from deck: ${fighterId}: ${id}`,
                );
            player.hand.push(...player.deck.splice(index, 1));
        }
        draw(player, INITIAL_HAND - GUARANTEED_STARTING_CARDS, random);
        for (const card of player.hand) card.receivedTurn = 1;
        return player;
    });
    return {
        players: [players[0], players[1]],
        active: 0,
        turn: 1,
        seed: setup.seed,
        rng: randomState.rng,
        nextCommitment: 1,
        winner: null,
        log: ["Дуэль началась. Ход первого бойца."],
    };
}

function attackAvailability(
    duel: Duel,
    mode: AttackMode,
    itemId?: string,
    weaponId?: string,
): Availability {
    const player = duel.players[duel.active];
    const entry = itemId
        ? player.combatant.equipment.find(
              (candidate) =>
                  candidate.itemId === itemId &&
                  candidate.placement === "carried",
          )
        : weaponId
          ? player.combatant.equipment.find(
                (candidate) =>
                    candidate.itemId === weaponId &&
                    ["main-hand", "off-hand", "both-hands"].includes(
                        candidate.placement,
                    ),
            )
          : readyWeapon(player.combatant);
    if (
        !entry ||
        (entry.item.kind !== "weapon" &&
            !(entry.item.kind === "shield" && entry.item.bash))
    )
        return { allowed: false, reason: "Оружие недоступно" };
    if (!itemId && freeCopies(player, entry.itemId) <= 0)
        return { allowed: false, reason: "Все копии оружия заняты" };
    const weapon = attackWeapon(entry.item);
    if (weapon.firearm)
        return {
            allowed: false,
            reason: "Используйте Fire / Aim / Bayonet предмета",
        };
    if (mode !== "throw" && mode !== defaultAttack(weapon))
        return {
            allowed: false,
            reason: "Для оружия доступна только основная атака",
        };
    if (!weapon.attackSkills?.[mode])
        return { allowed: false, reason: "Оружие не поддерживает этот приём" };
    const reach = distance(duel);
    if (mode === "throw") {
        if (reach < MIN_THROW_DISTANCE)
            return {
                allowed: false,
                reason: `Для броска нужна дистанция от ${MIN_THROW_DISTANCE}`,
            };
        if (
            !weapon.range ||
            reach >
                getCombatStats(player.combatant).strength *
                    weapon.range.maxMultiplier
        )
            return { allowed: false, reason: "Слишком далеко для броска" };
    } else if (!weapon.reach.includes(reach))
        return {
            allowed: false,
            reason: `Нужна дистанция ${weapon.reach.join(" / ")}`,
        };
    return { allowed: true };
}

export function availability(duel: Duel, action: DuelAction): Availability {
    const player = duel.players[duel.active];
    if (duel.winner !== null) return { allowed: false, reason: "Бой завершён" };
    if (action.type === "discard")
        return { allowed: false, reason: "Ручной сброс не используется" };
    if (action.type === "end") return { allowed: true };
    if (action.type === "release-defense")
        return player.defenses.some((entry) => entry.id === action.defenseId)
            ? { allowed: true }
            : { allowed: false, reason: "Подготовленная защита не найдена" };
    if (action.type === "assign-defense") {
        const defense = player.defenses.find(
            (entry) => entry.id === action.defenseId,
        );
        const attack = duel.players[(1 - duel.active) as Side].attacks.find(
            (entry) => entry.id === action.attackId,
        );
        return defense &&
            defense.id.startsWith(`${duel.turn}:`) &&
            (!action.attackId ||
                (attack &&
                    suitableDefense(defense, attack) &&
                    !player.defenses.some(
                        (entry) =>
                            entry.id !== defense.id &&
                            entry.attackId === action.attackId,
                    )))
            ? { allowed: true }
            : { allowed: false, reason: "Назначение защиты недоступно" };
    }
    if (!getCombatStats(player.combatant).canAct)
        return { allowed: false, reason: "Боец оглушён" };
    let ap = actionCost(duel, action);
    let fp = 0;
    if (
        (action.type === "attack" || action.type === "guard") &&
        action.instanceId
    ) {
        const source =
            action.type === "attack"
                ? (action.weaponId ?? readyWeapon(player.combatant)?.itemId)
                : defenseSource(player, action.defense, action.source);
        if (
            !player.hand.some(
                (card) =>
                    card.instanceId === action.instanceId &&
                    (card.availableFromTurn ?? 0) <= player.ownTurn &&
                    card.definitionId === "equipment" &&
                    card.itemId === source,
            )
        )
            return {
                allowed: false,
                reason: "Выбранная копия экипировки недоступна",
            };
    }
    if (
        action.type === "take-weapon" &&
        !drawableWeapons(player).some(
            (card) => card.instanceId === action.instanceId,
        )
    )
        return { allowed: false, reason: "Этой карты оружия нет в колоде" };
    if (action.type === "equipment") {
        const result = equipmentAvailability(
            player,
            action.instanceId,
            action.verb,
            distance(duel),
        );
        if (!result.allowed) return result;
    }
    if (action.type === "attack") {
        const result = attackAvailability(
            duel,
            action.mode,
            undefined,
            action.weaponId,
        );
        if (!result.allowed) return result;
    }
    if (action.type === "stand" && !player.combatant.state.prone)
        return { allowed: false, reason: "Боец уже стоит" };
    if (action.type === "guard") {
        if (
            action.defense === "dodge" &&
            player.defenses.some((entry) => entry.defense === "dodge")
        )
            return {
                allowed: false,
                reason: "Уже подготовлено неиспользованное уклонение",
            };
        const equipped = defenseSource(player, action.defense, action.source);
        if (action.attackId) {
            const attack = duel.players[(1 - duel.active) as Side].attacks.find(
                (entry) => entry.id === action.attackId,
            );
            if (
                !attack ||
                (action.defense === "parry" &&
                    (attack.mode === "throw" ||
                        attack.weapon.tags.includes("shield") ||
                        attack.weapon.tags.includes("heavy"))) ||
                player.defenses.some(
                    (entry) => entry.attackId === action.attackId,
                )
            )
                return {
                    allowed: false,
                    reason: "Нельзя назначить эту защиту на выбранную угрозу",
                };
        }
        if (!equipped)
            return {
                allowed: false,
                reason: "Нет свободной копии для этой защиты",
            };
    }
    if (action.type === "ready") {
        const main = readyWeapon(player.combatant);
        if (
            main &&
            (player.attacks.some((entry) => entry.source === main.itemId) ||
                player.defenses.some((entry) => entry.source === main.itemId))
        )
            return { allowed: false, reason: "Текущее оружие занято" };
        const entry = player.combatant.equipment.find(
            (candidate) =>
                candidate.itemId === action.itemId &&
                candidate.placement === "carried" &&
                candidate.item.kind === "weapon" &&
                !candidate.item.range,
        );
        if (!entry) return { allowed: false, reason: "Оружие недоступно" };
    }
    if (
        action.type === "move" &&
        movementTarget(duel, action.direction) === player.position
    )
        return {
            allowed: false,
            reason:
                action.direction === "advance"
                    ? "Противник уже рядом"
                    : "Край поля",
        };
    if (action.type === "card") {
        const card = player.hand.find(
            (candidate) => candidate.instanceId === action.instanceId,
        );
        if (!card) return { allowed: false, reason: "Карты нет в руке" };
        const definition = cardDefinition(card.definitionId);
        if (
            definition.effect === "replace" &&
            (!Number.isSafeInteger(definition.amount) ||
                (definition.amount ?? 0) < 1)
        )
            return {
                allowed: false,
                reason: "Для тактической замены нужно задать N",
            };
        if (
            definition.fp > 0 &&
            player.extraEffortRound === Math.floor((duel.turn - 1) / 2)
        )
            return {
                allowed: false,
                reason: "Сверхусилие уже использовано в этом раунде",
            };
        if (
            !card.itemId &&
            !eligibleStratagems(player.combatant).some(
                (candidate) => candidate.id === definition.id,
            )
        )
            return { allowed: false, reason: "Не выполнены требования приёма" };
        fp = definition.fp;
        if (
            definition.effect === "translate" &&
            tacticalShift(duel, definition.direction) === 0
        )
            return {
                allowed: false,
                reason: "Нет места даже для одного совместного шага",
            };
        if (definition.effect === "replace") {
            if (fp !== 0)
                return {
                    allowed: false,
                    reason: "Ментальная замена не должна расходовать FP",
                };
            const selection = replacementAvailability(
                player,
                action.instanceId,
                action.choiceId ?? "",
                definition.amount ?? 0,
            );
            if (!selection.allowed) return selection;
        }
        if (definition.effect === "shield-slam") {
            const shield = equippedShield(player);
            if (!shield || shield.item.kind !== "shield" || !shield.item.bash)
                return {
                    allowed: false,
                    reason: "Нужен экипированный щит с атакой",
                };
            if (distance(duel) < 2)
                return {
                    allowed: false,
                    reason: "Для таранного удара щитом нужна дистанция от 2",
                };
            if (player.combatant.state.prone)
                return { allowed: false, reason: "Сначала встаньте" };
            if (player.movementAP + ap > getCombatStats(player.combatant).move)
                return {
                    allowed: false,
                    reason: "Лимит ОД на движение исчерпан",
                };
        }

        if (definition.effect === "attack" && !definition.placeholder) {
            const result = attackAvailability(
                duel,
                card.itemId ? "throw" : readyAttack(player.combatant),
                card.itemId,
            );
            if (!result.allowed) return result;
            const weapon = readyWeapon(player.combatant)?.item;
            if (
                weapon?.kind === "weapon" &&
                !canTargetVitalArea(weapon, definition.location ?? "torso")
            )
                return { allowed: false, reason: "Нужно колющее оружие" };
        }
        if (
            definition.effect === "draw" &&
            !player.deck.length &&
            !player.discard.length
        )
            return { allowed: false, reason: "Колода и сброс пусты" };
        if (
            definition.skill === "shield" &&
            !player.combatant.equipment.some(
                (entry) =>
                    entry.item.kind === "shield" &&
                    ["main-hand", "off-hand"].includes(entry.placement),
            )
        )
            return { allowed: false, reason: "Нужен щит" };
    }
    if (player.combatant.state.prone && action.type === "move")
        return { allowed: false, reason: "Сначала встаньте" };
    const movement = movementPlan(duel, action);
    if (movement) {
        ap = actionCost(duel, action);
        if (
            !movement.steps &&
            player.movementAP + ap > getCombatStats(player.combatant).move
        )
            return { allowed: false, reason: "Лимит ОД на движение исчерпан" };
        if (!movement.steps && player.ap >= ap)
            return {
                allowed: false,
                reason: "Недостаточно ОД на движение после затрат FP",
            };
    }
    if (
        action.type === "guard" &&
        action.defense === "dodge" &&
        player.movementAP + ap > getCombatStats(player.combatant).move
    )
        return { allowed: false, reason: "Movement/ dodge AP limit exhausted" };
    if (player.ap < ap) return { allowed: false, reason: `Нужно ${ap} ОД` };
    if (player.combatant.state.fp < fp)
        return { allowed: false, reason: `Нужно ${fp} FP` };
    return { allowed: true };
}

function prepareAttack(
    duel: Duel,
    mode: AttackMode,
    definition?: CardDefinition,
    projectile?: string,
    weaponId?: string,
): boolean {
    const player = duel.players[duel.active];
    const entry = player.combatant.equipment.find(
        (entry) =>
            entry.itemId ===
            (projectile ?? weaponId ?? readyWeapon(player.combatant)?.itemId),
    );
    if (!entry) throw new Error("Missing attack equipment");
    const weapon = attackWeapon(entry.item);
    player.attacks.push({
        id: `attack:${duel.nextCommitment++}`,
        source: projectile ? `projectile:${duel.nextCommitment}` : entry.itemId,
        weapon,
        mode,
        location: definition?.location ?? "torso",
        distance: distance(duel),
        attacker: structuredClone(player.combatant),
        maximum: activeEffort(player, "maximum-attack"),
    });
    if (projectile)
        player.combatant = {
            ...player.combatant,
            equipment: player.combatant.equipment.flatMap((candidate) =>
                candidate !== entry
                    ? [candidate]
                    : candidate.quantity > 1
                      ? [{ ...candidate, quantity: candidate.quantity - 1 }]
                      : [],
            ),
        };
    duel.log.push(
        `${getFighter(player.fighterId).name}: подготовлена атака — ${weapon.name}. Разрешится в конце ответного хода.`,
    );
    return true;
}

function resolveIncoming(duel: Duel): void {
    const defender = duel.players[duel.active];
    const attacker = duel.players[(1 - duel.active) as Side];
    for (const attack of attacker.attacks) {
        const usable = (entry: (typeof defender.defenses)[number]) =>
            suitableDefense(entry, attack) &&
            (entry.defense === "dodge" ||
                defender.combatant.equipment.some(
                    (item) => item.itemId === entry.source,
                ));
        const assigned = defender.defenses.findIndex(
            (entry) => entry.attackId === attack.id && usable(entry),
        );
        const index =
            assigned >= 0
                ? assigned
                : defender.defenses.findIndex(
                      (entry) => !entry.attackId && usable(entry),
                  );
        const prepared = index >= 0 ? defender.defenses[index] : undefined;
        const item = defender.combatant.equipment.find(
            (entry) => entry.itemId === prepared?.source,
        )?.item;
        const result = resolveExchange(
            attack.attacker,
            defender.combatant,
            {
                weapon: attack.weapon,
                mode: attack.mode,
                location: attack.location,
                distance: attack.distance,
                defense: prepared?.defense ?? null,
                defenseBonus: 0,
                defenseMinimum: item?.quality?.defenseMinimum,
                maximumAttack: attack.maximum,
                maximumDefense: prepared?.maximum,
                damage: attack.damage,
                armorResolution: (damage, type) =>
                    resolveArmorImpact(defender, attack.location, damage, type),
            },
            dieSource(duel),
        );
        defender.combatant = result.injury.combatant;
        if (prepared) {
            defender.defenses.splice(index, 1);
            if (
                prepared.defense === "block" &&
                prepared.card &&
                attack.weapon.id === "pilum"
            ) {
                const until = defender.ownTurn + PILUM_SHIELD_COOLDOWN + 1;
                prepared.card.pilumCooldownUntilTurn = until;
                prepared.card.availableFromTurn = Math.max(
                    prepared.card.availableFromTurn ?? 0,
                    until,
                );
                duel.log.push(
                    `Пилум: карта щита заблокирована на ${PILUM_SHIELD_COOLDOWN} собственных ходов.`,
                );
            }
            if (prepared.card) defender.hand.push(prepared.card);
        }
        duel.log.push(
            `${getFighter(attacker.fighterId).name}: атака ${result.attack} − защита ${result.defense} = ${result.remaining}; тип ${({ imp: "колющий", cut: "режущий", cr: "дробящий" } as const)[result.damageType]}; броня −${result.armorDamage}; тело ${result.bodyDamage} (травма ${result.trauma}); потеря ${result.injury.injury} HP.`,
        );
        checkWinner(duel);
        if (duel.winner !== null) break;
    }
    for (const attack of attacker.attacks)
        if (attack.card) attacker.hand.push(attack.card);
    attacker.attacks = [];
    for (const defense of defender.defenses) delete defense.attackId;
}

function checkWinner(duel: Duel): void {
    for (const side of [0, 1] as const) {
        const state = duel.players[side].combatant.state;
        if (state.dead || state.unconscious) {
            duel.winner = (1 - side) as Side;
            duel.log.push(
                `${getFighter(duel.players[duel.winner].fighterId).name} побеждает. Противник ${state.dead ? "погиб" : "без сознания"}.`,
            );
            break;
        }
    }
}

function beginActionWindow(
    duel: Duel,
    player: Duelist,
    recovery: number,
): void {
    player.ownTurn++;
    player.ap = Math.min(
        actionPointBudget(player.combatant).maximum,
        player.ap + recovery,
    );
    player.movementSteps = 0;
    player.movementAP = 0;
    player.equipmentUses = {};
    for (const effort of Object.keys(player.efforts) as ExtraEffort[])
        player.efforts[effort] = 0;
    player.combatant = beginTurn(player.combatant, dieSource(duel));
}

// Both modes share window resets; the adapter chooses regeneration cadence.
export function resolveRealtimeSegment(original: Duel): Duel {
    const duel = structuredClone(original);
    for (const side of [0, 1] as const) {
        duel.active = side;
        duel.players[side].combatant = endTurn(
            duel.players[side].combatant,
            dieSource(duel),
        );
        resolveIncoming(duel);
        if (duel.winner !== null) return duel;
    }
    for (const player of duel.players) {
        player.defenses = player.defenses.filter(
            (entry) => entry.expiresAfterTurn === undefined,
        );
        beginActionWindow(duel, player, 2);
    }
    checkWinner(duel);
    if (duel.winner !== null) return duel;
    duel.turn++;
    duel.log.push(`Отрезок ${duel.turn}: +2 ОД, счётчики активаций сброшены.`);
    return duel;
}

export function drawRealtimeCards(original: Duel): Duel {
    const duel = structuredClone(original);
    for (const player of duel.players) {
        const held = new Set(player.hand.map((card) => card.instanceId));
        draw(player, 1, randomSource(duel));
        for (const card of player.hand)
            if (!held.has(card.instanceId)) card.receivedTurn = duel.turn;
    }
    duel.log.push("Добор: по одной карте каждому бойцу.");
    return duel;
}

export function performAction(original: Duel, action: DuelAction): Duel {
    const duel = applyAction(original, action);
    for (const side of [0, 1] as const) {
        const held = new Set(
            original.players[side].hand.map((card) => card.instanceId),
        );
        for (const card of duel.players[side].hand)
            if (!held.has(card.instanceId)) card.receivedTurn = duel.turn;
    }
    return duel;
}

function applyAction(original: Duel, action: DuelAction): Duel {
    const allowed = availability(original, action);
    if (!allowed.allowed) throw new Error(allowed.reason);
    const duel: Duel = structuredClone(original);
    const player = duel.players[duel.active];
    if (action.type === "take-weapon") {
        const index = player.deck.findIndex(
            (card) => card.instanceId === action.instanceId,
        );
        const [card] = player.deck.splice(index, 1);
        player.hand.push(card);
        player.ap -= TAKE_WEAPON_AP;
        duel.log.push(
            `Взять оружие: ${getEquipmentItem(card.itemId!).name}; 3 ОД.`,
        );
        return duel;
    }
    if (action.type === "release-defense") {
        const index = player.defenses.findIndex(
            (entry) => entry.id === action.defenseId,
        );
        const [defense] = player.defenses.splice(index, 1);
        if (defense.card) player.hand.push(defense.card);
        duel.log.push(
            "Подготовленная защита освобождена; затраты не возвращаются.",
        );
        return duel;
    }
    if (action.type === "equipment") {
        const freeAttack =
            action.verb !== "aim" && activeEffort(player, "free-attack");
        activateEquipment(
            duel,
            action.instanceId,
            action.verb,
            distance(duel),
            actionCost(original, action),
            freeAttack,
        );
        return duel;
    }
    if (action.type === "assign-defense") {
        const defense = player.defenses.find(
            (entry) => entry.id === action.defenseId,
        )!;
        defense.attackId = action.attackId;
        return duel;
    }
    if (action.type === "discard") {
        const card = player.hand.find(
            (candidate) => candidate.instanceId === action.instanceId,
        )!;
        player.hand = player.hand.filter((candidate) => candidate !== card);
        player.discard.push(card);
        duel.log.push(
            `Сброшено: ${card.itemId ? getEquipmentItem(card.itemId).name : cardDefinition(card.definitionId).name}.`,
        );
        return duel;
    }
    if (action.type === "end") {
        player.combatant = endTurn(player.combatant, dieSource(duel));
        resolveIncoming(duel);
        for (const participant of duel.players)
            participant.defenses = participant.defenses.filter(
                (defense) =>
                    defense.expiresAfterTurn === undefined ||
                    defense.expiresAfterTurn > duel.turn,
            );
        if (duel.winner !== null) return duel;
        duel.active = (1 - duel.active) as Side;
        duel.turn++;
        const next = duel.players[duel.active];
        const budget = actionPointBudget(next.combatant);
        beginActionWindow(duel, next, budget.recovery);
        draw(next, 1, randomSource(duel));
        duel.log.push(
            `Ход ${duel.turn}: ${getFighter(next.fighterId).name}. +${budget.recovery} ОД, добор карты.`,
        );
        checkWinner(duel);
        return duel;
    }
    let definition: CardDefinition | undefined;
    let card: HandCard | undefined;
    if (action.type === "card") {
        card = player.hand.find(
            (candidate) => candidate.instanceId === action.instanceId,
        )!;
        definition = cardDefinition(card.definitionId);
        if (definition.effect === "replace") {
            player.ap -= actionCost(original, action);
            replaceHandCard(player, action.instanceId, action.choiceId!);
            duel.log.push(
                "Оценить обстановку: стратагема заменена картой из верхних четырёх.",
            );
            return duel;
        }
    }
    const movement = movementPlan(duel, action);
    const cost = actionCost(duel, action);
    const freeAttack =
        isPaidAttack(player, action) && activeEffort(player, "free-attack");
    player.ap -= cost;
    const usedSource =
        action.type === "attack"
            ? (action.weaponId ?? readyWeapon(player.combatant)?.itemId)
            : action.type === "guard"
              ? (action.source ?? defenseSource(player, action.defense))
              : definition?.effect === "attack" &&
                  !definition.placeholder &&
                  card?.itemId !== "pilum"
                ? (card?.itemId ?? readyWeapon(player.combatant)?.itemId)
                : undefined;
    if (usedSource && usedSource !== "dodge" && !freeAttack)
        player.equipmentUses[usedSource] =
            (player.equipmentUses[usedSource] ?? 0) + 1;
    if (movement) player.movementAP += cost;
    if (action.type === "guard" && action.defense === "dodge") {
        player.movementAP += cost;
        player.movementSteps++;
    }
    if (definition?.fp && definition.effect !== "recover-mana")
        player.combatant = spendFatigue(
            player.combatant,
            definition.fp,
            dieSource(duel),
        );
    let committed = true;
    if (definition && definition.fp > 0)
        player.extraEffortRound = Math.floor((duel.turn - 1) / 2);
    if (definition?.effect === "translate") {
        const shift = tacticalShift(duel, definition.direction);
        duel.players[0].position -= shift;
        duel.players[1].position += shift;
        duel.log.push(
            `${getFighter(player.fighterId).name}: ${definition.name} — совместный сдвиг на ${Math.abs(shift)}; дистанция ${distance(duel)}.`,
        );
    } else if (definition?.effect === "extra-effort") {
        player.efforts[definition.effort!]++;
        duel.log.push(
            `${getFighter(player.fighterId).name}: ${definition.name} — усиление до следующего собственного хода, −1 FP.`,
        );
    } else if (definition?.effect === "shield-slam") {
        const shield = equippedShield(player)!;
        const plan = shieldSlamPlan(duel);
        player.position = plan.position;
        player.movementAP += plan.ap;
        player.movementSteps += plan.steps;
        prepareAttack(
            duel,
            defaultAttack(attackWeapon(shield.item)),
            undefined,
            undefined,
            shield.itemId,
        );
        player.attacks.at(-1)!.origin = definition.name;
        player.defenses.push({
            origin: definition.name,
            expiresAfterTurn: duel.turn + 1,
            id: `${duel.turn}:defense:${duel.nextCommitment++}`,
            defense: "block",
            source: shield.itemId,
            maximum: activeEffort(player, "maximum-defense"),
        });
    } else if (definition?.effect === "recover-mana") {
        const before = player.combatant.state.mana;
        player.combatant = restoreManaWithEffort(
            player.combatant,
            dieSource(duel),
        );
        duel.log.push(
            `${getFighter(player.fighterId).name}: сверхусилие — +${player.combatant.state.mana - before} маны, −1 FP.`,
        );
    } else if (definition?.placeholder)
        duel.log.push(
            `${getFighter(player.fighterId).name}: ${definition.name} — плейсхолдер разыгран, боевой эффект пока не задан.`,
        );
    else if (action.type === "attack" || definition?.effect === "attack")
        committed = prepareAttack(
            duel,
            action.type === "attack"
                ? action.mode
                : card?.itemId
                  ? "throw"
                  : readyAttack(player.combatant),
            definition,
            card?.itemId,
            action.type === "attack" ? action.weaponId : undefined,
        );
    else if (
        definition?.effect === "draw" ||
        action.type === "guard" ||
        checkExertion(player.combatant, dieSource(duel))
    ) {
        if (action.type === "stand")
            player.combatant = {
                ...player.combatant,
                state: { ...player.combatant.state, prone: false },
            };
        if (action.type === "ready")
            player.combatant = {
                ...player.combatant,
                equipment: player.combatant.equipment.map((entry) =>
                    entry.itemId === action.itemId &&
                    entry.placement === "carried"
                        ? { ...entry, placement: "main-hand" }
                        : entry.placement === "main-hand"
                          ? { ...entry, placement: "carried" }
                          : entry,
                ),
            };
        if (action.type === "guard") {
            player.defenses.push({
                id: `${duel.turn}:defense:${duel.nextCommitment++}`,
                defense: action.defense,
                source: defenseSource(player, action.defense, action.source)!,
                attackId: action.attackId,
                maximum: activeEffort(player, "maximum-defense"),
            });
        }
        if (definition?.effect === "draw")
            draw(player, definition.amount ?? 1, randomSource(duel));
        if (movement) {
            player.position = movement.position;
            player.movementSteps += movement.steps;
        }
        duel.log.push(
            `${getFighter(player.fighterId).name}: ${definition?.name ?? ({ move: "манёвр", ready: "смена оружия", stand: "встал", guard: "защитная стойка" } as const)[action.type as "move" | "ready" | "stand" | "guard"]}.`,
        );
    } else
        duel.log.push(
            `${getFighter(player.fighterId).name}: не удалось собраться с силами.`,
        );
    if (
        committed &&
        usedSource &&
        usedSource !== "dodge" &&
        (action.type === "attack" ||
            action.type === "guard" ||
            (definition?.effect === "attack" &&
                !definition.placeholder &&
                !card?.itemId))
    ) {
        const equipmentCard = player.hand.find(
            (entry) =>
                entry.definitionId === "equipment" &&
                entry.itemId === usedSource &&
                (entry.availableFromTurn ?? 0) <= player.ownTurn &&
                (!(action.type === "attack" || action.type === "guard") ||
                    !action.instanceId ||
                    entry.instanceId === action.instanceId),
        );
        if (!equipmentCard) throw new Error("Missing drawn equipment copy");
        player.hand = player.hand.filter((entry) => entry !== equipmentCard);
        const commitment =
            action.type === "guard"
                ? player.defenses.at(-1)
                : player.attacks.at(-1);
        if (!commitment) throw new Error("Missing equipment commitment");
        commitment.card = equipmentCard;
        if (
            action.type !== "guard" &&
            getEquipmentItem(usedSource).tags.includes("heavy")
        )
            equipmentCard.availableFromTurn = player.ownTurn + 2;
    }
    if (card && committed) {
        player.hand = player.hand.filter(
            (candidate) => candidate.instanceId !== card!.instanceId,
        );
        (card.itemId ? player.spent : player.discard).push(card);
    }
    checkWinner(duel);
    return duel;
}
