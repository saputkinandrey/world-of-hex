import animalProfileJson from "./data/creature-profiles/animal.json";
import dinosaurBirdProfileJson from "./data/creature-profiles/animal.dinosaur.bird.json";
import dinosaurCeratopsianProfileJson from "./data/creature-profiles/animal.dinosaur.ceratopsian.json";
import dinosaurOrnithopodProfileJson from "./data/creature-profiles/animal.dinosaur.ornithopod.json";
import dinosaurProfileJson from "./data/creature-profiles/animal.dinosaur.json";
import dinosaurSauropodProfileJson from "./data/creature-profiles/animal.dinosaur.sauropod.json";
import dinosaurTheropodProfileJson from "./data/creature-profiles/animal.dinosaur.theropod.json";
import dinosaurBirdGrouseProfileJson from "./data/creature-profiles/animal.dinosaur.bird.grouse.json";
import fishCharProfileJson from "./data/creature-profiles/animal.fish.char.json";
import fishProfileJson from "./data/creature-profiles/animal.fish.json";
import fishSalmonProfileJson from "./data/creature-profiles/animal.fish.salmon.json";
import insectBeeProfileJson from "./data/creature-profiles/animal.insect.bee.json";
import insectProfileJson from "./data/creature-profiles/animal.insect.json";
import invertebrateCrabProfileJson from "./data/creature-profiles/animal.invertebrate.crustacean.crab.json";
import invertebrateCrustaceanProfileJson from "./data/creature-profiles/animal.invertebrate.crustacean.json";
import invertebrateMolluskMusselProfileJson from "./data/creature-profiles/animal.invertebrate.mollusk.mussel.json";
import invertebrateMolluskOysterProfileJson from "./data/creature-profiles/animal.invertebrate.mollusk.oyster.json";
import invertebrateMolluskProfileJson from "./data/creature-profiles/animal.invertebrate.mollusk.json";
import invertebrateProfileJson from "./data/creature-profiles/animal.invertebrate.json";
import mammalArtiodactylProfileJson from "./data/creature-profiles/animal.mammal.artiodactyl.json";
import mammalArtiodactylCamelProfileJson from "./data/creature-profiles/animal.mammal.artiodactyl.camel.json";
import mammalArtiodactylCowProfileJson from "./data/creature-profiles/animal.mammal.artiodactyl.cow.json";
import mammalArtiodactylDeerProfileJson from "./data/creature-profiles/animal.mammal.artiodactyl.deer.json";
import mammalArtiodactylGoatProfileJson from "./data/creature-profiles/animal.mammal.artiodactyl.goat.json";
import mammalArtiodactylMooseProfileJson from "./data/creature-profiles/animal.mammal.artiodactyl.moose.json";
import mammalArtiodactylPigProfileJson from "./data/creature-profiles/animal.mammal.artiodactyl.pig.json";
import mammalArtiodactylSheepProfileJson from "./data/creature-profiles/animal.mammal.artiodactyl.sheep.json";
import mammalCanineProfileJson from "./data/creature-profiles/animal.mammal.canine.json";
import mammalEquidHorseProfileJson from "./data/creature-profiles/animal.mammal.equid.horse.json";
import mammalEquidProfileJson from "./data/creature-profiles/animal.mammal.equid.json";
import mammalFelineProfileJson from "./data/creature-profiles/animal.mammal.feline.json";
import mammalProfileJson from "./data/creature-profiles/animal.mammal.json";
import mammalPrimateChimpanzeeProfileJson from "./data/creature-profiles/animal.mammal.primate.chimpanzee.json";
import mammalPrimateGorillaProfileJson from "./data/creature-profiles/animal.mammal.primate.gorilla.json";
import mammalPrimateHumanProfileJson from "./data/creature-profiles/animal.mammal.primate.human.json";
import humanCultureAbydosianProfileJson from "./data/creature-profiles/human.culture.abydosian.json";
import humanCultureBarbarianJungleProfileJson from "./data/creature-profiles/human.culture.barbarian-jungle.json";
import humanCultureImperialProfileJson from "./data/creature-profiles/human.culture.imperial.json";
import humanCulturePalladianProfileJson from "./data/creature-profiles/human.culture.palladian.json";
import humanCultureRetanMidlandProfileJson from "./data/creature-profiles/human.culture.retan.midland.json";
import humanCultureRetanNorthProfileJson from "./data/creature-profiles/human.culture.retan.north.json";
import humanCultureRetanSouthProfileJson from "./data/creature-profiles/human.culture.retan.south.json";
import humanRaceAbydosianProfileJson from "./data/creature-profiles/human.race.abydosian.json";
import humanRaceBarbarianGiantProfileJson from "./data/creature-profiles/human.race.barbarian-giant.json";
import humanRaceImperialProfileJson from "./data/creature-profiles/human.race.imperial.json";
import humanRacePalladianProfileJson from "./data/creature-profiles/human.race.palladian.json";
import humanRaceRetanProfileJson from "./data/creature-profiles/human.race.retan.json";
import mammalPrimateProfileJson from "./data/creature-profiles/animal.mammal.primate.json";
import mammalRodentProfileJson from "./data/creature-profiles/animal.mammal.rodent.json";
import plantAquaticWetlandProfileJson from "./data/creature-profiles/plant.aquatic_wetland.json";
import plantClimberProfileJson from "./data/creature-profiles/plant.climber.json";
import plantHerbaceousProfileJson from "./data/creature-profiles/plant.herbaceous.json";
import plantProfileJson from "./data/creature-profiles/plant.json";
import plantWoodyProfileJson from "./data/creature-profiles/plant.woody.json";
import plantWoodyShrubProfileJson from "./data/creature-profiles/plant.woody.shrub.json";
import plantWoodyTreeProfileJson from "./data/creature-profiles/plant.woody.tree.json";
import reptileProfileJson from "./data/creature-profiles/animal.reptile.json";
import crocodileTemplateProfileJson from "./data/creature-profiles/animal.reptile.crocodile.json";
import lizardTemplateProfileJson from "./data/creature-profiles/animal.reptile.lizard.json";
import snakeTemplateProfileJson from "./data/creature-profiles/animal.reptile.snake.json";
import lizardProfileJson from "./data/creature-profiles/lizard.generic.json";
import type {
    CreatureActionRefData,
    CreatureProfileData,
    CreatureNutritionContentData,
    CreatureNutritionNeedsData,
    CreaturePhysicalProfileData,
} from "./entities";

