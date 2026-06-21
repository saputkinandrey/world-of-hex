import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const domainAdminDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);
const workspaceDirectory = path.resolve(domainAdminDirectory, "..");

const readWorkspaceFile = (relativePath) => {
    return fs.readFileSync(path.join(workspaceDirectory, relativePath), "utf8");
};

const creatureProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/lizard.generic.json",
    ),
);
const animalProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.json",
    ),
);
const dinosaurProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.json",
    ),
);
const dinosaurBirdProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.bird.json",
    ),
);
const dinosaurBirdGrouseProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.bird.grouse.json",
    ),
);
const dinosaurCeratopsianProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.ceratopsian.json",
    ),
);
const dinosaurOrnithopodProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.ornithopod.json",
    ),
);
const dinosaurSauropodProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.sauropod.json",
    ),
);
const dinosaurTheropodProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.theropod.json",
    ),
);
const fishProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.fish.json",
    ),
);
const fishCharProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.fish.char.json",
    ),
);
const fishSalmonProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.fish.salmon.json",
    ),
);
const insectProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.insect.json",
    ),
);
const insectBeeProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.insect.bee.json",
    ),
);
const invertebrateProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.json",
    ),
);
const invertebrateCrustaceanProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.crustacean.json",
    ),
);
const invertebrateCrabProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.crustacean.crab.json",
    ),
);
const invertebrateMolluskProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.mollusk.json",
    ),
);
const invertebrateMusselProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.mollusk.mussel.json",
    ),
);
const invertebrateOysterProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.mollusk.oyster.json",
    ),
);
const mammalProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.json",
    ),
);
const mammalArtiodactylProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.json",
    ),
);
const mammalArtiodactylCamelProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.camel.json",
    ),
);
const mammalArtiodactylCowProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.cow.json",
    ),
);
const mammalArtiodactylDeerProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.deer.json",
    ),
);
const mammalArtiodactylGoatProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.goat.json",
    ),
);
const mammalArtiodactylMooseProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.moose.json",
    ),
);
const mammalArtiodactylPigProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.pig.json",
    ),
);
const mammalArtiodactylSheepProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.sheep.json",
    ),
);
const mammalCanineProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.canine.json",
    ),
);
const mammalEquidProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.equid.json",
    ),
);
const mammalEquidHorseProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.equid.horse.json",
    ),
);
const mammalFelineProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.feline.json",
    ),
);
const mammalPrimateProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.primate.json",
    ),
);
const mammalPrimateChimpanzeeProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.primate.chimpanzee.json",
    ),
);
const mammalPrimateGorillaProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.primate.gorilla.json",
    ),
);
const mammalPrimateHumanProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.primate.human.json",
    ),
);
const mammalRodentProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.rodent.json",
    ),
);
const plantProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.json",
    ),
);
const plantAquaticWetlandProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.aquatic_wetland.json",
    ),
);
const plantClimberProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.climber.json",
    ),
);
const plantHerbaceousProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.herbaceous.json",
    ),
);
const plantWoodyProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.woody.json",
    ),
);
const plantWoodyShrubProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.woody.shrub.json",
    ),
);
const plantWoodyTreeProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.woody.tree.json",
    ),
);
const adzukiBeanPlantProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.source.adzuki-bean-plant.json",
    ),
);
const reptileProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.reptile.json",
    ),
);
const crocodileTemplateProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.reptile.crocodile.json",
    ),
);
const lizardTemplateProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.reptile.lizard.json",
    ),
);
const snakeTemplateProfile = JSON.parse(
    readWorkspaceFile(
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.reptile.snake.json",
    ),
);

