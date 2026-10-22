# Card combat

Отдельный браузерный прототип карточной дуэли World of Hex. Next.js и MUI,
как в `web-client`; бойцы, предметы и расчёты боя приходят из
`@wohex/domain-data`. Клиент запускается независимо от арены и backend.

## Запуск

Из корня репозитория:

```sh
npm run card-combat:dev
npm run card-combat:build
npm run card-combat:test
```

Адрес: `http://localhost:3006`. Перед запуском, сборкой и тестами автоматически
собирается общий пакет данных. После production-сборки:
`npm --prefix card-combat run start`.

## Первый прототип

- Два игрока за одним экраном выбирают разных бойцов из 12 общих профилей:
  по три велита, гастата, принципа и триария.
- Каждый выбирает начальный эшелон (1–5), число экземпляров доступных
  стратагем (0–3) и общий seed для воспроизводимой дуэли.
- 12 стратагем: атаки, защита, финт, манёвры и добор. Доступность зависит
  от навыка, текущего оружия, дистанции, ОД и FP.
- Максимум ОД равен Базовой Скорости с округлением вниз. В начале своего
  следующего хода боец восстанавливает половину Базовой Скорости с округлением
  вниз, не превышая свой максимум.
  Успешное попадание вызывает выбранную активную защиту за 1 ОД,
  если резерв позволяет. При промахе защита не оплачивается.
- Постоянные карты оружия и щита входят в лимит руки. Начальная рука:
  5 карт, добор: 1 в начале следующего хода, максимум: 7. При переполнении
  игрок сам сбрасывает лишние карты перед продолжением.
- У оружия доступны атакующая и защитная стороны; щит даёт защиту.
  Базовый удар, перемещение и смена оружия доступны без добора стратагемы.
- Пилумы и дротики создают по одной карте на каждый физический снаряд
  из раскладки. Перед началом дуэли метательное оружие переносится в запас,
  гладиус — в руку. Бросок расходует снаряд даже при промахе;
  использованная карта покидает бой. Неиспользованный сброшенный снаряд
  возвращается при перемешивании сброса.
- HP, FP, урон оружия, DR по зоне, активная защита, шок, оглушение,
  потеря сознания и смерть рассчитываются общим ядром РПС.
  Из положения лёжа нужно встать за 1 ОД. Дуэль завершается при смерти
  или потере сознания одного из бойцов.
- Колода, сброс, использованные снаряды и журнал доступны в интерфейсе.

## Границы

Для стартовых позиций дистанция равна сумме номеров эшелонов минус один.
В бою оба бойца могут пересекать центр и перемещаться по общему полю из
десяти клеток. Дистанция — разность их координат на этом поле. Подход и
рывок останавливаются перед противником, отступление — у внешнего края.
Один эшелон — одна
единица дистанции РПС. ОД, карточные бонусы, финт и стоимость манёвров —
правила этого прототипа, а не полный набор правил GURPS. Финт даёт фиксированные
−2 к следующей активной защите; защитная стойка — +2. Оба эффекта истекают
к началу следующего хода затронутого бойца, если не израсходованы ранее.
Защита выбирается действием «Прикрыться» на карточке экипировки: щит даёт
блок, оружие — парирование. Без этого действия автоматической защиты нет.
Защитные стратагемы усиливают выбранную реакцию. Парирование не защищает
от бросков. Подготовленная защита действует до первой реакции или начала
следующего хода; реакция расходует 1 сохранённое ОД.
FP не восстанавливаются автоматически за короткий ход.

Состояние дуэли хранится в памяти вкладки. Перезагрузка страницы возвращает
к подготовке. AI, сетевая игра, сохранение кампании и экономика не входят
в первый прототип.

## Код

`src/duel.ts` — чистые переходы состояния и проверка действий;
`src/cards.ts` — каталог стратагем и требования;
`src/deck.ts` — перемешивание; `components` и `app` — презентация.
Данные бойцов и предметов редактируются в `packages/domain-data/src/rps`,
а не дублируются в клиенте.

### Defense equipment cards

Each free hand supplies one permanent empty-hand card for dodge. A shield and
one-handed weapon occupy both hands; a two-handed weapon also leaves no empty
hand. Heavy two-handed weapons (handsRequired: 2 and the heavy tag) provide
dodge instead of parry on their equipment card. Empty-hand cards count toward
the hand limit and cannot be discarded. These rules belong to this prototype.

### Default attacks and aimed thrusts

