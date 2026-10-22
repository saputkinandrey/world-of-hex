import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Chip,
} from "@mui/material";
import {
    PREGENERATED_FIGHTERS,
    type PregeneratedFighter,
} from "@wohex/domain-data/rps/characters";
import { createCombatant } from "@wohex/domain-data/rps/combat";
import { cardDefinition, heldEquipment, isManaStratagem } from "../src/cards";
import { prepareEquipment } from "../src/duel";
import {
    CLASS_DESCRIPTIONS,
    CLASS_LABELS,
    ITEM_LABELS,
    PLACEMENT_LABELS,
    fighterClass,
} from "../src/presentation";
import type { Side } from "../src/types";
import FighterMark from "./fighter-mark";
import { SHOW_MANA } from "../src/features";

interface RosterProps {
    selected: [PregeneratedFighter, PregeneratedFighter];
    slot: Side;
    onSlot: (side: Side) => void;
    onSelect: (fighter: PregeneratedFighter) => void;
}
function equipmentCopies(fighter: PregeneratedFighter): string {
    const combatant = prepareEquipment(createCombatant(fighter));
    return heldEquipment(combatant)
        .map(
            (entry) =>
                `${ITEM_LABELS[entry.itemId] ?? entry.item.name} ×${fighter.combatDeck.equipment[entry.itemId] ?? 0}`,
        )
        .join(" · ");
}
export default function Roster({
    selected,
    slot,
    onSlot,
    onSelect,
}: RosterProps) {
    return (
        <>
            <div className="chosen-pair">
                {selected.map((fighter, index) => {
                    const side = index as Side;
                    const combatant = createCombatant(fighter);
                    const techniques = Object.entries(
                        fighter.combatDeck.stratagems,
                    ).filter(
                        ([id, count]) =>
                            count > 0 &&
                            (SHOW_MANA || !isManaStratagem(cardDefinition(id))),
                    );
                    return (
                        <section
                            key={fighter.id}
                            className={`chosen-player side-${side} ${slot === side ? "editing" : ""}`}
                        >
                            <button
                                className="chosen-main"
                                onClick={() => onSlot(side)}
                                aria-pressed={slot === side}
                            >
                                <span className="eyebrow">
                                    БОЕЦ {side + 1} ·{" "}
                                    {slot === side ? "ВЫБИРАЕМ" : "ВЫБРАН"}
                                </span>
                                <div className="fighter-heading">
                                    <FighterMark
                                        kind={fighter.lens.id}
                                        size={70}
                                    />
                                    <div>
                                        <h2>{fighter.name}</h2>
                                        <span>{fighterClass(fighter)}</span>
                                    </div>
                                </div>
                                <div className="attributes">
                                    {Object.entries(fighter.attributes).map(
                                        ([name, value]) => (
                                            <span key={name}>
                                                <b>{value}</b> {name}
                                            </span>
                                        ),
                                    )}
                                </div>
                            </button>
                            <p
                                className="muted small"
                                style={{ padding: "0 20px" }}
                            >
                                Копии действий: {equipmentCopies(fighter)}
                            </p>
                            <Accordion
                                disableGutters
                                elevation={0}
                                className="loadout-accordion"
                            >
                                <AccordionSummary expandIcon={<span>+</span>}>
                                    Экипировка ·{" "}
                                    {combatant.equipment.reduce(
                                        (sum, item) => sum + item.quantity,
                                        0,
                                    )}{" "}
                                    предметов
                                </AccordionSummary>
                                <AccordionDetails>
                                    <div className="equipment-list">
                                        {combatant.equipment.map((entry, i) => (
                                            <div key={`${entry.itemId}:${i}`}>
                                                <span>
                                                    {ITEM_LABELS[
                                                        entry.itemId
                                                    ] ?? entry.item.name}
                                                    {entry.quantity > 1
                                                        ? ` ×${entry.quantity}`
                                                        : ""}
                                                </span>
                                                <small>
                                                    {
                                                        PLACEMENT_LABELS[
                                                            entry.placement
                                                        ]
                                                    }
                                                </small>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionDetails>
                            </Accordion>
                            <Accordion
                                disableGutters
                                elevation={0}
                                className="loadout-accordion"
                            >
                                <AccordionSummary expandIcon={<span>+</span>}>
                                    Стратагемы ·{" "}
                                    {techniques.reduce(
                                        (sum, [, count]) => sum + count,
                                        0,
                                    )}{" "}
                                    карт
                                </AccordionSummary>
                                <AccordionDetails>
                                    <p className="muted small">
                                        Готовая колода из листа персонажа.
                                    </p>
                                    {techniques.map(([id, count]) => (
                                        <div className="deck-row" key={id}>
                                            <span>
                                                {cardDefinition(id).name}
                                            </span>
                                            <b>×{count}</b>
                                        </div>
                                    ))}
                                </AccordionDetails>
                            </Accordion>
                        </section>
                    );
                })}
            </div>
            <div className="section-heading">
                <div>
                    <span className="eyebrow">ОБЩИЙ КАТАЛОГ БОЙЦОВ</span>
                    <h2>Четыре специализации. Двенадцать характеров.</h2>
                </div>
                <Chip label="12 / 12" variant="outlined" />
            </div>
            <div className="roster-grid">
                {Object.entries(CLASS_LABELS).map(([id, label]) => (
                    <section className="roster-group" key={id}>
                        <div className="roster-group-heading">
                            <FighterMark kind={id} size={40} />
                            <div>
                                <h3>{label}</h3>
                                <p>{CLASS_DESCRIPTIONS[id]}</p>
                            </div>
                        </div>
                        {PREGENERATED_FIGHTERS.filter(
                            (fighter) => fighter.lens.id === id,
                        ).map((fighter) => {
                            const selectedSide = selected.findIndex(
                                (candidate) => candidate.id === fighter.id,
                            );
                            return (
                                <Button
                                    key={fighter.id}
                                    className={`roster-fighter ${selectedSide >= 0 ? `selected side-${selectedSide}` : ""}`}
                                    onClick={() => onSelect(fighter)}
                                    disabled={selectedSide === 1 - slot}
                                    aria-label={`Выбрать ${fighter.name}`}
                                    aria-pressed={selectedSide === slot}
                                >
                                    <span>
                                        <strong>{fighter.name}</strong>
                                        <small>
                                            ST {fighter.attributes.ST} · DX{" "}
                                            {fighter.attributes.DX} · HT{" "}
                                            {fighter.attributes.HT}
                                        </small>
                                        <small>
                                            {equipmentCopies(fighter)}
                                        </small>
                                    </span>
                                    <span className="roster-number">
                                        {selectedSide >= 0
                                            ? `0${selectedSide + 1}`
                                            : "+"}
                                    </span>
                                </Button>
                            );
                        })}
                    </section>
                ))}
            </div>
        </>
    );
}