export type {
    CreatureActionRefData,
    CreatureProfileData,
    CreatureNutritionContentData,
    CreatureNutritionNeedsData,
    CreaturePhysicalProfileData,
};

export const creatureProfileDataFilePaths = {
    animal: "packages/domain-data/src/rps/world/data/creature-profiles/animal.json",
    animalDinosaur:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.json",
    animalDinosaurBird:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.bird.json",
    animalDinosaurBirdGrouse:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.bird.grouse.json",
    animalDinosaurCeratopsian:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.ceratopsian.json",
    animalDinosaurOrnithopod:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.ornithopod.json",
    animalDinosaurSauropod:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.sauropod.json",
    animalDinosaurTheropod:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.dinosaur.theropod.json",
    animalFish:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.fish.json",
    animalFishChar:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.fish.char.json",
    animalFishSalmon:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.fish.salmon.json",
    animalInsect:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.insect.json",
    animalInsectBee:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.insect.bee.json",
    animalInvertebrate:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.json",
    animalInvertebrateCrustacean:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.crustacean.json",
    animalInvertebrateCrustaceanCrab:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.crustacean.crab.json",
    animalInvertebrateMollusk:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.mollusk.json",
    animalInvertebrateMolluskMussel:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.mollusk.mussel.json",
    animalInvertebrateMolluskOyster:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.invertebrate.mollusk.oyster.json",
    animalMammal:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.json",
    animalMammalArtiodactyl:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.json",
    animalMammalArtiodactylCamel:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.camel.json",
    animalMammalArtiodactylCow:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.cow.json",
    animalMammalArtiodactylDeer:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.deer.json",
    animalMammalArtiodactylGoat:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.goat.json",
    animalMammalArtiodactylMoose:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.moose.json",
    animalMammalArtiodactylPig:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.pig.json",
    animalMammalArtiodactylSheep:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.artiodactyl.sheep.json",
    animalMammalCanine:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.canine.json",
    animalMammalEquid:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.equid.json",
    animalMammalEquidHorse:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.equid.horse.json",
    animalMammalFeline:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.feline.json",
    animalMammalPrimate:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.primate.json",
    animalMammalPrimateChimpanzee:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.primate.chimpanzee.json",
    animalMammalPrimateGorilla:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.primate.gorilla.json",
    animalMammalPrimateHuman:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.primate.human.json",
    humanCultureAbydosian:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.culture.abydosian.json",
    humanCultureBarbarianJungle:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.culture.barbarian-jungle.json",
    humanCultureImperial:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.culture.imperial.json",
    humanCulturePalladian:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.culture.palladian.json",
    humanCultureRetanMidland:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.culture.retan.midland.json",
    humanCultureRetanNorth:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.culture.retan.north.json",
    humanCultureRetanSouth:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.culture.retan.south.json",
    humanRaceAbydosian:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.race.abydosian.json",
    humanRaceBarbarianGiant:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.race.barbarian-giant.json",
    humanRaceImperial:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.race.imperial.json",
    humanRacePalladian:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.race.palladian.json",
    humanRaceRetan:
        "packages/domain-data/src/rps/world/data/creature-profiles/human.race.retan.json",
    animalMammalRodent:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.mammal.rodent.json",
    plant: "packages/domain-data/src/rps/world/data/creature-profiles/plant.json",
    plantAquaticWetland:
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.aquatic_wetland.json",
    plantClimber:
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.climber.json",
    plantHerbaceous:
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.herbaceous.json",
    plantWoody:
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.woody.json",
    plantWoodyShrub:
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.woody.shrub.json",
    plantWoodyTree:
        "packages/domain-data/src/rps/world/data/creature-profiles/plant.woody.tree.json",
    animalReptile:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.reptile.json",
    animalReptileCrocodile:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.reptile.crocodile.json",
    animalReptileLizard:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.reptile.lizard.json",
    animalReptileSnake:
        "packages/domain-data/src/rps/world/data/creature-profiles/animal.reptile.snake.json",
    lizardGeneric:
        "packages/domain-data/src/rps/world/data/creature-profiles/lizard.generic.json",
};