assert.equal(
    creatureProfile.kind,
    "species",
    "Lizard profile must be a species.",
);
assert.ok(
    Array.isArray(creatureProfile.memes) &&
        Array.isArray(creatureProfile.morphs) &&
        Array.isArray(creatureProfile.traits) &&
        Array.isArray(creatureProfile.actions),
    "Creature profile schema should retain memes, morphs, traits and actions arrays even though species builder does not edit individual traits.",
);
assert.deepEqual(
    creatureProfile.nutritionNeedsPerDay,
    { energyPerDay: 0, proteinPerDay: 0, waterPerDay: 0, massPerDayLb: 0 },
    "Small Lizard should not retain calculated needs until required species morphs are complete.",
);
assert.deepEqual(
    creatureProfile.physical,
    { baseVolume: 0, minVolume: 0, carryVolumeCapacity: 0 },
    "Small Lizard should not retain calculated physical estimates until required species morphs are complete.",
);
assert.equal(
    creatureProfile.parentId,
    "animal.reptile.lizard",
    "Small Lizard should inherit lizard class traits from Lizard.",
);
assert.equal(
    reptileProfile.parentId,
    "animal",
    "Reptile should inherit carbon-life baseline actions from Animal.",
);
assert.equal(
    dinosaurProfile.parentId,
    "animal",
    "Dinosaur should inherit carbon-life baseline actions from Animal.",
);
for (const dinosaurChildProfile of [
    dinosaurCeratopsianProfile,
    dinosaurOrnithopodProfile,
    dinosaurSauropodProfile,
    dinosaurTheropodProfile,
]) {
    assert.equal(
        dinosaurChildProfile.parentId,
        "animal.dinosaur",
        `${dinosaurChildProfile.name} should inherit dinosaur class traits from Dinosaur.`,
    );
}
assert.equal(
    dinosaurBirdProfile.parentId,
    "animal.dinosaur.ornithopod",
    "Bird should inherit dinosaur class traits through Ornithopod.",
);
assert.equal(
    fishProfile.parentId,
    "animal",
    "Fish should inherit carbon-life baseline actions from Animal.",
);
assert.equal(
    insectProfile.parentId,
    "animal",
    "Insect should inherit carbon-life baseline actions from Animal.",
);
assert.equal(
    invertebrateProfile.parentId,
    "animal",
    "Invertebrate should inherit carbon-life baseline actions from Animal.",
);
assert.equal(
    invertebrateCrustaceanProfile.parentId,
    "animal.invertebrate",
    "Crustacean should inherit invertebrate class traits from Invertebrate.",
);
assert.equal(
    invertebrateMolluskProfile.parentId,
    "animal.invertebrate",
    "Mollusk should inherit invertebrate class traits from Invertebrate.",
);
assert.equal(
    mammalProfile.parentId,
    "animal",
    "Mammal should inherit carbon-life baseline actions from Animal.",
);
assert.equal(
    lizardTemplateProfile.parentId,
    "animal.reptile",
    "Lizard should inherit reptile class traits from Reptile.",
);
for (const mammalChildProfile of [
    mammalArtiodactylProfile,
    mammalCanineProfile,
    mammalEquidProfile,
    mammalFelineProfile,
    mammalPrimateProfile,
    mammalRodentProfile,
]) {
    assert.equal(
        mammalChildProfile.parentId,
        "animal.mammal",
        `${mammalChildProfile.name} should inherit mammal class traits from Mammal.`,
    );
}
const speciesParentExpectations = [
    [dinosaurBirdGrouseProfile, "animal.dinosaur.bird"],
    [fishCharProfile, "animal.fish"],
    [fishSalmonProfile, "animal.fish"],
    [insectBeeProfile, "animal.insect"],
    [invertebrateCrabProfile, "animal.invertebrate.crustacean"],
    [invertebrateMusselProfile, "animal.invertebrate.mollusk"],
    [invertebrateOysterProfile, "animal.invertebrate.mollusk"],
    [mammalArtiodactylCamelProfile, "animal.mammal.artiodactyl"],
    [mammalArtiodactylCowProfile, "animal.mammal.artiodactyl"],
    [mammalArtiodactylDeerProfile, "animal.mammal.artiodactyl"],
    [mammalArtiodactylGoatProfile, "animal.mammal.artiodactyl"],
    [mammalArtiodactylMooseProfile, "animal.mammal.artiodactyl"],
    [mammalArtiodactylPigProfile, "animal.mammal.artiodactyl"],
    [mammalArtiodactylSheepProfile, "animal.mammal.artiodactyl"],
    [mammalEquidHorseProfile, "animal.mammal.equid"],
];
for (const [speciesProfile, expectedParentId] of speciesParentExpectations) {
    assert.equal(
        speciesProfile.kind,
        "species",
        `${speciesProfile.name} should be a concrete species profile.`,
    );
    assert.equal(
        speciesProfile.parentId,
        expectedParentId,
        `${speciesProfile.name} should inherit from ${expectedParentId}.`,
    );
}
for (const primateChildProfile of [
    mammalPrimateChimpanzeeProfile,
    mammalPrimateGorillaProfile,
    mammalPrimateHumanProfile,
]) {
    assert.equal(
        primateChildProfile.parentId,
        "animal.mammal.primate",
        `${primateChildProfile.name} should inherit primate class traits from Primate.`,
    );
}
assert.equal(plantProfile.kind, "template", "Plant root should be a template.");
assert.equal(
    plantProfile.parentId,
    undefined,
    "Plant root should not inherit animal behavior.",
);
assert.ok(
    plantProfile.morphs.includes("core.vital.plant_living") &&
        !plantProfile.morphs.includes("core.vital.living"),
    "Plant root should use plant-specific living physiology instead of animal carbon-life actions.",
);
for (const plantChildProfile of [
    plantAquaticWetlandProfile,
    plantClimberProfile,
    plantHerbaceousProfile,
    plantWoodyProfile,
]) {
    assert.equal(
        plantChildProfile.parentId,
        "plant",
        `${plantChildProfile.name} should inherit plant baseline traits from Plant.`,
    );
}
for (const woodyPlantChildProfile of [
    plantWoodyShrubProfile,
    plantWoodyTreeProfile,
]) {
    assert.equal(
        woodyPlantChildProfile.parentId,
        "plant.woody",
        `${woodyPlantChildProfile.name} should inherit woody plant traits from Woody Plant.`,
    );
}
assert.equal(
    crocodileTemplateProfile.parentId,
    "animal.reptile",
    "Crocodile should inherit reptile class traits from Reptile.",
);
assert.equal(
    snakeTemplateProfile.parentId,
    "animal.reptile",
    "Snake should inherit reptile class traits from Reptile.",
);
for (const expectedAnimalMorph of [
    "morph.attribute.dx.dx10",
    "morph.attribute.ht.ht10",
    "core.vital.living",
    "core.perception",
    "core.motor_coordination",
]) {
    assert.ok(
        animalProfile.morphs.includes(expectedAnimalMorph),
        `Animal profile should carry shared animal morph ${expectedAnimalMorph}.`,
    );
}
assert.ok(
    animalProfile.memes.includes("tech.combat.core"),
    "Animal profile should carry shared body-combat baseline meme.",
);
for (const expectedDinosaurMorph of [
    "cog.iq3",
    "eth.maintenance.thermoregulation",
    "morph.thermoreg.warmBlooded",
    "morph.respiration.lungs_high_efficiency",
    "morph.sense.vision_basic",
    "morph.sense.olfaction_basic",
    "morph.sense.hearing_basic",
]) {
    assert.ok(
        dinosaurProfile.morphs.includes(expectedDinosaurMorph),
        `Dinosaur profile should carry shared dinosaur morph ${expectedDinosaurMorph}.`,
    );
}
assert.ok(
    dinosaurProfile.memes.length === 0 &&
        !dinosaurProfile.morphs.includes("morph.thermoreg.coldBlooded") &&
        !dinosaurProfile.morphs.includes("eth.maintenance.ecdysis") &&
        !dinosaurProfile.morphs.includes("eth.predation.core") &&
        !dinosaurProfile.morphs.includes("morph.integument.scales_dry"),
    "Dinosaur root should stay separate from reptile-only and predator-only traits.",
);
for (const expectedBirdMorph of [
    "morph.body_plan.avian",
    "morph.integument.feathers_basic",
    "morph.locomotion.fly_flapping",
    "morph.locomotion.glide_basic",
    "morph.natural_weapon.claws_small",
    "morph.sense.vision_binocular",
    "morph.sense.vision_color_rich",
]) {
    assert.ok(
        dinosaurBirdProfile.morphs.includes(expectedBirdMorph),
        `Bird profile should carry shared bird morph ${expectedBirdMorph}.`,
    );
}
assert.ok(
    !dinosaurBirdProfile.morphs.includes("morph.thermoreg.coldBlooded") &&
        !dinosaurBirdProfile.morphs.includes("eth.maintenance.ecdysis") &&
        !dinosaurBirdProfile.morphs.includes("eth.predation.core"),
    "Bird profile should not inherit cold-blooded reptile or predator-only traits.",
);
for (const expectedTheropodMorph of [
    "eth.predation.core",
    "morph.body_plan.tetrapod_large_ground",
    "morph.locomotion.walk_biped",
    "morph.natural_weapon.bite_large",
    "morph.natural_weapon.claws_large",
    "morph.sense.vision_binocular",
    "morph.sense.olfaction_tracking",
]) {
    assert.ok(
        dinosaurTheropodProfile.morphs.includes(expectedTheropodMorph),
        `Theropod profile should carry shared theropod morph ${expectedTheropodMorph}.`,
    );
}
assert.ok(
    dinosaurTheropodProfile.memes.includes("tech.combat.bite_basic") &&
        dinosaurTheropodProfile.memes.includes("tech.hunting.core") &&
        dinosaurTheropodProfile.memes.includes(
            "eth.predation.drive.prey_drive",
        ) &&
        dinosaurTheropodProfile.memes.includes("eth.tactics.pursuit_chase"),
    "Theropod profile should carry large bipedal predator behavior.",
);
for (const expectedSauropodMorph of [
    "morph.body_plan.tetrapod_large_ground",
    "morph.locomotion.walk_quadruped",
    "morph.manip.mouth_only",
    "morph.natural_weapon.tail_whip",
]) {
    assert.ok(
        dinosaurSauropodProfile.morphs.includes(expectedSauropodMorph),
        `Sauropod profile should carry shared sauropod morph ${expectedSauropodMorph}.`,
    );
}
assert.ok(
    dinosaurSauropodProfile.memes.includes("eth.sociality.cooperative") &&
        !dinosaurSauropodProfile.morphs.includes("eth.predation.core") &&
        !dinosaurSauropodProfile.memes.includes("tech.hunting.core"),
    "Sauropod profile should stay herbivore/social without default predation.",
);
for (const expectedCeratopsianMorph of [
    "morph.body_plan.tetrapod_large_ground",
    "morph.locomotion.walk_quadruped",
    "morph.manip.beak_toollike",
    "morph.natural_weapon.beak_peck",
    "morph.natural_weapon.horns_large",
]) {
    assert.ok(
        dinosaurCeratopsianProfile.morphs.includes(expectedCeratopsianMorph),
        `Ceratopsian profile should carry shared ceratopsian morph ${expectedCeratopsianMorph}.`,
    );
}
assert.ok(
    dinosaurCeratopsianProfile.memes.includes("eth.sociality.cooperative") &&
        dinosaurCeratopsianProfile.memes.includes("eth.territory_marking") &&
        !dinosaurCeratopsianProfile.morphs.includes("eth.predation.core"),
    "Ceratopsian profile should carry horned territorial herbivore traits without predation.",
);
for (const expectedOrnithopodMorph of [
    "morph.locomotion.walk_biped",
    "morph.manip.beak_toollike",
    "morph.natural_weapon.beak_peck",
    "morph.sense.vision_binocular",
]) {
    assert.ok(
        dinosaurOrnithopodProfile.morphs.includes(expectedOrnithopodMorph),
        `Ornithopod profile should carry shared ornithopod morph ${expectedOrnithopodMorph}.`,
    );
}
assert.ok(
    dinosaurOrnithopodProfile.memes.includes("eth.sociality.cooperative") &&
        !dinosaurOrnithopodProfile.morphs.includes("eth.predation.core") &&
        !dinosaurOrnithopodProfile.memes.includes("tech.hunting.core") &&
        !dinosaurOrnithopodProfile.morphs.includes(
            "morph.body_plan.tetrapod_large_ground",
        ) &&
        !dinosaurOrnithopodProfile.morphs.includes(
            "morph.locomotion.walk_quadruped",
        ) &&
        !dinosaurOrnithopodProfile.morphs.includes("morph.manip.mouth_only"),
    "Ornithopod profile should stay social herbivore and remain clean for bird inheritance.",
);
for (const expectedFishMorph of [
    "cog.iq2",
    "morph.body_plan.fish_like",
    "morph.locomotion.swim_basic",
    "morph.locomotion.swim_fast",
    "morph.respiration.gills_aquatic",
    "morph.integument.scales_smooth",
    "morph.sense.vision_basic",
    "morph.sense.olfaction_basic",
    "morph.sense.lateral_line",
]) {
    assert.ok(
        fishProfile.morphs.includes(expectedFishMorph),
        `Fish profile should carry shared fish morph ${expectedFishMorph}.`,
    );
}
assert.ok(
    fishProfile.memes.length === 0 &&
        !fishProfile.morphs.includes("eth.predation.core") &&
        !fishProfile.morphs.includes("morph.thermoreg.coldBlooded") &&
        !fishProfile.morphs.includes("morph.thermoreg.warmBlooded") &&
        !fishProfile.morphs.includes("morph.respiration.lungs_basic") &&
        !fishProfile.morphs.includes("morph.integument.fur_basic"),
    "Fish profile should not inherit mammal-only, reptile-only or predation-only traits.",
);
for (const expectedInsectMorph of [
    "cog.iq2",
    "morph.body_plan.hexapod_insect",
    "morph.integument.exoskeleton_chitin",
    "morph.locomotion.fly_flapping",
    "morph.locomotion.hover_insect",
    "morph.manip.mouth_only",
    "morph.natural_weapon.stinger_small",
    "morph.sense.vision_basic",
    "morph.sense.olfaction_basic",
    "morph.sense.vibration_ground",
]) {
    assert.ok(
        insectProfile.morphs.includes(expectedInsectMorph),
        `Insect profile should carry shared insect morph ${expectedInsectMorph}.`,
    );
}
assert.ok(
    insectProfile.memes.length === 0 &&
        !insectProfile.morphs.includes("eth.predation.core") &&
        !insectProfile.morphs.includes("morph.thermoreg.coldBlooded") &&
        !insectProfile.morphs.includes("morph.thermoreg.warmBlooded") &&
        !insectProfile.morphs.includes("morph.integument.fur_basic") &&
        !insectProfile.morphs.includes("morph.body_plan.fish_like"),
    "Insect profile should not inherit mammal-only, reptile-only, fish-only or predation-only traits.",
);
for (const expectedMammalMorph of [
    "cog.iq3",
    "eth.maintenance.thermoregulation",
    "morph.thermoreg.warmBlooded",
    "morph.respiration.lungs_basic",
    "morph.integument.fur_basic",
    "morph.sense.vision_basic",
    "morph.sense.olfaction_basic",
    "morph.sense.hearing_basic",
    "morph.sense.hearing_directional",
]) {
    assert.ok(
        mammalProfile.morphs.includes(expectedMammalMorph),
        `Mammal profile should carry shared mammal morph ${expectedMammalMorph}.`,
    );
}
assert.ok(
    mammalProfile.memes.length === 0 &&
        !mammalProfile.morphs.includes("eth.predation.core") &&
        !mammalProfile.morphs.includes("morph.thermoreg.coldBlooded") &&
        !mammalProfile.morphs.includes("morph.integument.scales_dry") &&
        !mammalProfile.morphs.includes("eth.maintenance.ecdysis") &&
        !mammalProfile.morphs.includes("morph.body_plan.tetrapod_small_ground"),
    "Mammal profile should not inherit reptile-only, predation-only or concrete body-plan traits.",
);
for (const expectedFelineMorph of [
    "eth.predation.core",
    "morph.body_plan.tetrapod_climber",
    "morph.locomotion.walk_quadruped",
    "morph.locomotion.climb_rough_surface",
    "morph.natural_weapon.bite_medium",
    "morph.natural_weapon.claws_large",
    "morph.sense.vision_binocular",
    "morph.sense.vision_lowlight",
    "morph.sense.olfaction_tracking",
]) {
    assert.ok(
        mammalFelineProfile.morphs.includes(expectedFelineMorph),
        `Feline profile should carry shared feline morph ${expectedFelineMorph}.`,
    );
}
assert.ok(
    mammalFelineProfile.memes.includes("eth.sociality.solitary") &&
        mammalFelineProfile.memes.includes("tech.combat.bite_basic") &&
        mammalFelineProfile.memes.includes("tech.hunting.core") &&
        mammalFelineProfile.memes.includes("tech.hunting.stalking_basic") &&
        mammalFelineProfile.memes.includes("eth.predation.drive.prey_drive") &&
        mammalFelineProfile.memes.includes("eth.tactics.ambush_stalk"),
    "Feline profile should carry solitary stalking predator behavior.",
);
for (const expectedCanineMorph of [
    "eth.predation.core",
    "morph.body_plan.tetrapod_large_ground",
    "morph.locomotion.walk_quadruped",
    "morph.natural_weapon.bite_medium",
    "morph.sense.olfaction_tracking",
    "morph.sense.vision_binocular",
]) {
    assert.ok(
        mammalCanineProfile.morphs.includes(expectedCanineMorph),
        `Canine profile should carry shared canine morph ${expectedCanineMorph}.`,
    );
}
assert.ok(
    mammalCanineProfile.memes.includes("eth.sociality.cooperative") &&
        mammalCanineProfile.memes.includes("tech.combat.bite_basic") &&
        mammalCanineProfile.memes.includes("tech.hunting.core") &&
        mammalCanineProfile.memes.includes("tech.hunting.tracking_basic") &&
        mammalCanineProfile.memes.includes("eth.predation.drive.prey_drive") &&
        mammalCanineProfile.memes.includes("eth.predation.drive.scavenging") &&
        mammalCanineProfile.memes.includes("eth.tactics.pursuit_chase"),
    "Canine profile should carry cooperative tracking, pursuit and scavenging predator behavior.",
);
for (const expectedPrimateMorph of [
    "cog.iq4",
    "morph.body_plan.tetrapod_climber",
    "morph.locomotion.climb_rough_surface",
    "morph.locomotion.walk_biped",
    "morph.manip.hands_grasping",
    "morph.sense.vision_binocular",
    "morph.sense.vision_color_rich",
]) {
    assert.ok(
        mammalPrimateProfile.morphs.includes(expectedPrimateMorph),
        `Primate profile should carry shared primate morph ${expectedPrimateMorph}.`,
    );
}
assert.ok(
    mammalPrimateProfile.memes.includes("eth.sociality.cooperative") &&
        !mammalPrimateProfile.morphs.includes("eth.predation.core") &&
        !mammalPrimateProfile.memes.includes("tech.hunting.core"),
    "Primate profile should emphasize sociality and manipulation without default predation.",
);
assert.equal(
    mammalPrimateHumanProfile.kind,
    "template",
    "Human should remain a template for future cultures and peoples.",
);
assert.equal(
    mammalPrimateChimpanzeeProfile.kind,
    "species",
    "Chimpanzee should be a concrete species.",
);
assert.equal(
    mammalPrimateGorillaProfile.kind,
    "species",
    "Gorilla should be a concrete species.",
);
for (const expectedHumanMorph of [
    "cog.iq10",
    "morph.size.sm.0",
    "morph.body_plan.humanoid",
    "morph.locomotion.walk_biped",
    "morph.manip.hands_grasping",
    "morph.integument.skin_bare",
]) {
    assert.ok(
        mammalPrimateHumanProfile.morphs.includes(expectedHumanMorph),
        `Human profile should carry human template morph ${expectedHumanMorph}.`,
    );
}
assert.ok(
    mammalPrimateHumanProfile.memes.length === 0 &&
        mammalPrimateHumanProfile.traits.length === 0 &&
        mammalPrimateHumanProfile.physical.averageWeightLb === 145,
    "Human profile should stay biological and leave traits to individual actors.",
);
for (const expectedChimpanzeeMorph of [
    "cog.iq6",
    "morph.size.sm.-1",
    "morph.locomotion.walk_quadruped",
    "morph.manip.claws_simple_grip",
    "morph.natural_weapon.bite_medium",
]) {
    assert.ok(
        mammalPrimateChimpanzeeProfile.morphs.includes(expectedChimpanzeeMorph),
        `Chimpanzee profile should carry chimpanzee morph ${expectedChimpanzeeMorph}.`,
    );
}
assert.ok(
    mammalPrimateChimpanzeeProfile.memes.includes(
        "eth.predation.drive.opportunistic",
    ) &&
        mammalPrimateChimpanzeeProfile.memes.includes("tech.tool.use_basic") &&
        mammalPrimateChimpanzeeProfile.traits.length === 0,
    "Chimpanzee species should carry opportunistic behavior and tool use without individual traits.",
);
assert.deepEqual(
    mammalPrimateChimpanzeeProfile.physical,
    { baseVolume: 0, minVolume: 0, carryVolumeCapacity: 0 },
    "Chimpanzee should not retain physical estimates until required ST morph is present.",
);
for (const expectedGorillaMorph of [
    "cog.iq6",
    "morph.size.sm.0",
    "morph.body_plan.tetrapod_large_ground",
    "morph.locomotion.walk_quadruped",
    "morph.manip.claws_simple_grip",
    "morph.natural_weapon.bite_large",
]) {
    assert.ok(
        mammalPrimateGorillaProfile.morphs.includes(expectedGorillaMorph),
        `Gorilla profile should carry gorilla morph ${expectedGorillaMorph}.`,
    );
}
assert.ok(
    mammalPrimateGorillaProfile.memes.includes("eth.territory_marking") &&
        mammalPrimateGorillaProfile.traits.length === 0 &&
        mammalPrimateGorillaProfile.actions.some(
            (action) =>
                action.moduleName === "action-universal" &&
                action.exportName === "TERRITORY_MICROHABIT_EXPLORE",
        ),
    "Gorilla species should carry large territorial primate behavior without individual traits.",
);
assert.deepEqual(
    mammalPrimateGorillaProfile.physical,
    { baseVolume: 0, minVolume: 0, carryVolumeCapacity: 0 },
    "Gorilla should not retain physical estimates until required ST morph is present.",
);
for (const expectedArtiodactylMorph of [
    "morph.body_plan.tetrapod_large_ground",
    "morph.locomotion.walk_quadruped",
    "morph.manip.mouth_only",
    "morph.manip.forepaws_non_manip",
    "morph.sense.olfaction_tracking",
]) {
    assert.ok(
        mammalArtiodactylProfile.morphs.includes(expectedArtiodactylMorph),
        `Artiodactyl profile should carry shared artiodactyl morph ${expectedArtiodactylMorph}.`,
    );
}
assert.ok(
    mammalArtiodactylProfile.memes.includes("eth.sociality.cooperative") &&
        !mammalArtiodactylProfile.morphs.includes("eth.predation.core") &&
        !mammalArtiodactylProfile.memes.includes("tech.hunting.core"),
    "Artiodactyl profile should keep herd-like sociality without default predation.",
);
for (const expectedRodentMorph of [
    "morph.body_plan.tetrapod_small_ground",
    "morph.locomotion.walk_quadruped",
    "morph.locomotion.burrow_dig",
    "morph.natural_weapon.bite_small",
    "morph.natural_weapon.claws_small",
    "morph.sense.olfaction_tracking",
    "morph.sense.vibration_ground",
]) {
    assert.ok(
        mammalRodentProfile.morphs.includes(expectedRodentMorph),
        `Rodent profile should carry shared rodent morph ${expectedRodentMorph}.`,
    );
}
assert.ok(
    mammalRodentProfile.memes.length === 0 &&
        !mammalRodentProfile.morphs.includes("eth.predation.core") &&
        !mammalRodentProfile.memes.includes("tech.hunting.core") &&
        mammalRodentProfile.actions.some(
            (action) =>
                action.moduleName === "action-universal" &&
                action.exportName === "VIBRATION_ALERT_HIDE",
        ),
    "Rodent profile should keep gnawing/burrowing morphology without default predation.",
);
for (const expectedReptileMorph of [
    "cog.iq2",
    "eth.predation.core",
    "eth.maintenance.thermoregulation",
    "eth.maintenance.ecdysis",
    "morph.thermoreg.coldBlooded",
    "morph.respiration.lungs_basic",
    "morph.integument.scales_dry",
    "morph.sense.vision_basic",
    "morph.sense.olfaction_basic",
    "morph.sense.hearing_basic",
]) {
    assert.ok(
        reptileProfile.morphs.includes(expectedReptileMorph),
        `Reptile profile should carry shared reptile morph ${expectedReptileMorph}.`,
    );
}
for (const expectedLizardMorph of [
    "morph.body_plan.tetrapod_small_ground",
    "morph.locomotion.crawl_quadruped",
    "morph.locomotion.climb_rough_surface",
    "morph.manip.mouth_only",
    "morph.manip.forepaws_non_manip",
    "morph.natural_weapon.bite_small",
    "morph.natural_weapon.claws_small",
    "morph.sense.vision_binocular",
    "morph.sense.vision_color_rich",
    "morph.sense.vibration_ground",
]) {
    assert.ok(
        lizardTemplateProfile.morphs.includes(expectedLizardMorph),
        `Lizard profile should carry shared lizard morph ${expectedLizardMorph}.`,
    );
}
assert.ok(
    reptileProfile.memes.includes("eth.sociality.solitary") &&
        reptileProfile.memes.includes("tech.combat.bite_basic") &&
        reptileProfile.memes.includes("tech.hunting.core") &&
        reptileProfile.memes.includes("eth.predation.drive.prey_drive") &&
        !reptileProfile.memes.some((id) => id.includes("sensing")),
    "Reptile profile should carry broad solitary, bite and hunting behavior without sensory memes.",
);
assert.ok(
    !lizardTemplateProfile.memes.includes("tech.combat.bite_basic") &&
        !lizardTemplateProfile.memes.includes("tech.hunting.core") &&
        !lizardTemplateProfile.memes.includes(
            "eth.predation.drive.prey_drive",
        ) &&
        !lizardTemplateProfile.memes.some((id) => id.includes("sensing")),
    "Lizard profile should inherit broad reptile bite and hunting behavior without duplicating it.",
);
for (const expectedCrocodileMorph of [
    "morph.body_plan.tetrapod_large_ground",
    "morph.locomotion.crawl_quadruped",
    "morph.locomotion.swim_basic",
    "morph.locomotion.swim_fast",
    "morph.manip.mouth_only",
    "morph.manip.forepaws_non_manip",
    "morph.natural_weapon.bite_large",
    "morph.natural_weapon.tail_whip",
    "morph.sense.vibration_ground",
]) {
    assert.ok(
        crocodileTemplateProfile.morphs.includes(expectedCrocodileMorph),
        `Crocodile profile should carry shared crocodilian morph ${expectedCrocodileMorph}.`,
    );
}
assert.ok(
    !crocodileTemplateProfile.memes.includes("tech.combat.bite_basic") &&
        !crocodileTemplateProfile.memes.includes("tech.hunting.core") &&
        !crocodileTemplateProfile.memes.includes(
            "eth.predation.drive.prey_drive",
        ) &&
        crocodileTemplateProfile.memes.includes("eth.tactics.ambush_stalk") &&
        crocodileTemplateProfile.memes.includes("eth.territory_marking") &&
        !crocodileTemplateProfile.memes.some((id) => id.includes("sensing")),
    "Crocodile profile should inherit broad reptile bite and hunting behavior while keeping ambush and territory locally.",
);
assert.ok(
    !crocodileTemplateProfile.morphs.includes(
        "morph.body_plan.tetrapod_small_ground",
    ) &&
        !crocodileTemplateProfile.morphs.includes(
            "morph.body_plan.serpentine_ground",
        ) &&
        !crocodileTemplateProfile.morphs.includes(
            "eth.kinematics.slither_move",
        ) &&
        !crocodileTemplateProfile.morphs.includes(
            "morph.natural_weapon.venom_fangs_front",
        ),
    "Crocodile profile should not inherit lizard-only, snake-only or venom-only morphs.",
);
assert.ok(
    crocodileTemplateProfile.actions.some(
        (action) =>
            action.moduleName === "food-hunt" &&
            action.exportName === "HUNT_WAIT_IN_AMBUSH",
    ) &&
        crocodileTemplateProfile.actions.some(
            (action) =>
                action.moduleName === "action-universal" &&
                action.exportName === "TERRITORY_MICROHABIT_EXPLORE",
        ),
    "Crocodile profile should carry ambush hunting and territorial actions.",
);
for (const expectedSnakeMorph of [
    "eth.kinematics.slither_move",
    "morph.body_plan.serpentine_ground",
    "morph.locomotion.slither_ground",
    "morph.manip.mouth_only",
    "morph.natural_weapon.bite_medium",
    "morph.sense.olfaction_tracking",
    "morph.sense.vibration_ground",
]) {
    assert.ok(
        snakeTemplateProfile.morphs.includes(expectedSnakeMorph),
        `Snake profile should carry shared snake morph ${expectedSnakeMorph}.`,
    );
}
assert.ok(
    !snakeTemplateProfile.memes.includes("tech.combat.bite_basic") &&
        !snakeTemplateProfile.memes.includes("tech.hunting.core") &&
        !snakeTemplateProfile.memes.includes(
            "eth.predation.drive.prey_drive",
        ) &&
        !snakeTemplateProfile.memes.some((id) => id.includes("sensing")),
    "Snake profile should inherit broad reptile bite and hunting behavior without duplicating it.",
);
assert.ok(
    !snakeTemplateProfile.morphs.includes(
        "morph.body_plan.tetrapod_small_ground",
    ) &&
        !snakeTemplateProfile.morphs.includes(
            "morph.locomotion.crawl_quadruped",
        ) &&
        !snakeTemplateProfile.morphs.includes(
            "morph.natural_weapon.claws_small",
        ) &&
        !snakeTemplateProfile.morphs.includes(
            "morph.natural_weapon.constrictor_body",
        ) &&
        !snakeTemplateProfile.morphs.includes(
            "morph.natural_weapon.venom_fangs_front",
        ),
    "Snake profile should not inherit lizard-only, constrictor-only or venom-only morphs.",
);
assert.ok(
    snakeTemplateProfile.actions.some(
        (action) =>
            action.moduleName === "action-snakes" &&
            action.exportName === "SWALLOW_WHOLE_FEEDING",
    ),
    "Snake profile should carry the whole-swallow feeding action.",
);
assert.ok(
    !creatureProfile.morphs.includes("core.perception") &&
        !creatureProfile.morphs.includes("core.motor_coordination") &&
        !creatureProfile.morphs.includes("eth.maintenance.thermoregulation") &&
        !creatureProfile.morphs.includes("eth.maintenance.ecdysis") &&
        !creatureProfile.morphs.includes("morph.thermoreg.coldBlooded") &&
        !creatureProfile.morphs.includes("morph.respiration.lungs_basic") &&
        !creatureProfile.morphs.includes("morph.integument.scales_dry") &&
        !creatureProfile.morphs.includes(
            "morph.body_plan.tetrapod_small_ground",
        ) &&
        !creatureProfile.morphs.includes("morph.locomotion.crawl_quadruped") &&
        !creatureProfile.morphs.includes("morph.manip.mouth_only") &&
        !creatureProfile.morphs.includes("morph.sense.vision_basic"),
    "Small Lizard should inherit shared animal, reptile and lizard morphs instead of duplicating them.",
);
assert.ok(
    !creatureProfile.memes.includes("eth.sociality.solitary") &&
        !creatureProfile.memes.includes("tech.combat.core") &&
        !creatureProfile.memes.includes("tech.combat.bite_basic") &&
        !creatureProfile.memes.some((id) => id.includes("sensing")),
    "Small Lizard should inherit broad animal, reptile and lizard memes instead of duplicating them.",
);
assert.ok(
    !creatureProfile.morphs.includes("eth.predation.core") &&
        creatureProfile.memes.includes("eth.territory_marking") &&
        creatureProfile.memes.includes("eth.tactics.ambush_stalk") &&
        !creatureProfile.memes.includes("tech.hunting.core"),
    "Small Lizard should inherit broad reptile predation and hunting while keeping concrete ambush and territorial sources locally.",
);
assert.ok(
    !creatureProfile.actions.some(
        (action) =>
            action.moduleName === "action-snakes" &&
            action.exportName === "SWALLOW_WHOLE_FEEDING",
    ),
    "Small Lizard should not keep snake-only whole-swallow feeding action.",
);
assert.ok(
    !creatureProfile.morphs.includes("cog.iq2"),
    "Small Lizard should inherit IQ2 from Reptile instead of duplicating it.",
);
assert.ok(
    !creatureProfile.morphs.includes("morph.metabolism.digestion_basic") &&
        !creatureProfile.morphs.includes("morph.rest.sleep_basic") &&
        !creatureProfile.morphs.includes("morph.water.intake_basic"),
    "Small Lizard should not keep redundant eat/drink/sleep capability morphs.",
);

