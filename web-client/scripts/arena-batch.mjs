import {
    loadArenaEngine,
    loadArenaModule,
} from "./load-arena-engine.mjs";

const battleCount = Number.parseInt(process.argv[2] ?? "100", 10);
const firstSeed = Number.parseInt(process.argv[3] ?? "43117", 10);
const scenario = process.argv[4] ?? "standard";
const maxTurns = 300;
if (!Number.isFinite(battleCount) || battleCount < 1) {
    throw new Error("Battle count must be a positive integer.");
}
const battleApi = {
    ...loadArenaEngine(),
    ...loadArenaModule("arena"),
    ...loadArenaModule("engine"),
};
const results = [];
const eventTrace = [];
const maneuverCounts = {};
const specializationCohesion = {
    matched: { samples: 0, totalDistance: 0 },
    foreign: { samples: 0, totalDistance: 0 },
};
const cohesion = {
    beforeContact: { samples: 0, totalDistance: 0, withinFour: 0, withinEight: 0 },
    melee: { samples: 0, totalDistance: 0, withinFour: 0, withinEight: 0 },
};

const sampleCohesion = (battle) => {
    const living = battle.combatants.filter((combatant) => combatant.health > 0);
    const blue = living.filter((combatant) => combatant.team === "blue");
    const red = living.filter((combatant) => combatant.team === "red");
    const contact = blue.some((blueCombatant) =>
        red.some(
            (redCombatant) =>
                battleApi.areAdjacent(
                    blueCombatant.position,
                    redCombatant.position,
                ),
        ),
    );
    const bucket = contact ? cohesion.melee : cohesion.beforeContact;

    blue.forEach((combatant) => {
        if (combatant.profile.commandLens) {
            return;
        }
        const sergeant = blue.find(
            (candidate) =>
                candidate.profile.commandLens &&
                candidate.profile.lens.id === combatant.profile.lens.id,
        );
        if (!sergeant) {
            return;
        }
        const distance = battleApi.getDistanceMeters(
            combatant.position,
            sergeant.position,
        );
        bucket.samples += 1;
        bucket.totalDistance += distance;
        bucket.withinFour += distance <= 4 ? 1 : 0;
        bucket.withinEight += distance <= 8 ? 1 : 0;
        if (
            scenario === "mixed-specializations" &&
            combatant.receivedOrder === "hold"
        ) {
            const specialization = combatant.profile.lens.skills.find(
                (skill) => skill.id === "soldier",
            )?.specialization;
            const specializationBucket =
                specialization === combatant.receivedOrderSpecialization
                    ? specializationCohesion.matched
                    : specializationCohesion.foreign;
            specializationBucket.samples += 1;
            specializationBucket.totalDistance += distance;
        }
    });
};

const applyScenario = (setup) => {
    if (scenario !== "mixed-specializations") {
        return setup;
    }

    const romanNumbers = new Set([4, 5, 6]);
    return {
        ...setup,
        battle: {
            ...setup.battle,
            combatants: setup.battle.combatants.map((combatant) => {
                if (
                    combatant.team !== "blue" ||
                    !romanNumbers.has(combatant.number)
                ) {
                    return combatant;
                }
                return {
                    ...combatant,
                    profile: {
                        ...combatant.profile,
                        lens: {
                            ...combatant.profile.lens,
                            skills: combatant.profile.lens.skills.map((skill) =>
                                skill.id === "soldier"
                                    ? {
                                          ...skill,
                                          label: "Soldier (Roman)",
                                          specialization: "roman",
                                      }
                                    : skill,
                            ),
                        },
                    },
                };
            }),
        },
    };
};

