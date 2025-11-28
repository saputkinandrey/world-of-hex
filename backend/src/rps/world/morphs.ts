// from-gpt/morphs.ts
// Морфологические/механические "мемы" — то, что умеет тело (body plan, локомоция, сенсоры, оружие и т.п.).

import {LeafValues} from "../types/leaf-values.type";

export type MorphId = LeafValues<typeof morph>;

/**
 * Базовое дерево морфологических способностей.
 *
 * Здесь собран обобщённый и модульный набор для позвоночных и крупных беспозвоночных:
 *  - body_plan      — общий план тела;
 *  - locomotion     — способы перемещения;
 *  - manip          — манипуляторы (чем брать/держать);
 *  - sense_hw       — "железо" сенсорных систем;
 *  - integument     — покровы тела;
 *  - natural_weapon — природное оружие;
 *  - size_class     — грубый класс размера;
 *  - respiration    — базовый тип дыхания;
 *  - thermoreg      — способ терморегуляции.
 *
 * Этого достаточно, чтобы описать ящерицу, змею, мелкого млекопитающего, птицу, рыбину
 * и базовых насекомых/пауков. Потом можно будет аккуратно дополнять.
 */
export const morph = {
    kinematics: {
        combat: {
            body_lunge: 'eth.kinematics.combat.body_lunge',
            coil_strike: 'eth.kinematics.combat.coil_strike',
            body_impact: 'eth.kinematics.combat.body_impact',
            constrict_wrap: 'eth.kinematics.combat.constrict_wrap',
            bite_attack: 'eth.kinematics.combat.bite_attack',
        },
        slither_move: 'eth.kinematics.slither_move',
        spring_jump: 'eth.kinematics.spring_jump',
    },
    core: {
        perception: 'core.perception',
        motor_coordination: 'core.motor_coordination',
    },
    vital: {
        living: 'core.vital.living',
    },

    // ───────────────────────────────────────────────────────────
    // План тела / общая конфигурация
    // ─────────────────────────────────────────s──────────────────
    body_plan: {
        /** Маленький наземный тетрапод (ящерица, мелкий грызун и т.п.). */
        tetrapod_small_ground: 'morph.body_plan.tetrapod_small_ground',

        /** Крупный наземный тетрапод (лошадь, крупный хищник). */
        tetrapod_large_ground: 'morph.body_plan.tetrapod_large_ground',

        /** Тетрапод с выраженной способностью лазать (лесные звери, лазящие ящерицы). */
        tetrapod_climber: 'morph.body_plan.tetrapod_climber',

        /** Серпентинная наземная форма (змеи и т.п.). */
        serpentine_ground: 'morph.body_plan.serpentine_ground',

        /** Серпентинная, с выраженной водной адаптацией. */
        serpentine_aquatic: 'morph.body_plan.serpentine_aquatic',

        /** Птичий план тела (крылья + задние конечности). */
        avian: 'morph.body_plan.avian',

        /** Рыбоподобный план тела (рыбы, амфибии в воде). */
        fish_like: 'morph.body_plan.fish_like',

        /** Шестиногий "насекомый" план тела. */
        hexapod_insect: 'morph.body_plan.hexapod_insect',

        /** Паукообразные (4 пары ног, цефалоторакс). */
        arachnid: 'morph.body_plan.arachnid',

        /** Гуманоидный план тела (2 руки, 2 ноги, прямохождение). */
        humanoid: 'morph.body_plan.humanoid',
    },

    // ───────────────────────────────────────────────────────────
    // Локомоция
    // ───────────────────────────────────────────────────────────
    locomotion: {
        /** Обычная бипедальная ходьба. */
        walk_biped: 'morph.locomotion.walk_biped',

        /** Обычная четвероногая ходьба. */
        walk_quadruped: 'morph.locomotion.walk_quadruped',

        /** Низкое "ползание/шагание" четвероногих по земле (ящерица, крысоподобные). */
        crawl_quadruped: 'morph.locomotion.crawl_quadruped', // уже использовалось в профиле ящерицы

        /** Серпентинное скольжение по земле. */
        slither_ground: 'morph.locomotion.slither_ground',

        /** Прыжки небольших животных (лягушки, некоторые ящерицы, кенгуровые мелкие). */
        hop_small: 'morph.locomotion.hop_small',

        /** Активное рытьё и движение в толще грунта. */
        burrow_dig: 'morph.locomotion.burrow_dig',

        /** Лазание по грубой поверхности (камни, кора дерева). */
        climb_rough_surface: 'morph.locomotion.climb_rough_surface', // уже использовалось

        /** Ограниченное лазание по относительно гладкой поверхности. */
        climb_smooth_limited: 'morph.locomotion.climb_smooth_limited',

        /** Базовое плавание (могут держаться на воде и двигаться). */
        swim_basic: 'morph.locomotion.swim_basic',

        /** Быстрое/эффективное плавание (рыбы, водные млекопитающие). */
        swim_fast: 'morph.locomotion.swim_fast',

        /** Планирующий полёт (летяги, планирующие ящерицы). */
        glide_basic: 'morph.locomotion.glide_basic',

        /** Активный взмаховый полёт (птицы, летучие мыши). */
        fly_flapping: 'morph.locomotion.fly_flapping',

        /** Малая "зависшая" аэродинамика (насекомые с зависанием). */
        hover_insect: 'morph.locomotion.hover_insect',
    },

    // ───────────────────────────────────────────────────────────
    // Манипуляторы (чем брать/держать предметы)
    // ───────────────────────────────────────────────────────────
    manip: {
        /** Фактически нет специализированных манипуляторов, только рот/челюсти. */
        mouth_only: 'morph.manip.mouth_only',

        /** Передние лапы пригодны для копания/опоры, но не для тонкой моторики. */
        forepaws_non_manip: 'morph.manip.forepaws_non_manip',

        /** Когти/лапа позволяют примитивный захват (перенести, держать грубо). */
        claws_simple_grip: 'morph.manip.claws_simple_grip',

        /** Полноценные хватательные руки (приматы, гуманоиды). */
        hands_grasping: 'morph.manip.hands_grasping',

        /** Гибкий хобот с возможностью хватать и манипулировать. */
        trunk_flexible: 'morph.manip.trunk_flexible',

        /** Гибкие щупальца с возможностью точной манипуляции. */
        tentacles_flexible: 'morph.manip.tentacles_flexible',

        /** Клюв, пригодный для использования как простой инструмент. */
        beak_toollike: 'morph.manip.beak_toollike',
    },

    // ───────────────────────────────────────────────────────────
    // Сенсорное "железо"
    // ───────────────────────────────────────────────────────────
    sense: {
        /** Есть хоть какая-то формирующая изображение зрительная система. */
        vision_basic: 'morph.sense.vision_basic',

        /** Бинокулярное зрение с перекрывающимися полями (оценка расстояния). */
        vision_binocular: 'morph.sense.vision_binocular',

        /** Улучшенное зрение при слабом освещении. */
        vision_lowlight: 'morph.sense.vision_lowlight',

        /** Богатое цветовое зрение (птицы, приматы). */
        vision_color_rich: 'morph.sense.vision_color_rich',

        /** Базовое обоняние. */
        olfaction_basic: 'morph.sense.olfaction_basic',

        /** Развитое обоняние для слежения по запаховому следу. */
        olfaction_tracking: 'morph.sense.olfaction_tracking',

        /** Базовый слух. */
        hearing_basic: 'morph.sense.hearing_basic',

        /** Хорошая локализация по звуку, широкий диапазон частот. */
        hearing_directional: 'morph.sense.hearing_directional',

        /** Чувствительность к вибрациям грунта/опоры. */
        vibration_ground: 'morph.sense.vibration_ground',

        /** Латеральная линия (водные позвоночные). */
        lateral_line: 'morph.sense.lateral_line',

        /** Эхолокация (летучие мыши, зубатые киты). */
        echolocation_basic: 'morph.sense.echolocation_basic',

        /** Электрорецепция (некоторые рыбы и амфибии). */
        electroreception_basic: 'morph.sense.electroreception_basic',
    },

    // ───────────────────────────────────────────────────────────
    // Покровы тела
    // ───────────────────────────────────────────────────────────
    integument: {
        /** Сухие чешуйки (типично для рептилий). */
        scales_dry: 'morph.integument.scales_dry',

        /** Гладкие чешуйки (змеи и часть рыб). */
        scales_smooth: 'morph.integument.scales_smooth',

        /** Обычная шерсть. */
        fur_basic: 'morph.integument.fur_basic',

        /** Густая/теплосберегающая шерсть. */
        fur_dense: 'morph.integument.fur_dense',

        /** Перья (базовый уровень). */
        feathers_basic: 'morph.integument.feathers_basic',

        /** Практически голая кожа (с минимальной шерстью/перьями). */
        skin_bare: 'morph.integument.skin_bare',

        /** Хитинизированный экзоскелет (насекомые, пауки). */
        exoskeleton_chitin: 'morph.integument.exoskeleton_chitin',

        /** Костные пластины/панцири (черепахи, броненосцы и т.п.). */
        armor_bony_plates: 'morph.integument.armor_bony_plates',
    },

    // ───────────────────────────────────────────────────────────
    // Природное оружие
    // ───────────────────────────────────────────────────────────
    natural_weapon: {
        /** Маленький укус как основное оружие. */
        bite_small: 'morph.natural_weapon.bite_small', // уже использовалось

        /** Средний укус (собака/кошка размером с человека). */
        bite_medium: 'morph.natural_weapon.bite_medium',

        /** Крупный укус (крокодил, крупный хищник). */
        bite_large: 'morph.natural_weapon.bite_large',

        /** Небольшие когти. */
        claws_small: 'morph.natural_weapon.claws_small',

        /** Крупные когти (медведи, крупные кошки). */
        claws_large: 'morph.natural_weapon.claws_large',

        /** Рога/роговые отростки небольшого размера. */
        horns_small: 'morph.natural_weapon.horns_small',

        /** Крупные рога/бивни. */
        horns_large: 'morph.natural_weapon.horns_large',

        /** Ударный "булавоподобный" хвост. */
        tail_club: 'morph.natural_weapon.tail_club',

        /** Хлёсткий хвост (как кнут). */
        tail_whip: 'morph.natural_weapon.tail_whip',

        /** Клюв для клевания/крушения. */
        beak_peck: 'morph.natural_weapon.beak_peck',

        /** Жало небольшого размера. */
        stinger_small: 'morph.natural_weapon.stinger_small',

        /** Сжимающее тело/кольца (констриктор). */
        constrictor_body: 'morph.natural_weapon.constrictor_body',

        /** Передние ядовитые клыки. */
        venom_fangs_front: 'morph.natural_weapon.venom_fangs_front',

        /** Задние ядовитые клыки. */
        venom_fangs_rear: 'morph.natural_weapon.venom_fangs_rear',
    },

// ───────────────────────────────────────────────────────────
// Размер (GURPS-совместимые Size Modifier'ы)
// ───────────────────────────────────────────────────────────
    size: {
        /** GURPS: SM-8 — очень мелкие: мышь, мелкая ящерица, воробей. */
        SMn8: 'morph.size.SM-8',

        /** GURPS: SM-7 — побольше мыши, но всё ещё в "мелочи". */
        SMn7: 'morph.size.SM-7',

        /** GURPS: SM-6 — крыса, крупная ящерица, небольшая птица. */
        SMn6: 'morph.size.SM-6',

        /** GURPS: SM-5 — что-то вроде хорька / очень мелкой кошки. */
        SMn5: 'morph.size.SM-5',

        /** GURPS: SM-4 — кошка, мелкая собака. */
        SMn4: 'morph.size.SM-4',

        /** GURPS: SM-3 — крупная кошка / маленькая лиса. */
        SMn3: 'morph.size.SM-3',

        /** GURPS: SM-2 — лисица, средняя собака. */
        SMn2: 'morph.size.SM-2',

        /** GURPS: SM-1 — мелкий человек, подросток, очень стройный. */
        SMn1: 'morph.size.SM-1',

        /** GURPS: SM+0 — "человеческий" базовый размер. */
        SM0: 'morph.size.SM+0',

        /** GURPS: SM+1 — крупный человек, между человеком и лошадью. */
        SMp1: 'morph.size.SM+1',

        /** GURPS: SM+2 — лошадь, корова, крупный хищник. */
        SMp2: 'morph.size.SM+2',

        /** GURPS: SM+3 — очень крупные звери, мелкие динозавры. */
        SMp3: 'morph.size.SM+3',

        /** GURPS: SM+4 — слон, большой динозавр/дракон. */
        SMp4: 'morph.size.SM+4',

        /** GURPS: SM+5 — межслоново-китовая зона. */
        SMp5: 'morph.size.SM+5',

        /** GURPS: SM+6 — кит, очень крупный дракон. */
        SMp6: 'morph.size.SM+6',
    },

    // ───────────────────────────────────────────────────────────
    // Дыхание
    // ───────────────────────────────────────────────────────────
    respiration: {
        /** Жабры, постоянная зависимость от воды. */
        gills_aquatic: 'morph.respiration.gills_aquatic',

        /** Базовые лёгкие. */
        lungs_basic: 'morph.respiration.lungs_basic',

        /** Высокоэффективная лёгочная система (птицы и аналоги). */
        lungs_high_efficiency: 'morph.respiration.lungs_high_efficiency',

        /** Дополнительное дыхание через кожу/слизь (некоторые амфибии). */
        skin_assist: 'morph.respiration.skin_assist',
    },


    // ───────────────────────────────────────────────────────────
    // Терморегуляция (GURPS-стиль: Cold-Blooded / "норма")
    // ───────────────────────────────────────────────────────────
    thermoreg: {
        /** GURPS: Cold-Blooded — температура тела сильно зависит от среды. */
        coldBlooded: 'morph.thermoreg.coldBlooded',

        /**
         * "Тёплокровный" базовый вариант (птицы, млекопитающие).
         * В GURPS это обычно просто норма, без отдельного признака.
         */
        warmBlooded: 'morph.thermoreg.warmBlooded',
    },
} as const;