const contextSource = readWorkspaceFile(
    "domain-admin/context/DomainAdminContext.tsx",
);
const appSource = readWorkspaceFile(
    "domain-admin/components/DomainAdminApp.tsx",
);
const screenSource = readWorkspaceFile(
    "domain-admin/components/screens/CreatureSpeciesScreen.tsx",
);
const creatureProfilesUtilsSource = readWorkspaceFile(
    "domain-admin/lib/creature-profiles-utils.ts",
);
const morphNeedImpactsSource = readWorkspaceFile(
    "packages/domain-data/src/rps/from-gpt/data/need-impacts/morphs.json",
);
const memeNeedImpactsSource = readWorkspaceFile(
    "packages/domain-data/src/rps/from-gpt/data/need-impacts/memes.json",
);
const morphMaintenanceRequirementsSource = readWorkspaceFile(
    "packages/domain-data/src/rps/from-gpt/data/maintenance-requirements/morphs.json",
);
const routeSource = readWorkspaceFile(
    "domain-admin/app/api/creature-profiles/route.ts",
);
const roadmapSource = readWorkspaceFile("ROADMAP.md");
const bodySizeSource = readWorkspaceFile(
    "packages/domain-data/src/rps/world/body-size.ts",
);
const actorEntitySource = readWorkspaceFile(
    "backend/src/rps/world/actor/actor.entity.ts",
);
const actorFactorySource = readWorkspaceFile(
    "backend/src/rps/helpers/actor-factory.helper.ts",
);
const lizardProfileSource = readWorkspaceFile(
    "backend/src/rps/world/creatures/lizard.profile.ts",
);
const creatureProfilesSource = readWorkspaceFile(
    "packages/domain-data/src/rps/world/creature-profiles.ts",
);
const morphsSource = readWorkspaceFile(
    "packages/domain-data/src/rps/world/data/morphs.json",
);
const foodActionsSource = readWorkspaceFile(
    "packages/domain-data/src/rps/from-gpt/data/actions/actions-by-need/food.json",
);
const waterActionsSource = readWorkspaceFile(
    "packages/domain-data/src/rps/from-gpt/data/actions/actions-by-need/water.json",
);
const genericActionsSource = readWorkspaceFile(
    "packages/domain-data/src/rps/from-gpt/data/actions/etho/generic-actions.json",
);
const goods = JSON.parse(
    readWorkspaceFile("packages/domain-data/src/economy/data/goods.json"),
);