Weapon JSON defines defaultAttack (thrust or swing). The card combat client
uses only that mode for basic attacks and melee stratagems; the shared RPS
keeps other supported modes available to arena callers. The thrusting tag
("Колющее" in the UI) is required for both vitals and eyes stratagems.
Eye attacks use the RPS eyes location: -9 to hit, x4 penetrating injury,
without natural skull DR. Eye-specific crippling and vision state are not
implemented by this change.

The eyes stratagem is a playable placeholder in this client. It moves to
discard and adds a log entry, without spending AP/FP, rolling dice or applying
combat effects. Its conversion cost and effects are pending discussion. The
RPS eyes location remains implemented independently.

### Movement action points

Current RPS Move limits AP spent on movement per turn. Each successive step
costs 1 AP more (1, 2, 3, ...), shared by advance, retreat and movement
stratagems. Movement stratagems pay this step total instead of their static AP
cost and move up to their listed distance as affordable. FP cost is unchanged;
movement planning accounts for its effect on Move. Successful steps advance
the price; movement attempts spend the budget even if exertion fails. Both
counters reset at the start of the fighter's next turn.

### Mana and super effort

The shared RPS owns mana and independent Will; the client displays their values.
The restore-mana stratagem is super-effort: 0 AP, 1 FP, restoring floor(Will / 2)
through the RPS operation, capped at maximum mana. It can be used with zero AP.
Normal, super-effort and magic stratagem categories are distinguished in the UI;
existing normal-card FP costs are unchanged pending conversion discussion.

### Current numerical exchange conversion

The stand now resolves paid attacks without hit, defense-success or attack
exertion checks. This conversion replaces the earlier stand attack sequence;
the shared GURPS resolver used by the arena retains its rules.
Attack effort uses the RPS ST/weapon dice. Defense effort uses the same thrust
table with DX, crushing floor zero, plus shield DB for Block; Parry and Dodge
have no equipment bonus yet. Low HP/FP each halve effective defense DX, rounding
up, and RPS defense penalties still apply. These defense coefficients are a
provisional balance profile, not GURPS defense scores.
The exchange rolls numeric attack and available defense, subtracts defense with
a zero floor, then passes the remainder into RPS armor and injury calculation.
Thrown weapons retain RPS half-damage range and are consumed after a paid attack.
Movement, attacks and defensive reactions have independent increasing AP prices
1, 2, 3, etc. A prepared defense remains selected for repeated incoming attacks;
its +2 preparation bonus applies only to the first reaction. Preparing it costs
1 AP; reactions use retained AP, with no reaction if the next price is unaffordable.
Attack and movement counters reset on the fighter's next turn; defense prices
reset for each incoming opponent turn. Non-attack stratagem AP/FP costs and the
playable eyes placeholder remain unchanged. Defense ranges are shown on the
defensive side of equipment cards.

### Current prepared-defense queue

Defense preparation now creates one FIFO entry per paid action. This supersedes
the persistent defensive mode and reaction payments described above. Preparation
costs 1, 2, 3, etc. AP per own turn; incoming attacks consume one queued defense
without another payment. Each entry receives the +2 preparation bonus, shown in
the card's defense range. Unused entries survive turn boundaries; only the
preparation price counter resets on the fighter's next turn. An attack with an
empty queue faces zero active defense before armor. An unsuitable queued mode
(e.g. parry against a projectile) is consumed by that next attack without
providing protection. The UI shows the number of prepared defenses.

### Current handout conversion: commitments and response turns

This section supersedes the earlier immediate-exchange and unsuitable-defense
consumption descriptions. The full arena resolver is unchanged.

- Attacks are announced during the attacker's turn and resolve at the end of the
  defender's response turn. Announced weapon, location, distance and attacker
  capabilities are captured at preparation; retreat does not cancel an announced
  attack. Defender state and resources are read when resolving.
- Each equipped weapon/shield has virtual copies shared between attack and defense.
  One copy at skill 10-11 (and below), then one more per two levels, capped at four.
  Copies of one physical item occupy one hand-limit slot. Empty-hand cards each
  have one copy. Busy copies release on resolution; unused defenses keep them busy.
- Preprepared defenses match suitable attacks in FIFO order. Unsuitable parries
  are skipped for projectiles and remain ready. Defenses prepared during the
  response turn may be assigned to a specific visible threat; assigned defenses
  take priority for that threat. Unassigned response defenses also use FIFO.
- Current armor conversion: each worn armor item's DR supplies five durability
  points to its covered coarse head/body pool. Limb-only items are outside these
  two pools. Residual effort depletes the relevant pool; only overflow enters RPS
  injury, without applying equipment DR a second time. Injury multipliers and
  HP/FP consequences remain shared RPS calculations.
