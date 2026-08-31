import { ANNOUNCE_TARGET_FREE_ACTION } from "./announce-target.free-action";
import { APPROACH_ENEMY_ACTION } from "./approach-enemy.action";
import { ASSESS_ORDER_ACTION } from "./assess-order.action";
import { ASSESS_TACTICS_ACTION } from "./assess-tactics.action";
import { AWAIT_ORDERS_ACTION } from "./await-orders.action";
import { CHANGE_ORDER_ACTION } from "./change-order.action";
import { CHOOSE_INVERTED_ORDER_ACTION } from "./choose-inverted-order.action";
import { ENGAGE_ENEMY_ACTION } from "./engage-enemy.action";
import { HOLD_POSITION_ACTION } from "./hold-position.action";
import { INCAPACITATED_ACTION } from "./incapacitated.action";
import { ISSUE_ADDRESSED_ORDER_ACTION } from "./issue-addressed-order.action";
import { ISSUE_INITIAL_ORDER_ACTION } from "./issue-initial-order.action";
import { MAINTAIN_FORMATION_ACTION } from "./maintain-formation.action";
import { REGROUP_ACTION } from "./regroup.action";
import { REPEAT_ORDER_FREE_ACTION } from "./repeat-order.free-action";
import { RESTORE_SERGEANT_COHESION_ACTION } from "./restore-sergeant-cohesion.action";
import { SEARCH_KNOWN_SUBORDINATE_ACTION } from "./search-known-subordinate.action";
import { SEARCH_LAST_KNOWN_ENEMY_ACTION } from "./search-last-known-enemy.action";
import { WITHDRAW_ACTION } from "./withdraw.action";
import type { BattleActionDefinition, BattleFreeActionDefinition } from "./types";

export const BATTLE_ACTION_DEFINITIONS: ReadonlyArray<BattleActionDefinition> = [
    INCAPACITATED_ACTION,
    SEARCH_KNOWN_SUBORDINATE_ACTION,
    SEARCH_LAST_KNOWN_ENEMY_ACTION,
    ISSUE_ADDRESSED_ORDER_ACTION,
    ASSESS_TACTICS_ACTION,
    ISSUE_INITIAL_ORDER_ACTION,
    CHOOSE_INVERTED_ORDER_ACTION,
    CHANGE_ORDER_ACTION,
    ASSESS_ORDER_ACTION,
    MAINTAIN_FORMATION_ACTION,
    RESTORE_SERGEANT_COHESION_ACTION,
    AWAIT_ORDERS_ACTION,
    REGROUP_ACTION,
    HOLD_POSITION_ACTION,
    WITHDRAW_ACTION,
    ENGAGE_ENEMY_ACTION,
    APPROACH_ENEMY_ACTION,
];

export const BATTLE_FREE_ACTION_DEFINITIONS: ReadonlyArray<BattleFreeActionDefinition> = [
    REPEAT_ORDER_FREE_ACTION,
    ANNOUNCE_TARGET_FREE_ACTION,
];

export type { BattleActionContext } from "./types";