export const creatureProfileDataDirectoryPath =
    "packages/domain-data/src/rps/world/data/creature-profiles";

export const ANIMAL_PROFILE_DATA = animalProfileJson as CreatureProfileData;
export const DINOSAUR_PROFILE_DATA = dinosaurProfileJson as CreatureProfileData;
export const DINOSAUR_BIRD_PROFILE_DATA =
    dinosaurBirdProfileJson as CreatureProfileData;
export const DINOSAUR_BIRD_GROUSE_PROFILE_DATA =
    dinosaurBirdGrouseProfileJson as CreatureProfileData;
export const DINOSAUR_CERATOPSIAN_PROFILE_DATA =
    dinosaurCeratopsianProfileJson as CreatureProfileData;
export const DINOSAUR_ORNITHOPOD_PROFILE_DATA =
    dinosaurOrnithopodProfileJson as CreatureProfileData;
export const DINOSAUR_SAUROPOD_PROFILE_DATA =
    dinosaurSauropodProfileJson as CreatureProfileData;
export const DINOSAUR_THEROPOD_PROFILE_DATA =
    dinosaurTheropodProfileJson as CreatureProfileData;
export const FISH_PROFILE_DATA = fishProfileJson as CreatureProfileData;
export const FISH_CHAR_PROFILE_DATA =
    fishCharProfileJson as CreatureProfileData;
export const FISH_SALMON_PROFILE_DATA =
    fishSalmonProfileJson as CreatureProfileData;