- A block damages its physical shield by absorbed effort, limited by incoming
  attack effort. Shield HP comes from the item (20 if omitted). A destroyed shield
  leaves the hands, cancels its pending commitments and allows an empty-hand card.
- Modular item quality.attackMinimum / quality.defenseMinimum floors the complete
  roll, capped by its normal maximum. It does not floor individual dice or add to
  the maximum. Missing fields mean zero; gladius/scutum expose neutral editable
  values. Legacy arena catalogs omit this presentation-conversion metadata.
- The character sheet still chooses its deck. Skill-based techniques allow one
  copy at their required skill, one more per two levels above it, up to three.
  Combined skillRequirements use the lowest applicable limit. Unrestricted cards
  currently retain the three-copy cap. No automatic repertoire expansion occurs.

Copy thresholds, DR-to-durability conversion and quality minima are explicit
provisional stand settings, not additional GURPS rules. The eyes stratagem remains
playable without its still-unspecified effect.

### Current injury multiplier conversion

Ordinary wounds now convert penetrating effort to lost HP at x1 for impaling,
cutting and crushing weapons. This supersedes the inherited ordinary wound
multipliers described earlier. Special aimed locations retain x3 for impaling
vitals and x4 for skull/eyes. The stand passes an explicit injuryMultiplier;
shared RPS and arena callers that omit it keep full GURPS multipliers.

### Current equipment usage prices

Attack and defense categories no longer have separate AP progression. Each item
has its own per-turn use counter: its first copy costs 1 AP, second 2, third 3,
and so on, shared by attacks and defenses using that item. Sword and shield use
independent counters. Weapon techniques use their weapon's counter. Empty-hand
cards each have their own counter. Counters reset at the start of the owner's
turn; outstanding commitments still occupy copies. Movement keeps its existing
separate step progression. Pilum throws cost a fixed 1 AP and never advance a
usage counter; other thrown equipment uses its own item counter.

### Armor and damage-type addendum

Armor HP = DR x5 remains the baseline conversion; change the coefficient only
from combat stand results. This section supersedes uniform armor overflow.
The relevant head/body pool is selected before damage is applied.

- Impaling: if current armor is above half its maximum before the hit, the whole
  hit targets armor, with no body overflow even if armor is destroyed. At or below
  half, the whole hit bypasses armor and targets body. No armor means body damage.
- Cutting: armor absorbs damage up to its remaining HP; overflow hits the body.
- Crushing: same absorption/overflow, plus floor(absorbed / 5) behind-armor trauma.
  Armor tagged flexible doubles that trauma. Trauma is capped by absorbed damage,
  so direct body damage plus trauma cannot exceed the incoming residual effort.
  Trauma is included in the body damage once, not added again by injury resolution.
- Flexible tagging currently covers lorica_hamata, padded_cloth and cloth_and_leather.
  Flexibility is checked for the hit's coarse armor zone. Shield damage uses its
  existing separate rule and does not generate behind-armor trauma.

The UI shows the piercing breakpoint and flexible armor; logs distinguish armor
loss, body damage, trauma and final HP loss. Special zone multipliers remain;
ordinary wounds stay x1. No new injuries, techniques or generic hooks were added.
Trauma division by five and flexible x2 are provisional test coefficients.

### Unified armor delta

Supersedes separate head/body pools: a single Armor HP pool receives body DR x5 plus helmet DR x2 (provisional helmet coefficient). Head hits use this pool only when a helmet is worn; without a helmet they bypass it. Head payoff is pending design, so the stand currently uses x1 for head damage. Shared RPS location rules remain unchanged. Flexible trauma still depends on the armor in the hit zone.

### Drawn equipment decks

All twelve character sheets now define exactly 20 cards including explicit equipment-action copies, physical projectiles and stratagems. Opening hand is five cards: reshuffle and redeal until it contains at least one weapon card (melee or projectile, not a shield). Held loadout items no longer grant permanent action cards. Only drawn copies can attack or prepare defense; a played copy stays with its commitment and goes to discard after resolution. Unused defenses retain their card across turns. All drawn cards count toward the seven-card hand limit and can be discarded on overflow. Physical projectiles still leave battle after use. Generic evaluate/restore-mana copies fill remaining slots; skill limits on targeted techniques remain unchanged.

### Basic dodge delta

Dodge is no longer an equipment-card side. It is always available as a basic prepared defense and shares the movement action counter (1, 2, 3...) and movement AP budget. Either movement or dodge advances the shared counter; both reset at the start of the fighter's turn. Unused prepared dodges carry over and resolve once against the next suitable attack, without consuming any card. Heavy two-handed weapon cards have no defensive side; shields retain block and other weapon cards retain parry.

