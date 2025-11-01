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
        perception:            'core.perception',
        motor_coordination:    'core.motor_coordination',
    } as const,

    // === Social / Communication ===
    soc: {
        shared_attention:      'soc.shared_attention',
    } as const,

    comm: {
        signaling:             'comm.signaling',
        language: {
            spoken:           'comm.language.spoken',
            written:          'comm.language.written',
        },
        signage:               'comm.signage',        // ← «знаковость/таблички»
    } as const,

    // === Cognition / Org ===
    cog: {
        counting: {
            tally:            'cog.counting.tally',
        },
        number_concept:        'cog.number_concept',
        measurement: {
            rudimentary:     'cog.measurement.rudimentary',
        },
        standards: {
            agreement:       'cog.standards.agreement',
        },
        timekeeping: {
            basic:           'cog.timekeeping.basic',
        },
        space_mapping:         'cog.space_mapping',
    } as const,

    org: {
        scheduling:            'org.scheduling',
        duty_roster:           'org.duty_roster',
        workshop_practice:     'org.workshop_practice',
    } as const,

    // === Technology ===
    tech: {
        tool: {
            use_basic:       'tech.tool.use_basic',
            shaping:         'tech.tool.shaping',
            making:          'tech.tool.making',
        },
        fire: {
            use:     'tech.fire.use',      // уметь пользоваться «найденным» огнём: поддерживать, переносить
            control: 'tech.fire.control',  // уметь разжигать/гасить/управлять источником
        },

        heat: {
            core:        'tech.heat.core',        // абстракция применения тепла (любой домен)
            space: {
                core:      'tech.heat.space.core',  // отопление/очаг
                hearth:    'tech.heat.space.hearth',
            },
            industrial:  'tech.heat.industrial',  // << упрощено до одного узла
        },

        food: {
            prep: {
                butchering_basic: 'tech.food.prep.butchering_basic',
                milling_basic:    'tech.food.prep.milling_basic',
                leavening_basic:  'tech.food.prep.leavening_basic',
            },
            preservation: {
                fermentation: 'tech.food.preservation.fermentation',
                drying:       'tech.food.preservation.drying',
                salting:      'tech.food.preservation.salty',
                pickling:     'tech.food.preservation.pickling',
            },
            sanitation: {
                kitchen_hygiene: 'tech.food.sanitation.kitchen_hygiene',
            },
            culinary: {
                core:  'tech.food.culinary.core',
                boil:  'tech.food.culinary.boil',
                roast: 'tech.food.culinary.roast',
                bake:  'tech.food.culinary.bake',
                smoke: 'tech.food.culinary.smoke',
            },
        },

    } as const,

    // === Health / Culture / Law / Econ ===
    health: {
        sanitation_norms:      'health.sanitation_norms',
        waste_handling:        'health.waste_handling',
        waste_sorting:         'health.waste_sorting',
        first_aid_basic:       'health.first_aid_basic',
        herbal_knowledge:      'health.herbal_knowledge',
        hygiene_tools:         'health.hygiene_tools',
    } as const,

    culture: {
        ritual_basic:          'culture.ritual_basic',
        oath_norm:             'culture.oath_norm',
        vigil_ritual:          'culture.vigil_ritual',
    } as const,

    record: {
        ledgerkeeping:         'record.ledgerkeeping',
        boundary_marking:      'record.boundary_marking',
    } as const,

    law: {
        public_posting:        'law.public_posting',
    } as const,

    econ: {
        exchange_barter:       'econ.exchange_barter',
        token_use:             'econ.token_use',
        market_norms:          'econ.market_norms',
        pooling_common_fund:   'econ.pooling_common_fund',
        deposit_contract:      'econ.deposit_contract',
    } as const,
} as const;

// 👉 Алиасы верхнего уровня — чтобы IDE подсказывала и по коротким префиксам:
export const core    = memes.core;
export const soc     = memes.soc;
export const comm    = memes.comm;
export const cog     = memes.cog;
export const org     = memes.org;
export const tech    = memes.tech;
export const fire    = tech.fire;
export const food    = tech.food;
export const culinary    = food.culinary;
export const culture = memes.culture;
export const record  = memes.record;
export const law     = memes.law;
export const econ    = memes.econ;

// ===== Типы: все листовые значения автоматически собираются в union =====
type LeafValues<T> = T extends string ? T : { [K in keyof T]: LeafValues<T[K]> }[keyof T];
export type MemeId = LeafValues<typeof memes>;


