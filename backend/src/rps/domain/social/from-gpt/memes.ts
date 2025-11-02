// memes.ts

export type MemeNode = {
    id: MemeId;
    parents?: MemeId[]; // prerequisites
};

// src/memes/index.ts
// Иерархия: строки-листовые узлы = стабильные ID (литералы).
export const memes = {
    // === Core ===
    core: {
        perception: 'core.perception',
        motor_coordination: 'core.motor_coordination',
    } as const,

    // === Social / Communication ===
    soc: {
        shared_attention: 'soc.shared_attention',
        networking: {
            basic: 'soc.networking.basic',
            coalition_building: 'soc.networking.coalition_building',
        },
    } as const,

    comm: {
        signaling: 'comm.signaling',
        language: {
            spoken: 'comm.language.spoken',
            written: 'comm.language.written',
        },
        rhetoric: {
            public_debate: 'comm.rhetoric.public_debate',
        },
        persuasion: {
            basic: 'comm.persuasion.basic',
        },
    } as const,

    // === Cognition / Org ===
    cog: {
        counting: {
            tally: 'cog.counting.tally',
        },
        number_concept: 'cog.number_concept',
        measurement: {
            rudimentary: 'cog.measurement.rudimentary',
        },
        standards: {
            agreement: 'cog.standards.agreement',
        },
        timekeeping: {
            basic: 'cog.timekeeping.basic',
        },
        space_mapping: 'cog.space_mapping',
        innovation: {
            basic: 'cog.innovation.basic', // идея инноваций
        },
    } as const,

    org: {
        scheduling: 'org.scheduling',
        duty_roster: 'org.duty_roster',
        workshop_practice: 'org.workshop_practice',
        training: {
            regimen_basic: 'org.training.regimen_basic', // подготовка к событию
        },
        tournament: {
            organizing_basic: 'org.tournament.organizing_basic', // организация состязаний
        },
    } as const,

    // === Technology ===
    tech: {
        throwing: {
            basic: 'tech.throwing.basic',
        },
        combat: {
            core: 'tech.combat.core', // общая прикладная моторика боя
            unarmed_basic: 'tech.combat.unarmed_basic', // базовая безоружная техника
            melee_basic: 'tech.combat.melee_basic', // базовая оружейная (рукопашное/холодное)
            missile_basic: 'tech.combat.missile_basic', // базовая метательная/стрельба
        },

        hunting: {
            core: 'tech.hunting.core', // базовая охотничья практика
            tracking_basic: 'tech.hunting.tracking_basic', // чтение следов/признаков
            stalking_basic: 'tech.hunting.stalking_basic', // бесшумное сближение/маскировка
            trapping_basic: 'tech.hunting.trapping_basic', // установка ловушек/силков
            missile_hunt_basic: 'tech.hunting.missile_hunt_basic', // охота метательным/стрельбой
        },
        tool: {
            use_basic: 'tech.tool.use_basic',
            shaping: 'tech.tool.shaping',
            making: 'tech.tool.making',
        },
        fire: {
            use: 'tech.fire.use', // уметь пользоваться «найденным» огнём: поддерживать, переносить
            control: 'tech.fire.control', // уметь разжигать/гасить/управлять источником
        },

        heat: {
            core: 'tech.heat.core', // абстракция применения тепла (любой домен)
            space: {
                core: 'tech.heat.space.core', // отопление/очаг
                hearth: 'tech.heat.space.hearth',
            },
            industrial: 'tech.heat.industrial', // << упрощено до одного узла
        },

        food: {
            prep: {
                butchering_basic: 'tech.food.prep.butchering_basic',
                milling_basic: 'tech.food.prep.milling_basic',
                leavening_basic: 'tech.food.prep.leavening_basic',
            },
            preservation: {
                fermentation: 'tech.food.preservation.fermentation',
                drying: 'tech.food.preservation.drying',
                salting: 'tech.food.preservation.salty',
                pickling: 'tech.food.preservation.pickling',
            },
            sanitation: {
                kitchen_hygiene: 'tech.food.sanitation.kitchen_hygiene',
            },
            culinary: {
                core: 'tech.food.culinary.core',
                boil: 'tech.food.culinary.boil',
                roast: 'tech.food.culinary.roast',
                bake: 'tech.food.culinary.bake',
                smoke: 'tech.food.culinary.smoke',
            },
        },
    } as const,

    // === Health / Culture / Law / Econ ===
    health: {
        sanitation_norms: 'health.sanitation_norms',
        waste_handling: 'health.waste_handling',
        waste_sorting: 'health.waste_sorting',
        first_aid_basic: 'health.first_aid_basic',
        herbal_knowledge: 'health.herbal_knowledge',
        hygiene_tools: 'health.hygiene_tools',
    } as const,

    culture: {
        justice_concept: 'culture.justice_concept',
        ritual_basic: 'culture.ritual_basic',
        oath_norm: 'culture.oath_norm',
        vigil_ritual: 'culture.vigil_ritual',
        competition: {
            ethos: 'culture.competition.ethos', // идея соревновательности
            fair_play_norm: 'culture.competition.fair_play_norm', // честная игра, судейство
        },
    } as const,

    record: {
        ledgerkeeping: 'record.ledgerkeeping',
        boundary_marking: 'record.boundary_marking',
        scoreboard: {
            basic: 'record.scoreboard.basic', // фикс результатов/очки
        },
        submissions_registry: 'record.submissions_registry', // подача работ/идей
        contract_registry: 'record.contract_registry', // учёт договоров/контрактов
        innovation_register: 'record.innovation_register', // учёт чертежей/патентов
    } as const,

    law: {
        public_posting: 'law.public_posting',
    } as const,

    econ: {
        exchange_barter: 'econ.exchange_barter',
        token_use: 'econ.token_use',
        market_norms: 'econ.market_norms',
        pooling_common_fund: 'econ.pooling_common_fund',
        deposit_contract: 'econ.deposit_contract',
        contracting: {
            contract_basic: 'econ.contracting.contract_basic', // идея договора
            bidding_norm: 'econ.contracting.bidding_norm', // торги/тендер
        },
    } as const,

    eth: {
        // === Общая социальность (не только про хищников)
        sociality: {
            solitary: 'eth.sociality.solitary',
            cooperative: 'eth.sociality.cooperative',
        },

        // === Общие тактики сближения/атаки (подходят и к охоте, и к бою)
        tactics: {
            ambush_stalk: 'eth.tactics.ambush_stalk', // скрытность, выжидание, рывок
            pursuit_chase: 'eth.tactics.pursuit_chase', // преследование, изматывание
        },

        // === Хищничество: только база + драйвы (без social/style/post-capture)
        predation: {
            core: 'eth.predation.core',

            drive: {
                prey_drive: 'eth.predation.drive.prey_drive', // охотничья тяга (сверх голода)
                play_predation: 'eth.predation.drive.play_predation', // «игровое» добивание/тренировка
                scavenging: 'eth.predation.drive.scavenging', // падаль/подбор
                opportunistic: 'eth.predation.drive.opportunistic', // брать доступное/лёгкое
            },
        },
    } as const,
} as const;