const plantProfileIdForGoodId = (goodId) => {
    return `plant.source.${goodId.replace(/^source-/u, "").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
};

assert.ok(
    contextSource.includes('"creature-species"') &&
        contextSource.includes("Creature Species"),
    "Creature Species must be exposed through character navigation.",
);
assert.ok(
    appSource.includes("CreatureSpeciesScreen") &&
        appSource.includes('tab === "creature-species"'),
    "Creature Species screen must be routed.",
);
for (const expectedText of [
    "Parent",
    "Effective chain",
    "Daily needs",
    "Derived needs",
    "Physical averages",
    "syncCreatureProfilesCalculatedFields",
    "clearCreatureProfileCalculatedFields",
    "calculationsEnabled",
    "calculationIssues",
    "Morph-derived calculations are disabled",
    "Behavior action",
    "getImperialMassUnit",
    "MassField",
    "FractionNumberField",
    "getImperialLengthUnit",
    "LengthField",
    "VolumeField",
    "formatFractionIfNatural",
    "formatFraction",
    "greatestCommonDivisor",
    "parseNumberOrFraction",
    "createActionListItems",
    "requiredMemes",
    "requiredMorphs",
    "selectedIndex",
    "inheritedValues",
    "getInheritedStringValues",
    "getInheritedActionRefs",
    "syncActionRefsWithSources",
    "syncCreatureProfilesActions",
    "syncCreatureProfileActions",
    "actionMatchesSourceSet",
    "mergeMissingLocalValues",
    "onAdd",
    "collapsedTemplateIds",
    "collectCollapsibleTemplateIds",
    "getSelectedTemplateAncestorIds",
    "Collapse templates",
    "Expand templates",
    "KeyboardArrowRightRoundedIcon",
    "KeyboardArrowDownRoundedIcon",
    "DerivedNeedsViewer",
    "getCreatureNeedImpactRecords",
    "getCreatureMaintenanceRequirementRecords",
    "needImpactRecords",
    "maintenanceRequirementRecords",
    "Maintenance requirements",
    "MaintenanceRequirementsViewer",
    "Final aggregation",
    "aggregateNeedRecords",
    "active",
    "basePoints",
    "finalPoints",
]) {
    assert.ok(
        screenSource.includes(expectedText),
        `Creature species editor should include ${expectedText}.`,
    );
}
assert.ok(
    !morphNeedImpactsSource.includes('"BREATH"') &&
        !morphNeedImpactsSource.includes('"TEMPERATURE"') &&
        morphMaintenanceRequirementsSource.includes('"BREATH"') &&
        morphMaintenanceRequirementsSource.includes('"TEMPERATURE"') &&
        morphMaintenanceRequirementsSource.includes(
            '"morph.respiration.lungs_basic"',
        ) &&
        morphMaintenanceRequirementsSource.includes(
            '"morph.respiration.gills_aquatic"',
        ),
    "Breath and temperature should be passive maintenance requirements instead of behavioral need weights.",
);
assert.ok(
    !morphNeedImpactsSource.includes('"gate"') &&
        !memeNeedImpactsSource.includes('"gate"') &&
        !creatureProfilesUtilsSource.includes('mode: "gate"') &&
        !screenSource.includes('record.mode === "gate"'),
    "Behavioral need impacts should use present/multiply only; present declares that a need exists.",
);
assert.ok(
    creatureProfilesUtilsSource.includes("needImpactsBySourceKind") &&
        creatureProfilesUtilsSource.includes(
            "maintenanceRequirementsBySourceKind",
        ) &&
        creatureProfilesUtilsSource.includes("getCreatureNeedImpactRecords") &&
        creatureProfilesUtilsSource.includes(
            "getCreatureMaintenanceRequirementRecords",
        ) &&
        creatureProfilesUtilsSource.includes('sourceKind: "morph"') &&
        creatureProfilesUtilsSource.includes('sourceKind: "meme"') &&
        creatureProfilesUtilsSource.includes('sourceKind: "trait"'),
    "Creature species editor should derive visible needs from effective morph, meme and trait sources.",
);
assert.ok(
    creatureProfilesUtilsSource.includes("fillMissingCalculatedNumbers") &&
        creatureProfilesUtilsSource.includes(
            "clearCreatureProfileCalculatedFields",
        ) &&
        creatureProfilesUtilsSource.includes(
            "return clearCreatureProfileCalculatedFields(profile)",
        ) &&
        creatureProfilesUtilsSource.includes(
            "getCreatureProfileCalculationIssues",
        ) &&
        creatureProfilesUtilsSource.includes("morph.size.sm.") &&
        creatureProfilesUtilsSource.includes("morph.attribute.st.st") &&
        creatureProfilesUtilsSource.includes("morph.attribute.dx.dx10") &&
        creatureProfilesUtilsSource.includes("morph.attribute.ht.ht10") &&
        creatureProfilesUtilsSource.includes('profile.kind !== "species"') &&
        creatureProfilesUtilsSource.includes(
            "syncCreatureProfilesCalculatedFields",
        ) &&
        creatureProfilesUtilsSource.includes(
            "calculatedNutritionNeedsPerDay",
        ) &&
        creatureProfilesUtilsSource.includes("calculatedConsumptionPerTurn") &&
        creatureProfilesUtilsSource.includes("calculatedPhysical") &&
        screenSource.includes("profilesToSave") &&
        !screenSource.includes("useCalculatedFallback"),
    "Creature species editor should write calculated morph-derived values into profile data only when required species morphs are present.",
);
assert.deepEqual(
    adzukiBeanPlantProfile.nutritionNeedsPerDay,
    { energyPerDay: 0, proteinPerDay: 0, waterPerDay: 0, massPerDayLb: 0 },
    "Disabled plant species must not retain stale animal-like daily needs.",
);
assert.deepEqual(
    adzukiBeanPlantProfile.consumptionPerTurn,
    { energy: 0, protein: 0, water: 0, massLb: 0 },
    "Disabled plant species must not retain stale animal-like per-turn consumption.",
);
assert.deepEqual(
    adzukiBeanPlantProfile.physical,
    { baseVolume: 0, minVolume: 0, carryVolumeCapacity: 0 },
    "Disabled plant species must not retain stale SM0 physical estimates.",
);
assert.ok(
    !screenSource.includes('label="Length, ft"') &&
        !screenSource.includes('label="Height, ft"'),
    "Small creature length fields should use adaptive imperial units instead of fixed feet.",
);
assert.ok(
    screenSource.includes("return `${sign}1/${roundedDenominator}`") &&
        screenSource.includes("parseNumberOrFraction(event.target.value)") &&
        screenSource.includes("Estimated hex volume: base"),
    "Hex volume fields should display natural fractions and accept fraction input.",
);
assert.ok(
    screenSource.includes("<FractionNumberField") &&
        !screenSource.includes(
            '<NumberField\n                    label="Energy"',
        ) &&
        !screenSource.includes(
            '<NumberField\n                    label="Protein"',
        ) &&
        !screenSource.includes(
            '<NumberField\n                    label="Water"',
        ),
    "Daily needs and per-turn consumption should display editable natural fractions instead of decimal-only number inputs.",
);
assert.ok(
    !screenSource.includes(
        "profiles.find((profile) => profile.id === selectedId)",
    ) &&
        screenSource.includes("profiles[selectedIndex] ?? null") &&
        screenSource.includes("index === selectedIndex") &&
        screenSource.includes("profile.parentId === previousId") &&
        screenSource.includes("parentId: patch.id"),
    "Creature species selection must stay stable while editing ID and child parentId links should follow ID changes.",
);
assert.ok(
    screenSource.includes("inheritedValues.map") &&
        screenSource.includes("disabled={item.inherited}") &&
        screenSource.includes("inheritedValues={inheritedMemes}") &&
        screenSource.includes("inheritedValues={inheritedActions}"),
    "Creature species editor should show inherited parent memes/morphs/actions as read-only values.",
);
assert.ok(
    screenSource.includes("patchSelectedProfile({ memes }, true)") &&
        screenSource.includes("patchSelectedProfile({ morphs }, true)") &&
        screenSource.includes("patchSelectedProfile({ actions }, true)") &&
        screenSource.includes("onAdd={addActionWithRequirements}") &&
        screenSource.includes("getActionRequirements(option.record)") &&
        screenSource.includes("syncCreatureProfilesActions(") &&
        screenSource.includes("setProfiles(nextProfiles)") &&
        screenSource.includes("if (inheritedKeys.has(key)) return false"),
    "Creature species editor should synchronize actions from current memes/morphs on load, on edit, and when actions are added manually.",
);
assert.ok(
    !screenSource.includes("requiredTraits") &&
        !screenSource.includes("getRequiredTraits") &&
        !screenSource.includes("requirements.traits") &&
        !screenSource.includes("patchSelectedProfile({ traits") &&
        !screenSource.includes('label="Traits"') &&
        !screenSource.includes("traitOptions") &&
        !screenSource.includes("inheritedTraits"),
    "Creature species editor must not expose individual traits in the species builder.",
);
assert.ok(
    readWorkspaceFile("domain-admin/lib/creature-profiles-utils.ts").includes(
        "value !== undefined && value !== 0",
    ),
    "Effective creature profile numeric merge should treat zero child fields as unset so parent properties carry through.",
);
assert.ok(
    routeSource.includes("creatureProfileDataDirectoryPath") &&
        routeSource.includes("writeCreatureProfiles") &&
        routeSource.includes("unlink("),
    "Creature profile API must synchronize the domain-data creature profile directory.",
);
assert.ok(
    !routeSource.includes("defaultEconomyConfig") &&
        !routeSource.includes("createMissingPlantPrecursorProfiles") &&
        !routeSource.includes("createPlantPrecursorProfile"),
    "Creature profile API should read explicit profile files instead of generating plant species at runtime.",
);
const plantPrecursorGoods = goods.filter(
    (good) => good.level === 0 && good.goodType === "Растения",
);
assert.ok(
    plantPrecursorGoods.length > 0,
    "Economy data should include level 0 plant precursor goods.",
);
for (const good of plantPrecursorGoods) {
    const profileId = plantProfileIdForGoodId(good.id);
    const profilePath = `packages/domain-data/src/rps/world/data/creature-profiles/${profileId}.json`;
    const profile = JSON.parse(readWorkspaceFile(profilePath));
    assert.equal(
        profile.id,
        profileId,
        `${good.id} should have a matching plant species profile id.`,
    );
    assert.equal(
        profile.name,
        good.name,
        `${good.id} plant species profile should preserve the good display name.`,
    );
    assert.equal(
        profile.kind,
        "species",
        `${good.id} plant species profile should be a concrete species.`,
    );
}
assert.ok(
    roadmapSource.includes(
        "first-pass SM body-weight, stomach-capacity, daily food-mass, and abstract hex-volume estimates",
    ) && roadmapSource.includes("square-cube scaling"),
    "Roadmap must track the current body-weight heuristic and remaining derived body table work.",
);
assert.ok(
    bodySizeSource.includes("BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB") &&
        bodySizeSource.includes("GURPS_ST_WEIGHT_ROWS") &&
        bodySizeSource.includes("getStrengthFromMorphIds") &&
        bodySizeSource.includes("getBuildCategoryFromTraitIds") &&
        bodySizeSource.includes("roundImperialMassLb") &&
        bodySizeSource.includes("BASE_MEALS_PER_DAY = 3") &&
        bodySizeSource.includes("): number | undefined") &&
        bodySizeSource.includes("return undefined") &&
        bodySizeSource.includes("estimateStomachCapacityLbFromMorphIds") &&
        bodySizeSource.includes("estimateHexVolume") &&
        screenSource.includes("estimatedAverageBuildWeight") &&
        screenSource.includes("estimatedStomachCapacity") &&
        screenSource.includes("estimatedDailyFoodMassNeedLb") &&
        screenSource.includes("estimatedHexVolume"),
    "Creature species editor must expose ST/build body weight and derived stomach estimates.",
);
assert.ok(
    actorEntitySource.includes(
        "estimateStomachCapacityLbFromMorphIds(",
    ) &&
        actorEntitySource.includes(
            "Cannot estimate stomach capacity without explicit ST morph.",
        ) &&
        !actorEntitySource.includes("Math.pow(2, sm)") &&
        actorEntitySource.includes("profileSizeModifier"),
    "Actor stomach capacity must use explicit ST and fail clearly when ST is missing.",
);
assert.ok(
    actorFactorySource.includes("estimateDailyFoodMassNeedLbFromStrengthAndBuild") &&
        actorFactorySource.includes("getStrengthFromMorphIds") &&
        actorFactorySource.includes("creatureProfile: template"),
    "Actor factory must derive daily food mass from ST and attach the creature profile.",
);
assert.ok(
    lizardProfileSource.includes("createCreatureTemplate") &&
        lizardProfileSource.includes("creatureProfile: creatureTemplate"),
    "Lizard runtime adapter must attach morph data to created actors.",
);
assert.ok(
    creatureProfilesSource.includes("animal.reptile.lizard.json") &&
        creatureProfilesSource.includes("LIZARD_TEMPLATE_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.dinosaur.json") &&
        creatureProfilesSource.includes("DINOSAUR_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.dinosaur.bird.json") &&
        creatureProfilesSource.includes("DINOSAUR_BIRD_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.dinosaur.ceratopsian.json") &&
        creatureProfilesSource.includes("DINOSAUR_CERATOPSIAN_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.dinosaur.ornithopod.json") &&
        creatureProfilesSource.includes("DINOSAUR_ORNITHOPOD_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.dinosaur.sauropod.json") &&
        creatureProfilesSource.includes("DINOSAUR_SAUROPOD_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.dinosaur.theropod.json") &&
        creatureProfilesSource.includes("DINOSAUR_THEROPOD_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.fish.json") &&
        creatureProfilesSource.includes("FISH_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.insect.json") &&
        creatureProfilesSource.includes("INSECT_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.mammal.json") &&
        creatureProfilesSource.includes("MAMMAL_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.mammal.artiodactyl.json") &&
        creatureProfilesSource.includes("MAMMAL_ARTIODACTYL_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.mammal.canine.json") &&
        creatureProfilesSource.includes("MAMMAL_CANINE_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.mammal.feline.json") &&
        creatureProfilesSource.includes("MAMMAL_FELINE_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.mammal.primate.json") &&
        creatureProfilesSource.includes("MAMMAL_PRIMATE_PROFILE_DATA") &&
        creatureProfilesSource.includes(
            "animal.mammal.primate.chimpanzee.json",
        ) &&
        creatureProfilesSource.includes(
            "MAMMAL_PRIMATE_CHIMPANZEE_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes("animal.mammal.primate.gorilla.json") &&
        creatureProfilesSource.includes(
            "MAMMAL_PRIMATE_GORILLA_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes("animal.mammal.primate.human.json") &&
        creatureProfilesSource.includes("MAMMAL_PRIMATE_HUMAN_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.mammal.rodent.json") &&
        creatureProfilesSource.includes("MAMMAL_RODENT_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.reptile.crocodile.json") &&
        creatureProfilesSource.includes("CROCODILE_TEMPLATE_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.reptile.snake.json") &&
        creatureProfilesSource.includes("SNAKE_TEMPLATE_PROFILE_DATA") &&
        !creatureProfilesSource.includes("lizzard"),
    "Creature profile facade should export the Crocodile, Lizard and Snake templates with corrected naming.",
);
assert.ok(
    creatureProfilesSource.includes("animal.invertebrate.json") &&
        creatureProfilesSource.includes("INVERTEBRATE_PROFILE_DATA") &&
        creatureProfilesSource.includes(
            "animal.invertebrate.crustacean.json",
        ) &&
        creatureProfilesSource.includes(
            "INVERTEBRATE_CRUSTACEAN_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes(
            "animal.invertebrate.crustacean.crab.json",
        ) &&
        creatureProfilesSource.includes(
            "INVERTEBRATE_CRUSTACEAN_CRAB_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes("animal.invertebrate.mollusk.json") &&
        creatureProfilesSource.includes("INVERTEBRATE_MOLLUSK_PROFILE_DATA") &&
        creatureProfilesSource.includes(
            "animal.invertebrate.mollusk.mussel.json",
        ) &&
        creatureProfilesSource.includes(
            "INVERTEBRATE_MOLLUSK_MUSSEL_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes(
            "animal.invertebrate.mollusk.oyster.json",
        ) &&
        creatureProfilesSource.includes(
            "INVERTEBRATE_MOLLUSK_OYSTER_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes("animal.fish.salmon.json") &&
        creatureProfilesSource.includes("FISH_SALMON_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.fish.char.json") &&
        creatureProfilesSource.includes("FISH_CHAR_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.dinosaur.bird.grouse.json") &&
        creatureProfilesSource.includes("DINOSAUR_BIRD_GROUSE_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.insect.bee.json") &&
        creatureProfilesSource.includes("INSECT_BEE_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.mammal.equid.json") &&
        creatureProfilesSource.includes("MAMMAL_EQUID_PROFILE_DATA") &&
        creatureProfilesSource.includes("animal.mammal.equid.horse.json") &&
        creatureProfilesSource.includes("MAMMAL_EQUID_HORSE_PROFILE_DATA") &&
        creatureProfilesSource.includes(
            "animal.mammal.artiodactyl.sheep.json",
        ) &&
        creatureProfilesSource.includes(
            "MAMMAL_ARTIODACTYL_SHEEP_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes("animal.mammal.artiodactyl.cow.json") &&
        creatureProfilesSource.includes(
            "MAMMAL_ARTIODACTYL_COW_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes(
            "animal.mammal.artiodactyl.goat.json",
        ) &&
        creatureProfilesSource.includes(
            "MAMMAL_ARTIODACTYL_GOAT_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes(
            "animal.mammal.artiodactyl.deer.json",
        ) &&
        creatureProfilesSource.includes(
            "MAMMAL_ARTIODACTYL_DEER_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes(
            "animal.mammal.artiodactyl.moose.json",
        ) &&
        creatureProfilesSource.includes(
            "MAMMAL_ARTIODACTYL_MOOSE_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes("animal.mammal.artiodactyl.pig.json") &&
        creatureProfilesSource.includes(
            "MAMMAL_ARTIODACTYL_PIG_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes(
            "animal.mammal.artiodactyl.camel.json",
        ) &&
        creatureProfilesSource.includes(
            "MAMMAL_ARTIODACTYL_CAMEL_PROFILE_DATA",
        ) &&
        creatureProfilesSource.includes("plant.json") &&
        creatureProfilesSource.includes("PLANT_PROFILE_DATA") &&
        creatureProfilesSource.includes("plant.herbaceous.json") &&
        creatureProfilesSource.includes("PLANT_HERBACEOUS_PROFILE_DATA") &&
        creatureProfilesSource.includes("plant.woody.json") &&
        creatureProfilesSource.includes("PLANT_WOODY_PROFILE_DATA") &&
        creatureProfilesSource.includes("plant.woody.tree.json") &&
        creatureProfilesSource.includes("PLANT_WOODY_TREE_PROFILE_DATA") &&
        creatureProfilesSource.includes("plant.woody.shrub.json") &&
        creatureProfilesSource.includes("PLANT_WOODY_SHRUB_PROFILE_DATA") &&
        creatureProfilesSource.includes("plant.climber.json") &&
        creatureProfilesSource.includes("PLANT_CLIMBER_PROFILE_DATA") &&
        creatureProfilesSource.includes("plant.aquatic_wetland.json") &&
        creatureProfilesSource.includes("PLANT_AQUATIC_WETLAND_PROFILE_DATA"),
    "Creature profile facade should export species derived from economy goods and botanical templates.",
);
assert.ok(
    morphsSource.includes("core.vital.living") &&
        !morphsSource.includes("morph.metabolism.digestion_basic") &&
        !morphsSource.includes("morph.rest.sleep_basic") &&
        !morphsSource.includes("morph.water.intake_basic"),
    "World morph tree should use core.vital.living for carbon-life baseline physiology instead of redundant eat/drink/sleep morphs.",
);
assert.ok(
    morphsSource.includes("morph.body_plan.crustacean") &&
        morphsSource.includes("morph.body_plan.bivalve_mollusk") &&
        morphsSource.includes("morph.integument.shell_calcareous") &&
        morphsSource.includes("morph.natural_weapon.pincers_small"),
    "World morph tree should include invertebrate morphology needed by crab, mussel and oyster species.",
);
assert.ok(
    morphsSource.includes("core.vital.plant_living") &&
        morphsSource.includes("morph.plant.photosynthesis_basic") &&
        morphsSource.includes("morph.plant.rooted") &&
        morphsSource.includes("morph.plant.vascular_basic") &&
        morphsSource.includes("morph.plant.annual_herbaceous") &&
        morphsSource.includes("morph.plant.woody_perennial") &&
        morphsSource.includes("morph.plant.tree_growth") &&
        morphsSource.includes("morph.plant.shrub_growth") &&
        morphsSource.includes("morph.plant.climbing_growth") &&
        morphsSource.includes("morph.plant.wetland_growth"),
    "World morph tree should include basic plant morphology for botanical precursor species.",
);
assert.ok(
    foodActionsSource.includes('"requiredMorphs": ["core.vital.living"]') &&
        waterActionsSource.includes(
            '"requiredMorphs": ["core.vital.living"]',
        ) &&
        genericActionsSource.includes(
            '"requiredMorphs": ["core.vital.living"]',
        ),
    "Basic eat, drink and sleep actions must be generated by carbon-life requirements instead of showing as manual-only.",
);

const snakeActionsSource = readWorkspaceFile(
    "packages/domain-data/src/rps/from-gpt/data/actions/etho/action-snakes.json",
);
assert.ok(
    snakeActionsSource.includes('"SWALLOW_WHOLE_FEEDING"') &&
        snakeActionsSource.includes('"morph.body_plan.serpentine_ground"'),
    "Snake-only whole-swallow action should require serpentine morphology.",
);

console.log("Creature species profiles and editor are wired.");