export const INSECT_PROFILE_DATA = insectProfileJson as CreatureProfileData;
export const INSECT_BEE_PROFILE_DATA =
    insectBeeProfileJson as CreatureProfileData;
export const INVERTEBRATE_PROFILE_DATA =
    invertebrateProfileJson as CreatureProfileData;
export const INVERTEBRATE_CRUSTACEAN_PROFILE_DATA =
    invertebrateCrustaceanProfileJson as CreatureProfileData;
export const INVERTEBRATE_CRUSTACEAN_CRAB_PROFILE_DATA =
    invertebrateCrabProfileJson as CreatureProfileData;
export const INVERTEBRATE_MOLLUSK_PROFILE_DATA =
    invertebrateMolluskProfileJson as CreatureProfileData;
export const INVERTEBRATE_MOLLUSK_MUSSEL_PROFILE_DATA =
    invertebrateMolluskMusselProfileJson as CreatureProfileData;
export const INVERTEBRATE_MOLLUSK_OYSTER_PROFILE_DATA =
    invertebrateMolluskOysterProfileJson as CreatureProfileData;
export const MAMMAL_PROFILE_DATA = mammalProfileJson as CreatureProfileData;
export const MAMMAL_ARTIODACTYL_PROFILE_DATA =
    mammalArtiodactylProfileJson as CreatureProfileData;
export const MAMMAL_ARTIODACTYL_CAMEL_PROFILE_DATA =
    mammalArtiodactylCamelProfileJson as CreatureProfileData;
export const MAMMAL_ARTIODACTYL_COW_PROFILE_DATA =
    mammalArtiodactylCowProfileJson as CreatureProfileData;
export const MAMMAL_ARTIODACTYL_DEER_PROFILE_DATA =
    mammalArtiodactylDeerProfileJson as CreatureProfileData;
export const MAMMAL_ARTIODACTYL_GOAT_PROFILE_DATA =
    mammalArtiodactylGoatProfileJson as CreatureProfileData;
export const MAMMAL_ARTIODACTYL_MOOSE_PROFILE_DATA =
    mammalArtiodactylMooseProfileJson as CreatureProfileData;
export const MAMMAL_ARTIODACTYL_PIG_PROFILE_DATA =
    mammalArtiodactylPigProfileJson as CreatureProfileData;
export const MAMMAL_ARTIODACTYL_SHEEP_PROFILE_DATA =
    mammalArtiodactylSheepProfileJson as CreatureProfileData;
export const MAMMAL_CANINE_PROFILE_DATA =
    mammalCanineProfileJson as CreatureProfileData;
export const MAMMAL_EQUID_PROFILE_DATA =
    mammalEquidProfileJson as CreatureProfileData;
export const MAMMAL_EQUID_HORSE_PROFILE_DATA =
    mammalEquidHorseProfileJson as CreatureProfileData;
export const MAMMAL_FELINE_PROFILE_DATA =
    mammalFelineProfileJson as CreatureProfileData;
export const MAMMAL_PRIMATE_PROFILE_DATA =
    mammalPrimateProfileJson as CreatureProfileData;
export const MAMMAL_PRIMATE_CHIMPANZEE_PROFILE_DATA =
    mammalPrimateChimpanzeeProfileJson as CreatureProfileData;
export const MAMMAL_PRIMATE_GORILLA_PROFILE_DATA =
    mammalPrimateGorillaProfileJson as CreatureProfileData;
export const MAMMAL_PRIMATE_HUMAN_PROFILE_DATA =
    mammalPrimateHumanProfileJson as CreatureProfileData;
export const HUMAN_CULTURE_ABYDOSIAN_PROFILE_DATA =
    humanCultureAbydosianProfileJson as CreatureProfileData;
export const HUMAN_CULTURE_BARBARIAN_JUNGLE_PROFILE_DATA =
    humanCultureBarbarianJungleProfileJson as CreatureProfileData;
export const HUMAN_CULTURE_IMPERIAL_PROFILE_DATA =
    humanCultureImperialProfileJson as CreatureProfileData;