### Dodge defense value

Dodge converts the current RPS Dodge statistic through the same thrust-damage table used for numerical defenses. The existing stand defense bonus is added after conversion. RPS already applies shield, HP/FP and state modifiers to Dodge; the stand does not apply those a second time. Zero Dodge gives zero defense. Block and parry retain their DX-based conversion.

### Mana temporarily hidden

SHOW_MANA is currently false: mana bars and mana-related stratagem listings are hidden. Character sheets retain their complete 20-card decks and RPS retains mana and recovery logic. Current battle decks omit mana-related cards before dealing, so they are temporarily smaller and no hidden cards occupy hand slots. Explicit manaEnabled in DuelSetup allows core checks to exercise the preserved full deck.

### Pilum shield damage

A blocked pilum deals double damage to shield durability: min(attack, defense) x2, clamped at zero remaining shield HP. Other weapons and the attack's armor/body damage retain their existing math. This is a stand rule; shared RPS remains unchanged.

### Minimum throwing distance

All throwing attacks require distance at least 2 in the stand. Distance 1 prohibits throwing; existing weapon maximum range and melee reach remain unchanged.

### Mana deck correction

Restore-mana entries are now removed from all twelve character sheets' actual combatDeck lists, without replacement cards. Current decks may be smaller than 20 and must contain 5..20 cards. The common STRATAGEMS catalog and mana mechanics retain Restore Mana. Runtime mana filtering and the manaEnabled setup override are removed. The mana resource remains hidden in the UI.

### Shield Slam and skill investment tiers

Shield Slam requires distance at least 2 and an equipped shield with a bash attack. It closes to distance 1; the first step is free and does not advance the paid movement counter, remaining steps use the current shared movement/dodge cost progression and AP budget. It costs 1 FP, prepares a shield attack and one block simultaneously, and uses its own stratagem card without consuming a drawn shield-action card or adding an equipment AP cost. The attack and block follow existing response-turn/FIFO timing.

Card copy limits now use invested GURPS skill points: 1/2/4/8/12/... points give 1/2/3/4/5/... copies. Skill-level unlock thresholds are temporarily ignored; item and skill identity requirements remain. Evaluate uses Soldier, targeted attacks use the weapon skill, and Shield Slam uses Shield. Character decks include up to four Shield Slam copies within each fighter's limit; Lucius has four Shield Slam and four scutum-action copies. Evaluate filler copies were reduced to the Soldier limit.

### Fighter and combat Extra Effort

All twelve profiles include an editable Fighter skill (HT/Average), initially one point (HT-1), separate from weapon skills. Each deck has one Feverish Defense, Mighty Blow and Flurry of Blows. These cards cost 1 FP and zero AP, prepare a pending modifier and perform no attack or defense themselves. Skill-level thresholds and per-technique copy limits are intentionally deferred (the overall deck size limit remains).

Feverish Defense maximizes the next prepared defense; Mighty Blow maximizes the next prepared attack. Flags stay on the commitment until resolution, where the numerical roll uses sixes and ordinary subtraction/armor still applies. Both work with Shield Slam. Flurry makes the next attack with an attack AP cost free and skips its equipment-use increment; it still consumes the drawn equipment card or physical projectile. Shield Slam's AP cost is movement and is unaffected by Flurry. Pending modifiers survive turns and unrelated actions; repeated cards queue uses instead of increasing a single action's modifier. Mana recovery remains separately hidden and excluded from decks. Gaius and Quintus retain one Vitals card each to keep the expanded decks within 20 cards.

Cassian retains two Vitals cards to keep his expanded deck within 20 cards.

### FP cards and the round limit

Any card with a positive FP cost counts as Extra Effort for the shared limit: one such card per fighter per round (two alternating turns). This includes Evaluate, Shield Slam, Vitals, and the three next-action modifiers. It does not change their effects, governing skills, or AP costs. Zero-FP cards and basic actions do not occupy this slot. Pending modifiers carry over between rounds.

Evaluate now costs 0 AP and 0 FP: its card slot and discard are its cost. It draws two cards and does not occupy the Extra Effort slot.

### Tactics, item verbs, and loaded firearms

This section supersedes the earlier Evaluate draw-two behavior. Evaluate uses Tactics and costs 0 AP / 0 FP. Select another hand card and one of the top four deck cards. Both the stratagem and the replaced hand card enter discard; the chosen deck card enters hand. Unchosen deck cards retain their order. Fewer than four available cards may be inspected; an empty deck cannot be used for replacement. The twelve sheets include an editable one-point IQ/Hard Tactics skill as a test baseline.

