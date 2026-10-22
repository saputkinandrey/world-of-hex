const test = require("node:test");
const assert = require("node:assert/strict");
const combat = require("../dist/rps/combat");
const { PREGENERATED_FIGHTERS } = require("../dist/rps/characters");
const { getEquipmentItem } = require("../dist/rps/equipment");
const low = () => 1;
const high = () => 6;

test("base stats work for generated and pregenerated profiles without equipment", () => {
    const original = PREGENERATED_FIGHTERS[0];
    const profile = {
        ...original,
        attributes: { ST: 12, DX: 11, IQ: 10, HT: 12 },
        lens: { ...original.lens, advantages: [] },
    };
    assert.deepEqual(combat.getBaseCombatStats(profile), {
        maxHP: 12,
        maxFP: 12,
        maxMana: profile.will,
        basicSpeed: 5.75,
        move: 5,
        dodge: 8,
    });
    const reflexes = {
        ...profile,
        lens: { ...profile.lens, advantages: ["combat_reflexes"] },
    };
    assert.equal(combat.getBaseCombatStats(reflexes).dodge, 9);
    assert.throws(
        () =>
            combat.getBaseCombatStats({
                ...profile,
                attributes: { ...profile.attributes, HT: 0 },
            }),
        /HT must/,
    );
});
const fighter = (group) =>
    combat.createCombatant(
        PREGENERATED_FIGHTERS.find((p) => p.lens.id === group),
    );
const naked = () => ({
    ...combat.createCombatant(PREGENERATED_FIGHTERS[0]),
    equipment: [],
});
const hit = (damage, type = "imp", location = "torso", facing = "front") => ({
    damage,
    type,
    location,
    facing,
});

test("card modifiers affect skill, defense and penetrating damage without changing defaults", () => {
    const attacker = fighter("roman_triarii");
    const defender = naked();
    const weapon = attacker.equipment.find(
        (entry) => entry.placement === "main-hand",
    ).item;
    const request = {
        weaponId: weapon.id,
        mode: "thrust",
        skillId: weapon.attackSkills.thrust,
        location: "torso",
        facing: "front",
        distance: 2,
        defense: "none",
    };
    const base = combat.resolveAttack(attacker, defender, request, low);
    const modified = combat.resolveAttack(
        attacker,
        defender,
        { ...request, attackModifier: 2, damageModifier: 2 },
        low,
    );
    assert.equal(modified.attackTarget, base.attackTarget + 2);
    assert.equal(modified.injury.injury, base.injury.injury + 4);
    assert.deepEqual(
        combat.resolveAttack(
            attacker,
            defender,
            {
                ...request,
                attackModifier: 0,
                damageModifier: 0,
                defenseModifier: 0,
            },
            low,
        ),
        base,
    );
    const defended = combat.resolveAttack(
        attacker,
        defender,
        { ...request, defense: "dodge" },
        low,
    );
    const guarded = combat.resolveAttack(
        attacker,
        defender,
        { ...request, defense: "dodge", defenseModifier: 3 },
        low,
    );
    assert.equal(guarded.defenseTarget, defended.defenseTarget + 3);
    for (const key of ["attackModifier", "damageModifier", "defenseModifier"])
        assert.throws(
            () =>
                combat.resolveAttack(
                    attacker,
                    defender,
                    { ...request, [key]: 0.5 },
                    low,
                ),
            /integers/,
        );
});

test("all 12 fighters resolve ready weapon attacks end to end", () => {
    for (const profile of PREGENERATED_FIGHTERS) {
        const attacker = combat.createCombatant(profile);
        const weapon = attacker.equipment.find(
            (e) => e.item.kind === "weapon" && e.placement === "main-hand",
        ).item;
        const result = combat.resolveAttack(
            attacker,
            naked(),
            {
                weaponId: weapon.id,
                mode: "thrust",
                skillId: weapon.attackSkills.thrust,
                location: "torso",
                facing: "front",
                distance: weapon.reach[0],
                defense: "none",
            },
            low,
        );
        assert.equal(result.hit, true);
        assert.ok(result.injury.injury > 0);
        assert.equal(
            result.injury.combatant.state.hp,
            naked().maxHP - result.injury.injury,
        );
        assert.equal(attacker.state.hp, attacker.maxHP);
    }
});

test("damage calculation is available without applying vital-state side effects", () => {
    const actor = naked();
    const before = structuredClone(actor);
    assert.deepEqual(combat.resolveDamage(actor, hit(5, "cut"), low), {
        damageResistance: 0,
        penetratingDamage: 5,
        injury: 7,
    });
    assert.deepEqual(actor, before);
    const club = getEquipmentItem("wooden_club");
    assert.equal(
        combat.rollDamage(combat.weaponDamage(1, club, "thrust"), low),
        0,
    );
});