// Явные зависимости (только «смысловые» ребра; остальное достроит резолвер)
export const memeDeps: Record<MemeId, readonly MemeId[]> = {
    // === Core ===
    [memes.core.perception]:            [],
    [memes.core.motor_coordination]:    [],

    // === Social / Communication ===
    [memes.soc.shared_attention]:       [memes.core.perception],
    [memes.comm.signaling]:             [memes.soc.shared_attention],
    [memes.comm.language.spoken]:       [memes.comm.signaling],
    [memes.comm.language.written]:      [memes.comm.language.spoken],
    [memes.comm.signage]:               [memes.comm.language.written],

    // === Cognition / Org ===
    [memes.cog.counting.tally]:         [],
    [memes.cog.number_concept]:         [memes.cog.counting.tally],
    [memes.cog.measurement.rudimentary]:[],
    [memes.cog.standards.agreement]:    [memes.comm.language.spoken],
    [memes.cog.timekeeping.basic]:      [],
    [memes.cog.space_mapping]:          [],

    [memes.org.scheduling]:             [memes.cog.timekeeping.basic],
    [memes.org.duty_roster]:            [memes.org.scheduling],
    [memes.org.workshop_practice]:      [memes.tech.tool.making],

    // === Technology — tools ===
    [memes.tech.tool.use_basic]:        [memes.core.motor_coordination],
    [memes.tech.tool.shaping]:          [memes.tech.tool.use_basic],
    [memes.tech.tool.making]:           [memes.tech.tool.shaping],

    // === Technology — fire/heat ===
    [memes.tech.fire.use]:              [],                        // использовать/поддерживать огонь
    [memes.tech.fire.control]:          [memes.tech.fire.use],     // разжигать/гасить/управлять
    [memes.tech.heat.core]:             [memes.tech.fire.use],     // любое применение тепла требует уметь ПОЛЬЗОВАТЬСЯ огнем
    [memes.tech.heat.space.core]:       [memes.tech.heat.core],
    [memes.tech.heat.space.hearth]:     [memes.tech.heat.space.core],
    [memes.tech.heat.industrial]:       [memes.tech.heat.core],    // укрупнённый промышленный тепло-процесс

    // === Technology — food (без тепла по умолчанию) ===
    [memes.tech.food.prep.butchering_basic]: [memes.tech.tool.use_basic],
    [memes.tech.food.prep.milling_basic]:    [memes.tech.tool.use_basic],
    [memes.tech.food.prep.leavening_basic]:  [],

    [memes.tech.food.preservation.fermentation]: [],
    [memes.tech.food.preservation.drying]:       [],
    [memes.tech.food.preservation.salting]:        [],
    [memes.tech.food.preservation.pickling]:     [],

    [memes.tech.food.sanitation.kitchen_hygiene]:[memes.health.sanitation_norms],

    // кулинарные приёмы: тепло приходит через зависимости, а не через расположение
    [memes.tech.food.culinary.core]:    [memes.tech.heat.core],
    [memes.tech.food.culinary.boil]:    [memes.tech.food.culinary.core],
    [memes.tech.food.culinary.roast]:   [memes.tech.food.culinary.core],
    [memes.tech.food.culinary.bake]:    [memes.tech.food.culinary.core],
    [memes.tech.food.culinary.smoke]:   [memes.tech.food.culinary.core],

    // === Health / Culture / Law / Econ ===
    [memes.health.sanitation_norms]:    [],
    [memes.health.waste_handling]:      [memes.health.sanitation_norms],
    [memes.health.waste_sorting]:       [memes.health.waste_handling],
    [memes.health.first_aid_basic]:     [],
    [memes.health.herbal_knowledge]:    [],
    [memes.health.hygiene_tools]:       [memes.tech.tool.use_basic],

    [memes.culture.ritual_basic]:       [],
    [memes.culture.oath_norm]:          [memes.culture.ritual_basic, memes.comm.language.spoken],
    [memes.culture.vigil_ritual]:       [memes.culture.ritual_basic, memes.cog.timekeeping.basic],

    [memes.record.ledgerkeeping]:       [memes.cog.number_concept, memes.comm.language.written],
    [memes.record.boundary_marking]:    [memes.cog.space_mapping, memes.comm.signage],

    [memes.law.public_posting]:         [memes.comm.signage],

    [memes.econ.exchange_barter]:       [],
    [memes.econ.token_use]:             [memes.econ.exchange_barter, memes.cog.number_concept],
    [memes.econ.market_norms]:          [memes.econ.token_use, memes.org.scheduling],
    [memes.econ.pooling_common_fund]:   [memes.record.ledgerkeeping],
    [memes.econ.deposit_contract]:      [memes.econ.pooling_common_fund],
} as const;

export function expandMemes(required: Iterable<MemeId>): Set<MemeId> {
    const need = new Set<MemeId>();
    const stack: MemeId[] = [...required];
    while (stack.length) {
        const m = stack.pop()!;
        if (need.has(m)) continue;
        need.add(m);
        for (const p of (memeDeps[m] ?? [])) stack.push(p);
    }
    return need;
}

export function canPerform(known: Set<MemeId>, required: Iterable<MemeId>): boolean {
    for (const m of expandMemes(required)) if (!known.has(m)) return false;
    return true;
}
