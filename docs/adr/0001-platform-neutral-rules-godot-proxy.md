---
status: accepted
date: 2026-10-07
---

> Это архитектурное решение для дальнейшей реализации. Имя пакета `@hex/rules` и примеры API GodotJS иллюстрируют целевую схему; документ не подтверждает наличие пакета или проверку binding/proxy поведения в используемой версии GodotJS.

## Архитектурное решение: предпочтительная интеграция ролевой системы с Godot

При интеграции TypeScript-пакета ролевой системы в Godot **предпочтительным подходом считать прямую работу TypeScript-правил с Godot `Dictionary` / `Array` через GodotJS wrappers/proxies**, без промежуточной JSON-сериализации.

### Главный инвариант

TypeScript-пакет ролевой системы является **platform-agnostic**.

Он:

* не знает о Godot;
* не импортирует Godot-specific API;
* не знает о Node;
* не зависит от DOM/browser API;
* принимает обычные структурные TypeScript-типы;
* реализует только правила и вычисления.

Пример:

```ts
export interface Actor {
    id: string;

    stats: {
        st: number;
        dx: number;
        iq: number;
        ht: number;
    };

    hp: number;
}

export function resolveAttack(
    attacker: Actor,
    defender: Actor,
    context: AttackContext,
): AttackResult {
    // authoritative RPG rules
}
```

Пакет должен одинаково работать с любым объектом, структурно соответствующим `Actor`.

### Владение сущностями

Сущности принадлежат конкретному consumer-приложению.

Например:

* Godot хранит сущности в `Dictionary` / `Array`;
* Node может хранить их как обычные JS objects;
* browser-приложение может использовать обычные JS objects или собственное хранилище.

TypeScript rules package **не является хранилищем сущностей и не должен владеть состоянием мира**.

Фабрики сущностей также находятся на стороне consumer/движка и производят JSON-compatible plain data.

### Godot integration

Для Godot использовать тонкий adapter над GodotJS.

Схема:

```text
Godot Dictionary / Array
        │
        ▼
GodotJS GDictionary / GArray
        │
        ▼
.proxy()
        │
        ▼
structurally typed object
        │
        ▼
@hex/rules
```

То есть Godot-объект передаётся в TypeScript практически по ссылке через существующий GodotJS binding layer.

Не делать в hot path:

```text
Dictionary
→ JSON.stringify
→ string
→ JSON.parse
→ JS object
```

JSON является **форматом контракта и сериализации**, но не обязательным runtime transport внутри Godot.

### Godot adapter

Godot-specific слой должен быть минимальным и находиться вне rules package.

Примерно:

```ts
import * as rules from "@hex/rules";

export function resolve_attack(
    attacker: GDictionary,
    defender: GDictionary,
    context: GDictionary,
) {
    return rules.resolveAttack(
        attacker.proxy(),
        defender.proxy(),
        context.proxy(),
    );
}
```

Сам `@hex/rules` не должен импортировать `GDictionary`, `Node`, `Variant` или любые другие Godot-типы.

### Почему этот подход предпочтителен

Он обеспечивает:

* один источник истины для реализации RPG-правил;
* отсутствие отдельной Godot-реализации правил;
* отсутствие JSON serialize/deserialize overhead на каждом вызове;
* отсутствие копирования всей сущности только ради вычисления;
* возможность работать с тем же rules package из Node, browser и Godot;
* минимальный Godot-specific integration layer;
* возможность использовать уже существующий GodotJS binding/proxy механизм вместо собственного interop-протокола.

### Производительность

Главный потенциальный overhead в Godot — не передача всей сущности, а частый доступ через proxy к вложенным `Dictionary` / `Array`.

Поэтому:

1. Не добавлять промежуточную JSON-сериализацию ради «универсальности».
2. Не дублировать рассчитанные поля исключительно ради уменьшения числа обращений к rules package.
3. Не создавать заранее отдельную copied representation сущностей без данных профайлера.
4. Для часто используемых вложенных структур допустимо кешировать proxy локально:

```ts
const stats = actor.stats;

const dx = stats.dx;
const ht = stats.ht;
```

вместо многократного:

```ts
actor.stats.dx;
actor.stats.ht;
actor.stats.st;
```

5. Если конкретный массовый hot path впоследствии окажется дорогим, оптимизировать именно его:

   * локальный working set;
   * batching;
   * packed representation;
   * иной специализированный путь.

Но это оптимизация второго этапа после профилирования, а не базовая архитектура.

### Массовые вычисления

Не проектировать API так, чтобы огромные объёмы CPU-работы обязательно выполнялись одним синхронным вызовом.

Rules package должен позволять дробить длительные процессы на логические шаги, чтобы Godot/browser могли распределять вычисления между кадрами.

При этом это отдельный вопрос от представления сущностей:

```text
Entity ownership:
consumer

Rules:
TypeScript package

Godot interop:
GodotJS proxy

Scheduling / frame budget:
consumer
```

Не смешивать эти четыре ответственности.

### Dependency direction

Предпочтительная структура:

```text
@hex/rules
    ↑
    │ structural TS contracts
    │
Godot adapter
Node consumer
Browser consumer
```

Недопустимая структура:

```text
@hex/rules
    ↓
GodotJS / Godot API
```

Rules package не должен становиться Godot-specific.

### Итоговое архитектурное правило

**Для Godot предпочтительно передавать существующие Godot `Dictionary` / `Array` в platform-neutral TypeScript rules package через GodotJS proxy, позволяя TypeScript structural typing трактовать их как обычные сущности.**

Это считать базовым вариантом интеграции.

Любые решения с JSON serialization, копированием сущностей или специализированными binary representations использовать только там, где профилирование докажет необходимость.