test("injury-effect helpers preserve exact thresholds and per-hit shock", () => {
    const actor = naked();
    const profile = {
        ...actor.profile,
        attributes: { ...actor.profile.attributes, HT: 10 },
        lens: { ...actor.profile.lens, advantages: [] },
        commandLens: null,
    };
    assert.equal(combat.getInjuryCheck(profile, 10, 5).required, false);
    assert.equal(combat.getInjuryCheck(profile, 10, 6).required, true);
    assert.equal(
        combat.getInjuryCheck(profile, 10, 1, "vitals").required,
        true,
    );
    assert.equal(combat.getShockPenalty(profile, 20, 1), 0);
    assert.equal(combat.getShockPenalty(profile, 20, 2, 1), 2);
    assert.equal(combat.getResourceDivisor(4, 12), 1);
    assert.equal(combat.getResourceDivisor(3, 12), 2);
    const resilient = {
        ...profile,
        lens: { ...profile.lens, advantages: ["high_pain_threshold", "fit"] },
    };
    assert.equal(combat.getHealthCheckTarget(resilient), 11);
    assert.equal(combat.getInjuryCheck(resilient, 10, 6).target, 14);
    assert.equal(combat.getShockPenalty(resilient, 10, 6), 0);
    assert.equal(combat.checkSucceeded(4, 6), true);
    assert.equal(combat.checkSucceeded(17, 20), false);
    assert.throws(() => combat.getInjuryCheck(profile, 10, -1), /Injury/);
});

test("weapon modes use ST table, imp/cut multipliers and post-DR rounding", () => {
    const gladius = getEquipmentItem("gladius");
    assert.deepEqual(combat.weaponDamage(10, gladius, "thrust"), {
        dice: 1,
        modifier: -1,
        type: "imp",
    });
    assert.deepEqual(combat.weaponDamage(10, gladius, "swing"), {
        dice: 1,
        modifier: 0,
        type: "cut",
    });
    assert.equal(
        combat.weaponDamage(10, getEquipmentItem("pilum"), "throw").modifier,
        1,
    );
    assert.equal(combat.applyInjury(naked(), hit(3, "cut"), low).injury, 4);
    assert.equal(combat.applyInjury(naked(), hit(3), low).injury, 6);
    assert.throws(
        () => combat.weaponDamage(21, gladius, "thrust"),
        /Unsupported/,
    );
    assert.throws(
        () => combat.weaponDamage(10, gladius, "throw"),
        /Unsupported/,
    );
});

test("armor respects zones, facing, helmet coverage and mail crushing DR", () => {
    const hastatus = fighter("roman_hastati");
    assert.equal(
        combat.armorResistance(hastatus, hit(8, "imp", "vitals"), low),
        5,
    );
    assert.equal(
        combat.armorResistance(hastatus, hit(8, "imp", "vitals", "rear"), low),
        0,
    );
    assert.equal(combat.armorResistance(hastatus, hit(8), low), 0);
    assert.equal(
        combat.armorResistance(hastatus, hit(8, "imp", "left-shin"), low),
        5,
    );
    assert.equal(
        combat.armorResistance(hastatus, hit(8, "imp", "right-shin"), low),
        0,
    );
    assert.equal(
        combat.armorResistance(hastatus, hit(8, "imp", "face"), low),
        4,
    );
    assert.equal(
        combat.armorResistance(hastatus, hit(8, "imp", "face"), high),
        0,
    );
    const princeps = fighter("roman_principes");
    assert.equal(combat.armorResistance(princeps, hit(8, "cr"), low), 3);
    assert.equal(combat.armorResistance(princeps, hit(8), low), 5);
    assert.equal(
        combat.armorResistance(
            fighter("roman_triarii"),
            hit(8, "imp", "torso", "rear"),
            low,
        ),
        5,
    );
});

test("major wounds use single injury, shock expires and stunning affects defense", () => {
    const actor = naked();
    const exactHalf = combat.applyInjury(
        actor,
        hit(actor.maxHP / 2, "cr"),
        low,
    );
    assert.equal(exactHalf.majorWound, false);
    const injured = combat.applyInjury(actor, hit(6, "cr"), () => 4);
    assert.equal(injured.majorWound, true);
    assert.equal(injured.combatant.state.stunned, true);
    assert.equal(injured.combatant.state.shock, 4);
    assert.ok(
        combat.getCombatStats(injured.combatant).dodge <
            combat.getCombatStats(actor).dodge,
    );
    const recovered = combat.endTurn(injured.combatant, low);
    assert.equal(recovered.state.stunned, false);
    assert.equal(recovered.state.shock, 0);
    assert.equal(recovered.state.prone, true);
});

