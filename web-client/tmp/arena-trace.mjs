import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const seed = Number.parseInt(process.argv[2] ?? "43117", 10);
const actorNumber = Number.parseInt(process.argv[3] ?? "9", 10);
const arenaSource = fs.readFileSync(
    path.join(projectRoot, "app", "arena", "page.tsx"),
    "utf8",
);
const generationSource = fs.readFileSync(
    path.join(projectRoot, "app", "arena", "combatant-generation.ts"),
    "utf8",
);
const transpile = (source, moduleKind) =>
    ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: moduleKind,
        },
    }).outputText;
const generationModule = { exports: {} };
new Function(
    "exports",
    "module",
    transpile(generationSource, ts.ModuleKind.CommonJS),
)(generationModule.exports, generationModule);
const generation = generationModule.exports;
const importEndMarker = '} from "./combatant-generation";';
const pureEndMarker = "const FighterRow =";
const pureSource = arenaSource.slice(
    arenaSource.indexOf(importEndMarker) + importEndMarker.length,
    arenaSource.indexOf(pureEndMarker),
);
const compiled = transpile(pureSource, ts.ModuleKind.None);
const dependencyNames = [
    "AMRITAR_DUST_SPEARMAN_LENS_ID",
    "AMRITAR_DUST_SERGEANT_LENS_ID",
    "AMRITAR_GUARD_OF_THE_HAND_LENS_ID",
    "AMRITAR_GUARD_SERGEANT_LENS_ID",
    "AMRITAR_SOLDIER_SPECIALIZATION_ID",
    "applyCommandLens",
    "generateFighterProfile",
    "getPrimaryCombatSkill",
    "getSkillLevel",
    "getSkillPoints",
    "profileHasAdvantage",
];
const dependencyValues = dependencyNames.map((name) => generation[name]);
const battleApi = new Function(
    ...dependencyNames,
    `${compiled}\nreturn { createArenaSetup, advanceBattle, getFormationContext, getFormationRoleAssignment, assessHoldPosition, distanceBetween, getNeighbors, toKey };`,
)(...dependencyValues);
const setup = battleApi.createArenaSetup(seed);
const obstacleKeys = new Set(setup.obstacles.map((obstacle) => obstacle.key));
let battle = { ...setup.battle, phase: "running" };
const initialActor = battle.combatants.find(
    (combatant) =>
        combatant.team === "blue" && combatant.number === actorNumber,
);
const trace = [];