A stratagem's `ap` is an optional explicit surcharge, defaulting to zero. Its ordinary attack pays the equipment activation cost separately. Flurry removes the attack cost, but not an explicit card surcharge. Current cards have no separate surcharge. The existing FP-card round limit remains in force.

Weapons may declare a `firearm` profile: fixed damage dice, absolute minimum/maximum range, skill, Aim availability, and compatible attachment slots. Loadout entries may specify `loaded` and `attachments`. Attachments define a bayonet weapon profile, slot, and compatible parent item IDs. They never enter the hand or deck independently. Incompatible configurations fail explicitly.

Firearms enter the deck by physical loadout quantity, not by virtual skill-copy counts. Each physical card has its own persistent Loaded/Aim state and activation counter. Aim costs the next activation, keeps Loaded, and makes the next attack of this item maximal. Fire uses the next activation and consumes Loaded; it does not remove the physical weapon. Bayonet uses the same activation counter and remains available after firing. Aim, Fire, and Bayonet are displayed together on the item card. A drawn firearm remains available for its supported item verbs; its AP counter resets at the start of its owner's turn. Reload is unsupported.

The Roman roster retains its historical equipment. No firearm damage, range, or historical weapon definitions have been invented: firearm and attachment behavior is exercised with explicit test fixtures. Add actual items and loadouts through the shared equipment catalog once their numerical profiles are chosen.

### Tactics formation shifts

Corner and Withdraw are Tactics stratagems costing 0 AP and 0 FP, one copy each in all twelve sheets. Corner shifts both fighters maximally toward the opponent's rear edge, removing retreat space; Withdraw shifts in the opposite direction, providing retreat space. Distance, movement budget, movement steps, item counters, and the FP-card round slot remain unchanged. A zero-step shift is illegal and cannot discard the card. The entire shared ten-cell field is used, including crossing the center.

To preserve the twenty-card limit including ammunition, Gaius and Quintus have two Shield Slam copies; Cassian has three Shield Slam and one Vitals; Nadir has one Vitals. Other equipment and technique counts are unchanged.

### Visible combat table

Prepared weapon and shield copies are displayed as cards on a public combat table below the active hand, grouped by fighter and attack/defense. Playing a normal equipment copy moves it from hand to its commitment; resolution sends it to discard. Unused defenses remain visibly on the table. This is a presentation change: hand size, copy availability, costs, and recycling are unchanged. Prepared actions without a drawn equipment copy are identified as actions rather than occupied cards.

### Exact twenty-card decks

All twelve active fighter sheets now build exactly twenty cards, including physical ammunition. Duel creation rejects both underfilled and oversized decks. Missing slots were filled with existing Feverish Defense, Mighty Blow, and Flurry of Blows copies, whose per-technique copy thresholds remain unspecified. No new equipment, skills, mana cards, or ammunition were introduced. The one-FP-card-per-round rule still applies.

The hand header displays the full twenty-card deck size. The pile counter displays the remaining draw pile, so a fresh five-card hand leaves fifteen cards in the draw pile. Roster tests verify exact size and an opening weapon over sixty seeds per fighter.

### Starting hand: three selected copies plus four random cards

The current opening rule supersedes the earlier five-card redeal rule.
Each fighter sheet defines exactly three distinct combatDeck.startingCards.
Values identify an existing card copy without its side prefix, for example
equipment:gladius:0 or evaluate:0. These copies are moved from the twenty-card
deck into the hand, then four random cards are drawn. The opening hand contains
seven cards and the draw pile contains thirteen. No weapon-triggered redeal is
performed. Missing or duplicate selected copies fail explicitly.
The twelve current fighters select their main weapon, shield, and Evaluate.

### Shields are not destructible in the combat stand

This decision supersedes shield durability and pilum damage against shields.
The stand has no shield HP pool, durability display, destruction, or card removal
on blocking. A used shield card returns to hand; unused defenses remain prepared.
Shared RPS item durability data is retained for other subprojects.

### Adjacent realtime stand

The /realtime route runs both fighters continuously. Segments last 10 seconds,
restore 2 AP and reset activation counters. FIFO queues survive resource shortages.
Attacks resolve at segment boundaries. Heavy physical cards recover for 10 seconds.
Draw defaults to 20 seconds; setup also offers 10 and 30 seconds.
The turn-based route retains its own timing and resource rules.