test("low HP/FP thresholds are strict and cumulative; AP is independent", () => {
    const actor = naked();
    const normal = combat.getCombatStats(actor);
    const wounded = { ...actor, state: { ...actor.state, hp: 1 } };
    const exhausted = { ...wounded, state: { ...wounded.state, fp: 1 } };
    assert.equal(
        combat.getCombatStats(wounded).move,
        Math.ceil(normal.move / 2),
    );
    assert.equal(
        combat.getCombatStats(exhausted).move,
        Math.ceil(normal.move / 4),
    );
    assert.equal(
        combat.getCombatStats(exhausted).strength,
        Math.ceil(actor.profile.attributes.ST / 2),
    );
    const third = { ...actor, maxHP: 12, state: { ...actor.state, hp: 4 } };
    assert.equal(combat.getCombatStats(third).move, normal.move);
});

test("fatigue below zero damages HP; rest caps FP and does not heal HP", () => {
    const actor = naked();
    const tired = combat.spendFatigue(actor, actor.maxFP + 2, low);
    assert.equal(tired.state.fp, -2);
    assert.equal(tired.state.hp, actor.maxHP - 2);
    assert.equal(combat.checkExertion(tired, high), false);
    assert.equal(combat.checkExertion(tired, low), true);
    const rested = combat.recoverFatigue(tired, 1000);
    assert.equal(rested.state.fp, actor.maxFP);
    assert.equal(rested.state.hp, tired.state.hp);
    assert.equal(
        combat.spendFatigue(actor, actor.maxFP * 2, low).state.unconscious,
        true,
    );
    assert.throws(() => combat.spendFatigue(actor, -1, low), /Fatigue cost/);
});

test("zero HP permits survival checks; crossed negative thresholds roll once", () => {
    const actor = naked();
    const zero = combat.applyInjury(
        actor,
        hit(actor.maxHP, "cr"),
        low,
    ).combatant;
    assert.equal(zero.state.dead, false);
    assert.equal(combat.beginTurn(zero, low).state.unconscious, false);
    assert.equal(combat.beginTurn(zero, high).state.unconscious, true);
    const deep = combat.applyInjury(actor, hit(actor.maxHP * 3, "cr"), low);
    assert.equal(deep.deathChecks, 2);
    assert.equal(deep.combatant.state.dead, false);
    assert.equal(
        combat.applyInjury(actor, hit(actor.maxHP * 6, "cr"), low).combatant
            .state.dead,
        true,
    );
});

test("defense and range guards remain explicit", () => {
    const attacker = fighter("roman_hastati");
    const request = {
        weaponId: "pilum",
        mode: "thrust",
        skillId: "spear",
        location: "torso",
        facing: "front",
        distance: 1,
        defense: "block",
    };
    assert.equal(
        combat.resolveAttack(attacker, attacker, request, low).defended,
        true,
    );
    assert.throws(
        () => combat.resolveAttack(attacker, naked(), request, low),
        /No ready shield/,
    );
    assert.throws(
        () =>
            combat.resolveAttack(
                attacker,
                attacker,
                { ...request, distance: 99 },
                low,
            ),
        /reach/,
    );
    assert.throws(
        () =>
            combat.resolveAttack(
                attacker,
                attacker,
                { ...request, weaponId: "gladius" },
                low,
            ),
        /not ready/,
    );
});

test("throwing consumes only the readied projectile and cannot reuse it", () => {
    const actor = fighter("roman_velites");
    const request = {
        weaponId: "hasta_velitaris",
        mode: "throw",
        skillId: "javelin",
        location: "torso",
        facing: "front",
        distance: 5,
        defense: "none",
    };
    const result = combat.resolveAttack(actor, naked(), request, high);
    assert.equal(result.hit, false);
    assert.equal(
        result.attacker.equipment.filter((e) => e.itemId === request.weaponId)
            .length,
        1,
    );
    assert.equal(
        actor.equipment.filter((e) => e.itemId === request.weaponId).length,
        2,
    );
    assert.throws(
        () => combat.resolveAttack(result.attacker, naked(), request, low),
        /not ready/,
    );
    const tired = { ...actor, state: { ...actor.state, fp: 0 } };
    assert.equal(
        combat.resolveAttack(tired, naked(), request, high).attacker.equipment
            .length,
        actor.equipment.length,
    );
});

test("parry uses a skill belonging to a ready weapon", () => {
    const actor = fighter("roman_hastati");
    const request = {
        weaponId: "pilum",
        mode: "thrust",
        skillId: "spear",
        location: "torso",
        facing: "front",
        distance: 1,
        defense: "parry",
        defenseSkillId: "spear",
    };
    assert.equal(
        combat.resolveAttack(actor, actor, request, low).defended,
        true,
    );
    assert.throws(
        () =>
            combat.resolveAttack(
                actor,
                actor,
                { ...request, defenseSkillId: "shortsword" },
                low,
            ),
        /does not match/,
    );
    assert.throws(
        () =>
            combat.resolveAttack(
                actor,
                actor,
                { ...request, skillId: "shortsword" },
                low,
            ),
        /Unsupported skill/,
    );
});