while (battle.phase === "running" && battle.turn < 40) {
    const previousBattle = battle;
    const previousActor = previousBattle.combatants.find(
        (combatant) => combatant.id === initialActor.id,
    );
    const previousLiving = previousBattle.combatants.filter(
        (combatant) => combatant.health > 0,
    );
    const previousEnemies = previousLiving.filter(
        (combatant) => combatant.team !== previousActor.team,
    );
    const previousContext = battleApi.getFormationContext(
        previousActor,
        previousLiving,
    );
    const previousAllies = previousContext
        ? previousContext.squadMembers.filter(
              (combatant) => combatant.id !== previousActor.id,
          )
        : [];
    const previousTeamAllies = previousLiving.filter(
        (combatant) =>
            combatant.team === previousActor.team &&
            combatant.id !== previousActor.id,
    );
    const previousAssignment = previousContext
        ? battleApi.getFormationRoleAssignment(previousActor)
        : null;
    const previousBlocked = new Set([
        ...obstacleKeys,
        ...previousLiving.map((combatant) =>
            battleApi.toKey(combatant.position),
        ),
    ]);
    previousBlocked.delete(battleApi.toKey(previousActor.position));
    const formationCandidates = previousAssignment
        ? [
              previousActor.position,
              ...battleApi.getNeighbors(previousActor.position),
          ]
              .filter((position) => {
                  const key = battleApi.toKey(position);
                  return (
                      key === battleApi.toKey(previousActor.position) ||
                      !previousBlocked.has(key)
                  );
              })
              .map((position) =>
                  battleApi.assessHoldPosition(
                      previousActor,
                      position,
                      previousAllies,
                      previousTeamAllies,
                      previousEnemies,
                      previousAssignment,
                  ),
              )
        : [];
    battle = battleApi.advanceBattle(battle, obstacleKeys, seed);
    const actor = battle.combatants.find(
        (combatant) => combatant.id === initialActor.id,
    );
    const living = battle.combatants.filter((combatant) => combatant.health > 0);
    const enemies = living.filter((combatant) => combatant.team !== actor.team);
    const context = battleApi.getFormationContext(actor, living);
    const assignment = context
        ? battleApi.getFormationRoleAssignment(actor)
        : null;
    const allies = context
        ? context.squadMembers.filter((combatant) => combatant.id !== actor.id)
        : [];
    const nearestAlly = [...allies].sort(
        (left, right) =>
            battleApi.distanceBetween(actor.position, left.position) -
            battleApi.distanceBetween(actor.position, right.position),
    )[0];
    const nearestEnemy = [...enemies].sort(
        (left, right) =>
            battleApi.distanceBetween(actor.position, left.position) -
            battleApi.distanceBetween(actor.position, right.position),
    )[0];
    const previousFirstLog = previousBattle.log[0];
    const oldLogIndex = battle.log.indexOf(previousFirstLog);
    const newLogs = (
        oldLogIndex >= 0 ? battle.log.slice(0, oldLogIndex) : battle.log
    ).filter((entry) => entry.includes(actor.name));
    const summaryLogs = (
        oldLogIndex >= 0 ? battle.log.slice(0, oldLogIndex) : battle.log
    ).filter((entry) => !entry.startsWith("Hearing"));

    trace.push({
        turn: battle.turn,
        position: battleApi.toKey(actor.position),
        lastMovementPath: actor.lastMovementPath.map(battleApi.toKey),
        health: actor.health,
        maneuver: actor.maneuver,
        order: actor.receivedOrder,
        directive: actor.receivedDirective,
        focusTargetId: actor.focusTargetId,
        role: assignment?.role ?? null,
        observedFormationFacing: actor.observedFormationFacing,
        observedFormationFacingUpdatedTurn:
            actor.observedFormationFacingUpdatedTurn,
        orderedFormationFacing: actor.orderedFormationFacing,
        effectiveFormationFacing:
            actor.orderedFormationFacing ?? actor.observedFormationFacing,
        nearestAlly: nearestAlly
            ? {
                  number: nearestAlly.number,
                  distance: battleApi.distanceBetween(
                      actor.position,
                      nearestAlly.position,
                  ),
              }
            : null,
        nearestEnemy: nearestEnemy
            ? {
                  number: nearestEnemy.number,
                  distance: battleApi.distanceBetween(
                      actor.position,
                      nearestEnemy.position,
                  ),
              }
            : null,
        formationCandidates: formationCandidates.map((assessment) => ({
            position: battleApi.toKey(assessment.position),
            alliesDirectlyAhead: assessment.alliesDirectlyAhead,
            roleConnections: assessment.roleConnections,
            preferredRoleConnections: assessment.preferredRoleConnections,
            attackableEnemies: assessment.attackableEnemies,
            supportedSurroundedAllies:
                assessment.supportedSurroundedAllies,
            supportedThreatenedAllies:
                assessment.supportedThreatenedAllies,
            adjacentAllies: assessment.adjacentAllies,
            threateningEnemies: assessment.threateningEnemies,
            distanceToClosestEnemy: assessment.distanceToClosestEnemy,
            distanceToClosestAlly: assessment.distanceToClosestAlly,
            movementDistance: assessment.movementDistance,
        })),
        logs: newLogs,
        summaryLogs,
    });
}

process.stdout.write(
    `${JSON.stringify(
        {
            fighter: `${initialActor.name} #${initialActor.number}`,
            lens: initialActor.profile.lens.label,
            trace,
        },
        null,
        2,
    )}\n`,
);