export const HUMAN_CULTURE_PALLADIAN_PROFILE_DATA =
    humanCulturePalladianProfileJson as CreatureProfileData;
export const HUMAN_CULTURE_RETAN_MIDLAND_PROFILE_DATA =
    humanCultureRetanMidlandProfileJson as CreatureProfileData;
export const HUMAN_CULTURE_RETAN_NORTH_PROFILE_DATA =
    humanCultureRetanNorthProfileJson as CreatureProfileData;
export const HUMAN_CULTURE_RETAN_SOUTH_PROFILE_DATA =
    humanCultureRetanSouthProfileJson as CreatureProfileData;
export const HUMAN_RACE_ABYDOSIAN_PROFILE_DATA =
    humanRaceAbydosianProfileJson as CreatureProfileData;
export const HUMAN_RACE_BARBARIAN_GIANT_PROFILE_DATA =
    humanRaceBarbarianGiantProfileJson as CreatureProfileData;
export const HUMAN_RACE_IMPERIAL_PROFILE_DATA =
    humanRaceImperialProfileJson as CreatureProfileData;
export const HUMAN_RACE_PALLADIAN_PROFILE_DATA =
    humanRacePalladianProfileJson as CreatureProfileData;
export const HUMAN_RACE_RETAN_PROFILE_DATA =
    humanRaceRetanProfileJson as CreatureProfileData;
export const MAMMAL_RODENT_PROFILE_DATA =
    mammalRodentProfileJson as CreatureProfileData;
export const PLANT_PROFILE_DATA = plantProfileJson as CreatureProfileData;
export const PLANT_AQUATIC_WETLAND_PROFILE_DATA =
    plantAquaticWetlandProfileJson as CreatureProfileData;
export const PLANT_CLIMBER_PROFILE_DATA =
    plantClimberProfileJson as CreatureProfileData;
export const PLANT_HERBACEOUS_PROFILE_DATA =
    plantHerbaceousProfileJson as CreatureProfileData;
export const PLANT_WOODY_PROFILE_DATA =
    plantWoodyProfileJson as CreatureProfileData;
export const PLANT_WOODY_SHRUB_PROFILE_DATA =
    plantWoodyShrubProfileJson as CreatureProfileData;
export const PLANT_WOODY_TREE_PROFILE_DATA =
    plantWoodyTreeProfileJson as CreatureProfileData;
export const REPTILE_PROFILE_DATA = reptileProfileJson as CreatureProfileData;
export const CROCODILE_TEMPLATE_PROFILE_DATA =
    crocodileTemplateProfileJson as CreatureProfileData;
export const LIZARD_TEMPLATE_PROFILE_DATA =
    lizardTemplateProfileJson as CreatureProfileData;
export const SNAKE_TEMPLATE_PROFILE_DATA =
    snakeTemplateProfileJson as CreatureProfileData;
export const LIZARD_PROFILE_DATA = lizardProfileJson as CreatureProfileData;