// 👉 Алиасы верхнего уровня — чтобы IDE подсказывала и по коротким префиксам:
export const core = memes.core;
export const soc = memes.soc;
export const comm = memes.comm;
export const cog = memes.cog;
export const org = memes.org;
export const tech = memes.tech;
export const fire = tech.fire;
export const heat = tech.heat;
export const food = tech.food;
export const culinary = food.culinary;
export const health = memes.health;
export const culture = memes.culture;
export const record = memes.record;
export const law = memes.law;
export const econ = memes.econ;

// ===== Типы: все листовые значения автоматически собираются в union =====
type LeafValues<T> = T extends string
    ? T
    : { [K in keyof T]: LeafValues<T[K]> }[keyof T];
export type MemeId = LeafValues<typeof memes>;

// Явные зависимости (только «смысловые» ребра; остальное достроит резолвер)
export const memeDeps: Record<MemeId, readonly MemeId[]> = {
    // === Core ===
    [memes.core.perception]: [],
    [memes.core.motor_coordination]: [],

    // === Social / Communication ===
    [memes.soc.shared_attention]: [memes.core.perception],
    [memes.comm.signaling]: [memes.soc.shared_attention],
    [memes.comm.language.spoken]: [memes.comm.signaling],
    [memes.comm.language.written]: [memes.comm.language.spoken],

    // === Cognition / Org ===
    [memes.cog.counting.tally]: [],
    [memes.cog.number_concept]: [memes.cog.counting.tally],
    [memes.cog.measurement.rudimentary]: [],
    [memes.cog.standards.agreement]: [memes.comm.language.spoken],
    [memes.cog.timekeeping.basic]: [],
    [memes.cog.space_mapping]: [],

    [memes.org.scheduling]: [memes.cog.timekeeping.basic],
    [memes.org.duty_roster]: [memes.org.scheduling],
    [memes.org.workshop_practice]: [memes.tech.tool.making],

    [memes.tech.throwing.basic]: [
        memes.core.perception,
        memes.core.motor_coordination,
    ],

    // === COMBAT
    [memes.tech.combat.core]: [
        memes.core.perception,
        memes.core.motor_coordination,
    ],
    [memes.tech.combat.unarmed_basic]: [memes.tech.combat.core],
    [memes.tech.combat.melee_basic]: [
        memes.tech.combat.core,
        memes.tech.tool.use_basic,
    ],
    [memes.tech.combat.missile_basic]: [
        memes.tech.combat.core,
        memes.tech.throwing.basic,
    ],

    // === HUNTING
    [memes.tech.hunting.core]: [
        memes.core.perception,
        memes.core.motor_coordination,
    ],
    [memes.tech.hunting.tracking_basic]: [memes.tech.hunting.core],
    [memes.tech.hunting.stalking_basic]: [
        memes.tech.hunting.core,
        memes.tech.hunting.tracking_basic,
    ],
    [memes.tech.hunting.trapping_basic]: [
        memes.tech.hunting.core,
        memes.tech.tool.use_basic,
    ],
    [memes.tech.hunting.missile_hunt_basic]: [
        memes.tech.hunting.core,
        memes.tech.combat.missile_basic,
    ],

    // === Technology — tools ===
    [memes.tech.tool.use_basic]: [memes.core.motor_coordination],
    [memes.tech.tool.shaping]: [memes.tech.tool.use_basic],
    [memes.tech.tool.making]: [memes.tech.tool.shaping],

    // === Technology — fire/heat ===
    [memes.tech.fire.use]: [], // использовать/поддерживать огонь
    [memes.tech.fire.control]: [memes.tech.fire.use], // разжигать/гасить/управлять
    [memes.tech.heat.core]: [memes.tech.fire.use], // любое применение тепла требует уметь ПОЛЬЗОВАТЬСЯ огнем
    [memes.tech.heat.space.core]: [memes.tech.heat.core],
    [memes.tech.heat.space.hearth]: [memes.tech.heat.space.core],
    [memes.tech.heat.industrial]: [memes.tech.heat.core], // укрупнённый промышленный тепло-процесс

    // === Technology — food (без тепла по умолчанию) ===
    [memes.tech.food.prep.butchering_basic]: [memes.tech.tool.use_basic],
    [memes.tech.food.prep.milling_basic]: [memes.tech.tool.use_basic],
    [memes.tech.food.prep.leavening_basic]: [],

    [memes.tech.food.preservation.fermentation]: [],
    [memes.tech.food.preservation.drying]: [],
    [memes.tech.food.preservation.salting]: [],
    [memes.tech.food.preservation.pickling]: [],

    [memes.tech.food.sanitation.kitchen_hygiene]: [
        memes.health.sanitation_norms,
    ],

    // кулинарные приёмы: тепло приходит через зависимости, а не через расположение
    [memes.tech.food.culinary.core]: [memes.tech.heat.core],
    [memes.tech.food.culinary.boil]: [memes.tech.food.culinary.core],
    [memes.tech.food.culinary.roast]: [memes.tech.food.culinary.core],
    [memes.tech.food.culinary.bake]: [memes.tech.food.culinary.core],
    [memes.tech.food.culinary.smoke]: [memes.tech.food.culinary.core],

    // === Health / Culture / Law / Econ ===
    [memes.health.sanitation_norms]: [],
    [memes.health.waste_handling]: [memes.health.sanitation_norms],
    [memes.health.waste_sorting]: [memes.health.waste_handling],
    [memes.health.first_aid_basic]: [],
    [memes.health.herbal_knowledge]: [],
    [memes.health.hygiene_tools]: [memes.tech.tool.use_basic],

    // База «справедливости»: требует договорённостей/норм
    [memes.culture.justice_concept]: [memes.cog.standards.agreement],

    [memes.culture.ritual_basic]: [],
    [memes.culture.oath_norm]: [
        memes.culture.ritual_basic,
        memes.comm.language.spoken,
    ],
    [memes.culture.vigil_ritual]: [
        memes.culture.ritual_basic,
        memes.cog.timekeeping.basic,
    ],

    [memes.record.ledgerkeeping]: [
        memes.cog.number_concept,
        memes.comm.language.written,
    ],
    [memes.record.boundary_marking]: [
        memes.cog.space_mapping,
        memes.cog.standards.agreement,
    ],

    [memes.law.public_posting]: [memes.comm.language.written],

    [memes.econ.exchange_barter]: [],
    [memes.econ.token_use]: [
        memes.econ.exchange_barter,
        memes.cog.number_concept,
    ],
    [memes.econ.market_norms]: [memes.econ.token_use, memes.org.scheduling],
    [memes.econ.pooling_common_fund]: [memes.record.ledgerkeeping],
    [memes.econ.deposit_contract]: [memes.econ.pooling_common_fund],

    // === Социальность (общая)

    // === ЭТОЛОГИЯ (без ссылок на soc.*)
    [memes.eth.sociality.solitary]:        [],  // норма вида
    [memes.eth.sociality.cooperative]: [memes.soc.shared_attention, memes.comm.signaling],

    // === Тактики (общие, без привязки к домену; домен задаётся экшеном)
    [memes.eth.tactics.ambush_stalk]:  [memes.core.perception, memes.core.motor_coordination],
    [memes.eth.tactics.pursuit_chase]: [memes.core.perception, memes.core.motor_coordination],

    // === Хищничество (база + драйвы)
    [memes.eth.predation.core]:                 [memes.core.perception, memes.core.motor_coordination],
    [memes.eth.predation.drive.prey_drive]:     [memes.eth.predation.core],
    [memes.eth.predation.drive.play_predation]: [memes.eth.predation.core],
    [memes.eth.predation.drive.scavenging]:     [memes.eth.predation.core],
    [memes.eth.predation.drive.opportunistic]:  [memes.eth.predation.core],

    // === Social
    [memes.soc.networking.basic]: [
        memes.soc.shared_attention,
        memes.comm.signaling,
    ],
    [memes.soc.networking.coalition_building]: [
        memes.soc.networking.basic,
        memes.comm.language.spoken,
    ],

    // === Communication
    [memes.comm.rhetoric.public_debate]: [
        memes.comm.language.spoken,
        memes.soc.shared_attention,
    ],
    [memes.comm.persuasion.basic]: [memes.comm.language.spoken],

    // === Culture — Competition
    [memes.culture.competition.ethos]: [memes.culture.ritual_basic],
    [memes.culture.competition.fair_play_norm]: [
        memes.culture.justice_concept,
        memes.culture.competition.ethos,
    ],

    // === Org
    [memes.org.training.regimen_basic]: [
        memes.org.scheduling,
        memes.cog.timekeeping.basic,
    ],
    [memes.org.tournament.organizing_basic]: [
        memes.org.scheduling,
        memes.record.ledgerkeeping,
    ],

    // === Econ — Contracting/Bidding
    [memes.econ.contracting.contract_basic]: [
        memes.econ.market_norms,
        memes.record.ledgerkeeping,
    ],
    [memes.econ.contracting.bidding_norm]: [
        memes.econ.contracting.contract_basic,
        memes.econ.exchange_barter,
        memes.comm.language.spoken,
    ],
    // === Cognition — Innovation
    [memes.cog.innovation.basic]: [],

    // === Record
    [memes.record.scoreboard.basic]: [
        memes.comm.language.written,
        memes.cog.number_concept,
    ],
    [memes.record.submissions_registry]: [memes.record.ledgerkeeping],
    [memes.record.contract_registry]: [memes.record.ledgerkeeping],
    [memes.record.innovation_register]: [memes.record.ledgerkeeping],
} as const;

export function expandMemes(required: Iterable<MemeId>): Set<MemeId> {
    const need = new Set<MemeId>();
    const stack: MemeId[] = [...required];
    while (stack.length) {
        const m = stack.pop()!;
        if (need.has(m)) continue;
        need.add(m);
        for (const p of memeDeps[m] ?? []) stack.push(p);
    }
    return need;
}

export function canPerform(
    known: Set<MemeId>,
    required: Iterable<MemeId>,
): boolean {
    for (const m of expandMemes(required)) if (!known.has(m)) return false;
    return true;
}