test("pain threshold and Fit alter injury and recovery without changing equipment", () => {
    const actor = naked();
    const strong = {
        ...actor,
        profile: {
            ...actor.profile,
            lens: {
                ...actor.profile.lens,
                advantages: ["high_pain_threshold", "fit"],
            },
        },
    };
    assert.equal(
        combat.applyInjury(strong, hit(2, "cr"), low).combatant.state.shock,
        0,
    );
    const tired = combat.spendFatigue(strong, 3, low);
    assert.equal(combat.recoverFatigue(tired, 5).state.fp, strong.maxFP - 2);
    assert.equal(
        combat.recoverFatigue(combat.spendFatigue(actor, 3, low), 5).state.fp,
        actor.maxFP - 3,
    );
});

test("eye hits use -9, x4 injury and no natural skull resistance", () => {
    const attacker = fighter("roman_hastati");
    attacker.equipment = attacker.equipment.map((entry) => ({
        ...entry,
        placement:
            entry.itemId === "gladius"
                ? "main-hand"
                : entry.placement === "main-hand"
                  ? "carried"
                  : entry.placement,
    }));
    const defender = naked();
    const weapon = attacker.equipment.find(
        (entry) => entry.placement === "main-hand",
    ).item;
    const request = {
        weaponId: weapon.id,
        mode: "thrust",
        skillId: weapon.attackSkills.thrust,
        location: "torso",
        facing: "front",
        distance: 1,
        defense: "none",
    };
    const torso = combat.resolveAttack(attacker, defender, request, low);
    const eyes = combat.resolveAttack(
        attacker,
        defender,
        { ...request, location: "eyes" },
        low,
    );
    assert.equal(eyes.attackTarget, torso.attackTarget - 9);
    assert.equal(
        combat.armorResistance(defender, hit(3, "imp", "skull"), low),
        2,
    );
    const result = combat.resolveDamage(defender, hit(3, "imp", "eyes"), low);
    assert.deepEqual(result, {
        damageResistance: 0,
        penetratingDamage: 3,
        injury: 12,
    });
    assert.equal(
        combat.getInjuryCheck(defender.profile, 10, 6, "eyes").target,
        combat.getInjuryCheck(defender.profile, 10, 6, "skull").target,
    );
    assert.throws(
        () =>
            combat.resolveAttack(
                attacker,
                defender,
                {
                    ...request,
                    mode: "swing",
                    skillId: weapon.attackSkills.swing,
                    location: "eyes",
                },
                low,
            ),
        /Eye attacks require impaling/,
    );
    assert.throws(
        () => combat.resolveDamage(defender, hit(3, "cut", "eyes"), low),
        /Eye injuries require impaling/,
    );
});

test("separate Will determines mana and bounded operations preserve HP and FP", () => {
    const profile = {
        ...PREGENERATED_FIGHTERS[0],
        will: 13,
        attributes: { ...PREGENERATED_FIGHTERS[0].attributes, IQ: 8 },
    };
    const actor = combat.createCombatant(profile);
    assert.equal(actor.maxMana, 13);
    assert.equal(actor.state.mana, 13);
    const spent = combat.spendMana(actor, 10);
    assert.equal(spent.state.mana, 3);
    assert.equal(spent.state.hp, actor.state.hp);
    assert.equal(spent.state.fp, actor.state.fp);
    assert.equal(actor.state.mana, 13);
    assert.throws(() => combat.spendMana(spent, 4), /Not enough mana/);
    assert.throws(() => combat.spendMana(actor, -1), /Mana cost/);
    assert.throws(() => combat.recoverMana(actor, 1.5), /Mana recovery/);
    assert.equal(combat.recoverMana(spent, 99).state.mana, 13);
    const restored = combat.restoreManaWithEffort(spent, low);
    assert.equal(restored.state.mana, 9);
    assert.equal(restored.state.fp, actor.state.fp - 1);
    assert.equal(restored.state.hp, actor.state.hp);
    assert.equal(combat.beginTurn(restored, low).state.mana, 9);
    assert.equal(combat.endTurn(restored, low).state.mana, 9);
    assert.throws(
        () =>
            combat.restoreManaWithEffort(
                { ...spent, state: { ...spent.state, fp: 0 } },
                low,
            ),
        /requires 1 FP/,
    );
    assert.throws(
        () => combat.createCombatant({ ...profile, will: 0 }),
        /Will/,
    );
});