export const creatureProfiles = {
    [ANIMAL_PROFILE_DATA.id]: ANIMAL_PROFILE_DATA,
    [DINOSAUR_PROFILE_DATA.id]: DINOSAUR_PROFILE_DATA,
    [DINOSAUR_BIRD_PROFILE_DATA.id]: DINOSAUR_BIRD_PROFILE_DATA,
    [DINOSAUR_BIRD_GROUSE_PROFILE_DATA.id]: DINOSAUR_BIRD_GROUSE_PROFILE_DATA,
    [DINOSAUR_CERATOPSIAN_PROFILE_DATA.id]: DINOSAUR_CERATOPSIAN_PROFILE_DATA,
    [DINOSAUR_ORNITHOPOD_PROFILE_DATA.id]: DINOSAUR_ORNITHOPOD_PROFILE_DATA,
    [DINOSAUR_SAUROPOD_PROFILE_DATA.id]: DINOSAUR_SAUROPOD_PROFILE_DATA,
    [DINOSAUR_THEROPOD_PROFILE_DATA.id]: DINOSAUR_THEROPOD_PROFILE_DATA,
    [FISH_PROFILE_DATA.id]: FISH_PROFILE_DATA,
    [FISH_CHAR_PROFILE_DATA.id]: FISH_CHAR_PROFILE_DATA,
    [FISH_SALMON_PROFILE_DATA.id]: FISH_SALMON_PROFILE_DATA,
    [INSECT_PROFILE_DATA.id]: INSECT_PROFILE_DATA,
    [INSECT_BEE_PROFILE_DATA.id]: INSECT_BEE_PROFILE_DATA,
    [INVERTEBRATE_PROFILE_DATA.id]: INVERTEBRATE_PROFILE_DATA,
    [INVERTEBRATE_CRUSTACEAN_PROFILE_DATA.id]:
        INVERTEBRATE_CRUSTACEAN_PROFILE_DATA,
    [INVERTEBRATE_CRUSTACEAN_CRAB_PROFILE_DATA.id]:
        INVERTEBRATE_CRUSTACEAN_CRAB_PROFILE_DATA,
    [INVERTEBRATE_MOLLUSK_PROFILE_DATA.id]: INVERTEBRATE_MOLLUSK_PROFILE_DATA,
    [INVERTEBRATE_MOLLUSK_MUSSEL_PROFILE_DATA.id]:
        INVERTEBRATE_MOLLUSK_MUSSEL_PROFILE_DATA,
    [INVERTEBRATE_MOLLUSK_OYSTER_PROFILE_DATA.id]:
        INVERTEBRATE_MOLLUSK_OYSTER_PROFILE_DATA,
    [MAMMAL_PROFILE_DATA.id]: MAMMAL_PROFILE_DATA,
    [MAMMAL_ARTIODACTYL_PROFILE_DATA.id]: MAMMAL_ARTIODACTYL_PROFILE_DATA,
    [MAMMAL_ARTIODACTYL_CAMEL_PROFILE_DATA.id]:
        MAMMAL_ARTIODACTYL_CAMEL_PROFILE_DATA,
    [MAMMAL_ARTIODACTYL_COW_PROFILE_DATA.id]:
        MAMMAL_ARTIODACTYL_COW_PROFILE_DATA,
    [MAMMAL_ARTIODACTYL_DEER_PROFILE_DATA.id]:
        MAMMAL_ARTIODACTYL_DEER_PROFILE_DATA,
    [MAMMAL_ARTIODACTYL_GOAT_PROFILE_DATA.id]:
        MAMMAL_ARTIODACTYL_GOAT_PROFILE_DATA,
    [MAMMAL_ARTIODACTYL_MOOSE_PROFILE_DATA.id]:
        MAMMAL_ARTIODACTYL_MOOSE_PROFILE_DATA,
    [MAMMAL_ARTIODACTYL_PIG_PROFILE_DATA.id]:
        MAMMAL_ARTIODACTYL_PIG_PROFILE_DATA,
    [MAMMAL_ARTIODACTYL_SHEEP_PROFILE_DATA.id]:
        MAMMAL_ARTIODACTYL_SHEEP_PROFILE_DATA,
    [MAMMAL_CANINE_PROFILE_DATA.id]: MAMMAL_CANINE_PROFILE_DATA,
    [MAMMAL_EQUID_PROFILE_DATA.id]: MAMMAL_EQUID_PROFILE_DATA,
    [MAMMAL_EQUID_HORSE_PROFILE_DATA.id]: MAMMAL_EQUID_HORSE_PROFILE_DATA,
    [MAMMAL_FELINE_PROFILE_DATA.id]: MAMMAL_FELINE_PROFILE_DATA,
    [MAMMAL_PRIMATE_PROFILE_DATA.id]: MAMMAL_PRIMATE_PROFILE_DATA,
    [MAMMAL_PRIMATE_CHIMPANZEE_PROFILE_DATA.id]:
        MAMMAL_PRIMATE_CHIMPANZEE_PROFILE_DATA,
    [MAMMAL_PRIMATE_GORILLA_PROFILE_DATA.id]:
        MAMMAL_PRIMATE_GORILLA_PROFILE_DATA,
    [MAMMAL_PRIMATE_HUMAN_PROFILE_DATA.id]: MAMMAL_PRIMATE_HUMAN_PROFILE_DATA,
    [HUMAN_CULTURE_ABYDOSIAN_PROFILE_DATA.id]:
        HUMAN_CULTURE_ABYDOSIAN_PROFILE_DATA,
    [HUMAN_CULTURE_BARBARIAN_JUNGLE_PROFILE_DATA.id]:
        HUMAN_CULTURE_BARBARIAN_JUNGLE_PROFILE_DATA,
    [HUMAN_CULTURE_IMPERIAL_PROFILE_DATA.id]: HUMAN_CULTURE_IMPERIAL_PROFILE_DATA,
    [HUMAN_CULTURE_PALLADIAN_PROFILE_DATA.id]:
        HUMAN_CULTURE_PALLADIAN_PROFILE_DATA,
    [HUMAN_CULTURE_RETAN_MIDLAND_PROFILE_DATA.id]:
        HUMAN_CULTURE_RETAN_MIDLAND_PROFILE_DATA,
    [HUMAN_CULTURE_RETAN_NORTH_PROFILE_DATA.id]:
        HUMAN_CULTURE_RETAN_NORTH_PROFILE_DATA,
    [HUMAN_CULTURE_RETAN_SOUTH_PROFILE_DATA.id]:
        HUMAN_CULTURE_RETAN_SOUTH_PROFILE_DATA,
    [HUMAN_RACE_ABYDOSIAN_PROFILE_DATA.id]: HUMAN_RACE_ABYDOSIAN_PROFILE_DATA,
    [HUMAN_RACE_BARBARIAN_GIANT_PROFILE_DATA.id]:
        HUMAN_RACE_BARBARIAN_GIANT_PROFILE_DATA,
    [HUMAN_RACE_IMPERIAL_PROFILE_DATA.id]: HUMAN_RACE_IMPERIAL_PROFILE_DATA,
    [HUMAN_RACE_PALLADIAN_PROFILE_DATA.id]: HUMAN_RACE_PALLADIAN_PROFILE_DATA,
    [HUMAN_RACE_RETAN_PROFILE_DATA.id]: HUMAN_RACE_RETAN_PROFILE_DATA,
    [MAMMAL_RODENT_PROFILE_DATA.id]: MAMMAL_RODENT_PROFILE_DATA,
    [PLANT_PROFILE_DATA.id]: PLANT_PROFILE_DATA,
    [PLANT_AQUATIC_WETLAND_PROFILE_DATA.id]: PLANT_AQUATIC_WETLAND_PROFILE_DATA,
    [PLANT_CLIMBER_PROFILE_DATA.id]: PLANT_CLIMBER_PROFILE_DATA,
    [PLANT_HERBACEOUS_PROFILE_DATA.id]: PLANT_HERBACEOUS_PROFILE_DATA,
    [PLANT_WOODY_PROFILE_DATA.id]: PLANT_WOODY_PROFILE_DATA,
    [PLANT_WOODY_SHRUB_PROFILE_DATA.id]: PLANT_WOODY_SHRUB_PROFILE_DATA,
    [PLANT_WOODY_TREE_PROFILE_DATA.id]: PLANT_WOODY_TREE_PROFILE_DATA,
    [REPTILE_PROFILE_DATA.id]: REPTILE_PROFILE_DATA,
    [CROCODILE_TEMPLATE_PROFILE_DATA.id]: CROCODILE_TEMPLATE_PROFILE_DATA,
    [LIZARD_TEMPLATE_PROFILE_DATA.id]: LIZARD_TEMPLATE_PROFILE_DATA,
    [SNAKE_TEMPLATE_PROFILE_DATA.id]: SNAKE_TEMPLATE_PROFILE_DATA,
    [LIZARD_PROFILE_DATA.id]: LIZARD_PROFILE_DATA,
} as Record<string, CreatureProfileData>;