for (let offset = 0; offset < battleCount; offset += 1) {
    const seed = firstSeed + offset;
    const setup = applyScenario(battleApi.createArenaSetup(seed));
    const obstacleKeys = new Set(setup.obstacles.map((obstacle) => obstacle.key));
    let battle = { ...setup.battle, phase: "running" };
    let firstContactTurn = null;
    let firstInjuryTurn = null;
    let lastInjuryTurn = null;

    sampleCohesion(battle);
    while (battle.phase === "running" && battle.turn <= maxTurns) {
        const previousBattle = battle;
        const healthBefore = battle.combatants.reduce(
            (total, combatant) => total + combatant.health,
            0,
        );
        battle = battleApi.advanceBattle(battle, obstacleKeys, seed);
        battle.combatants
            .filter((combatant) => combatant.health > 0)
            .forEach((combatant) => {
                maneuverCounts[combatant.maneuver] =
                    (maneuverCounts[combatant.maneuver] ?? 0) + 1;
            });
        if (scenario === "mixed-specializations" && offset === 0) {
            const previousById = new Map(
                previousBattle.combatants.map((combatant) => [
                    combatant.id,
                    combatant,
                ]),
            );
            battle.combatants.forEach((combatant) => {
                const previous = previousById.get(combatant.id);
                if (!previous) {
                    return;
                }
                const soldier = combatant.profile.lens.skills.find(
                    (skill) => skill.id === "soldier",
                );
                if (
                    combatant.receivedOrder !== previous.receivedOrder &&
                    combatant.receivedOrder !== null
                ) {
                    const sergeant = battle.combatants.find(
                        (candidate) =>
                            candidate.team === combatant.team &&
                            candidate.profile.commandLens &&
                            candidate.profile.lens.id ===
                                combatant.profile.lens.id,
                    );
                    eventTrace.push({
                        turn: battle.turn - 1,
                        event: "order_received",
                        fighter: `${combatant.name} #${combatant.number}`,
                        specialization: soldier?.specialization ?? null,
                        order: combatant.receivedOrder,
                        orderSpecialization:
                            combatant.receivedOrderSpecialization,
                        distanceToSergeantMeters: sergeant
                            ? battleApi.getDistanceMeters(
                                  combatant.position,
                                  sergeant.position,
                              )
                            : null,
                    });
                }
                if (
                    combatant.receivedDirective !== previous.receivedDirective &&
                    combatant.receivedDirective !== null
                ) {
                    const sergeant = battle.combatants.find(
                        (candidate) =>
                            candidate.team === combatant.team &&
                            candidate.profile.commandLens &&
                            candidate.profile.lens.id ===
                                combatant.profile.lens.id,
                    );
                    eventTrace.push({
                        turn: battle.turn - 1,
                        event: "addressed_order_received",
                        fighter: `${combatant.name} #${combatant.number}`,
                        directive: combatant.receivedDirective,
                        distanceToSergeantMeters: sergeant
                            ? battleApi.getDistanceMeters(
                                  combatant.position,
                                  sergeant.position,
                              )
                            : null,
                    });
                }
                if (previous.health > 0 && combatant.health === 0) {
                    eventTrace.push({
                        turn: battle.turn - 1,
                        event: "fighter_down",
                        fighter: `${combatant.name} #${combatant.number}`,
                        team: combatant.team,
                        specialization: soldier?.specialization ?? null,
                    });
                }
            });
        }
        const livingBlue = battle.combatants.filter(
            (combatant) => combatant.team === "blue" && combatant.health > 0,
        );
        const livingRed = battle.combatants.filter(
            (combatant) => combatant.team === "red" && combatant.health > 0,
        );
        if (
            firstContactTurn === null &&
            livingBlue.some((blueCombatant) =>
                livingRed.some((redCombatant) =>
                    battleApi.areAdjacent(
                        blueCombatant.position,
                        redCombatant.position,
                    ),
                ),
            )
        ) {
            firstContactTurn = battle.turn - 1;
        }
        const healthAfter = battle.combatants.reduce(
            (total, combatant) => total + combatant.health,
            0,
        );
        if (firstInjuryTurn === null && healthAfter < healthBefore) {
            firstInjuryTurn = battle.turn - 1;
        }
        if (healthAfter < healthBefore) {
            lastInjuryTurn = battle.turn - 1;
        }
        sampleCohesion(battle);
    }

    results.push({
        seed,
        winner: battle.winner ?? "timeout",
        turns: battle.turn - 1,
        firstContactTurn,
        firstInjuryTurn,
        lastInjuryTurn,
        blueAlive: battle.combatants.filter(
            (combatant) => combatant.team === "blue" && combatant.health > 0,
        ).length,
        redAlive: battle.combatants.filter(
            (combatant) => combatant.team === "red" && combatant.health > 0,
        ).length,
        survivors:
            scenario === "mixed-specializations"
                ? battle.combatants
                      .filter((combatant) => combatant.health > 0)
                      .map((combatant) => ({
                          fighter: `${combatant.name} #${combatant.number}`,
                          team: combatant.team,
                          health: combatant.health,
                          specialization:
                              combatant.profile.lens.skills.find(
                                  (skill) => skill.id === "soldier",
                              )?.specialization ?? null,
                      }))
                : undefined,
        remaining:
            battle.winner === null
                ? battle.combatants
                      .filter((combatant) => combatant.health > 0)
                      .map((combatant) => ({
                          team: combatant.team,
                          number: combatant.number,
                          health: combatant.health,
                          maneuver: combatant.maneuver,
                          position: combatant.position,
                      }))
                : undefined,
    });
}

const summarizeCohesion = (bucket) => ({
    samples: bucket.samples,
    averageDistanceMeters:
        bucket.samples > 0 ? bucket.totalDistance / bucket.samples : null,
    withinFourMetersRatio:
        bucket.samples > 0 ? bucket.withinFour / bucket.samples : null,
    withinEightMetersRatio:
        bucket.samples > 0 ? bucket.withinEight / bucket.samples : null,
});
const winnerCounts = results.reduce((counts, result) => {
    counts[result.winner] = (counts[result.winner] ?? 0) + 1;
    return counts;
}, {});

process.stdout.write(
    `${JSON.stringify(
        {
            battleCount,
            firstSeed,
            lastSeed: firstSeed + battleCount - 1,
            scenario,
            winnerCounts,
            maneuverCounts,
            averageTurns:
                results.reduce((total, result) => total + result.turns, 0) /
                results.length,
            averageSurvivors: {
                blue:
                    results.reduce(
                        (total, result) => total + result.blueAlive,
                        0,
                    ) / results.length,
                red:
                    results.reduce(
                        (total, result) => total + result.redAlive,
                        0,
                    ) / results.length,
            },
            cohesion: {
                beforeContact: summarizeCohesion(cohesion.beforeContact),
                melee: summarizeCohesion(cohesion.melee),
            },
            specializationCohesion:
                scenario === "mixed-specializations"
                    ? Object.fromEntries(
                          Object.entries(specializationCohesion).map(
                              ([key, bucket]) => [
                                  key,
                                  {
                                      samples: bucket.samples,
                                      averageDistanceMeters:
                                          bucket.samples > 0
                                              ? bucket.totalDistance /
                                                bucket.samples
                                              : null,
                                  },
                              ],
                          ),
                      )
                    : undefined,
            eventTrace:
                scenario === "mixed-specializations"
                    ? eventTrace.slice(0, 80)
                    : undefined,
            longestBattles: [...results]
                .sort((left, right) => right.turns - left.turns)
                .slice(0, 5),
        },
        null,
        2,
    )}\n`,
);
