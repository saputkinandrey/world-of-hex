"""Report actual Godot paired-editing evidence without altering calibration."""
from soma_common import ROOT, MODULE, read, sha, write

out=ROOT/'rig-editor/paired-editing'
validation=read(out/'validation.json')
assert validation['success'] and validation['restart_verified']
assert sha(ROOT/'rig-editor/session.json')==validation['preserved_working_sha256']
session=read(ROOT/'rig-editor/session.json')
assert len(session['overrides']['idle/north-west']['joints'])==13
assert session['view_links']=={'north-east':'north-west'}
replay=read(out/'replay-session.json')
assert 'paired_editing' not in replay and 'editing_mode' not in replay
assert read(out/'editor-settings.json')=={'paired_editing':'Inverted'}
folder=validation['folder'].split('character-rigging-editor/')[1]
checks='\n'.join('- '+x for x in validation['checks'])
report=f'''# SOMA: Free / Symmetric / Inverted

Статус: **done**. Исходное состояние: `409b628b`.

## Работа в редакторе

```powershell
.\\godot\\modules\\character-rigging-editor\\run.ps1 rig-editor
```

В верхней панели появился переключатель `Editing: Free | Symmetric | Inverted`.
Кнопки взаимоисключающие, активная выделена жёлтым. По умолчанию Free.
Пара определяется при выборе сустава; выбранная сторона красная, парная —
фиолетовая (в Free контурная, поскольку автоматически не изменяется).
Названия обеих сторон показаны над сеткой и в каждой проекции. Выбранные
пальцы и их пары остаются видимыми даже без Full 77; остальные мелкие суставы
по-прежнему можно скрывать. Для центральных суставов выводится
`No paired joint - editing selected joint only`.

Парный режим действует на `Apply joint parameter`:

| Уровень | Параметры |
| --- | --- |
| Character Geometry | Length, Local Offset |
| Base Pose | Rotation |
| View Override | Rotation, Length, Local Offset |

Root translation, Camera и Sprite Anchor не являются парными суставными
операциями. Существующие кнопки сброса линз сохраняют прежнюю область действия.
Применение нового парного edit — одно действие Undo/Redo для обеих сторон.
Переключение режима меняет только настройку редактора; оно не создаёт историю
трансформаций, пустые линзы и не выравнивает ранее различавшиеся стороны.

## Явные пары и система координат

В `soma/rig_pairs.gd` явно перечислены 34 пары: глаза, Shoulder/Arm/ForeArm/Hand,
Leg/Shin/Foot/ToeBase/ToeEnd, Thumb и все оригинальные Index/Middle/Ring/Pinky
суставы, включая окончания. Всего 68 парных и 9 центральных суставов.
Проверяется наличие имён, отсутствие повторов и парное соответствие родителей.
Алгоритм не строит пары строковой заменой Left/Right.

Анатомическая сагиттальная плоскость определяется боковым направлением между
RightArm и LeftArm в канонической bind-позе SOMA. Полный ортонормированный
анатомический базис привязан к локальной системе Hips и переносится текущим
поворотом корня относительно его bind-ориентации. Камеры, экранные центры,
Sprite Anchors и зеркальное изображение NorthEast в определении плоскости
не участвуют. Повороты родителей и суставов учитывают реальные, различающиеся
локальные оси оригинального SOMA.

Для общих Geometry/Base Pose используются только общие вращения; активная
линза конкретного вида не меняет семантику общей правки. Для View Override
используются её текущие локальные вращения поверх общей позы. При редактировании
отключённой линзы учитываются её сохранённые ориентации, но сама линза не включается.

## Относительная семантика

Free присваивает новое значение только выбранной стороне. Другие режимы сначала
вычисляют разницу между новым и старым значением, затем добавляют соответствующее
изменение к прежнему значению пары. Обе стороны вычисляются из одного состояния
до операции: вторая не получает уже обновлённые родительские координаты первой.

### Смещения

Пусть S — пространственное отражение в анатомической плоскости, P — текущая
мировая ориентация родителя выбранного сустава, P_pair — ориентация родителя пары.

```text
delta_world = P * (offset_new - offset_old)
delta_pair_local = inverse(P_pair) * S * delta_world
Symmetric: paired_offset_new = paired_offset_old + delta_pair_local
Inverted:  paired_offset_new = paired_offset_old - delta_pair_local
```

Для геометрии изменяются её локальные смещения; в линзе — только
`local_offset_delta` той же Pose/View. Существующие художественные поправки
сохраняются как исходное состояние операции.

### Вращения

Работа ведётся с нормализованными кватернионами. Ввод XYZ остаётся axis-angle
vector в градусах, а не Euler. Для базовой позы или локальной линзы вычисляется
`d = inverse(q_old) * q_new`. При текущей мировой ориентации выбранного сустава W:

```text
D_world = W * d * inverse(W)
D_mirrored = S * matrix(D_world) * S
Symmetric: D_pair_world = D_mirrored
Inverted:  D_pair_world = inverse(D_mirrored)
q_pair_new = q_pair_old * inverse(W_pair) * D_pair_world * W_pair
```

Последняя формула применяется к изменяемому локальному слою, сохраняя rest
rotation, текущую базовую позу и уже существующую асимметрию. Это не вычитание
axis-angle векторов и не присваивание паре отрицательной абсолютной ориентации.
Сохраняются обычные rotvec значения существующей модели данных.

### Длины

Length относится к `Parent -> Selected Joint`. Под полями показаны оба сегмента
и их фактические длины до/после, в метрах. Например, ForeArm -> Hand выбирается
через Hand. Если выбранная длина увеличивается в k раз, парная получает k
в Symmetric или 1/k в Inverted. При изначально разных длинах их различие
не стирается присваиванием одинакового абсолютного значения.

Geometry масштабирует направление локального сегмента. Для View Override
учитывается существующая композиция `g * multiplier + offset_delta`.
Без offset множитель пары получает тот же относительный коэффициент или
обратный. Если offset уже присутствует, переносится отношение **фактических
длин сегментов**; требуемый положительный множитель пары находится из уравнения
`|g_pair * multiplier + offset_pair| = target_length`. Существующий offset
не удаляется и не масштабируется скрыто. Из двух допустимых положительных
решений выбирается ближайшее прежнему значению.

Если заданная длина нулевая/отрицательная или парная длина недостижима без
изменения её offset, операция целиком отклоняется с понятным сообщением.
Ни одна сторона не сохраняется частично. Обратный edit восстанавливает
исходное отношение; нулевой edit не меняет значения пары.

## Сохранение и NorthWest

Выбор режима сохраняется отдельно в `soma/rig-editor/editor-settings.json`:

```json
{{"paired_editing": "Inverted"}}
```

Настройка не входит в Character Geometry, Base Pose или каждую линзу.
При загрузке сохранённые обычные значения суставов вычисляются FK напрямую;
парная операция заново не воспроизводится. При ошибке записи настройки
показывается ошибка, прежний режим сохраняется.

NorthWest получает обе записи в одну и ту же текущую линзу. Живая ссылка
NorthEast использует эту линзу и отражение изображения как прежде; она
не меняется и не превращается в анатомическую перестановку Left/Right.
Независимое редактирование связанного NE остаётся заблокировано до Detach NE.

Рабочий `session.json` сохранён побайтно:
`{validation['preserved_working_sha256']}`.
В нём по-прежнему 13 поправок NorthWest и исходная живая ссылка на NorthEast.
Тестовые режимы/правки записаны только в `soma/rig-editor/paired-editing/`.
Общая геометрия, базовая поза, камеры и якоря не перекалибровывались.

## Проверки A–M

| Сценарий | Результат |
| --- | --- |
| A: Free | RightArm изменяется, LeftArm сохраняется |
| B/C: положение | Отражённое/обратное отражённому XYZ-изменение в пространстве; разные оси родителей и поворот корня |
| D/E: длины | Разные исходные длины; k и 1/k; отдельная проверка линз с Offset Override и без него |
| F/G: вращения | Пространственные матрицы delta проверены в трёх асимметричных исходных позах; inverse edit возвращает ориентацию |
| H: View Overrides | Правки остаются в NW; общая геометрия/поза и остальные оригинальные виды сохранены; NE отражает результат |
| I: Undo/Redo | Реальная кнопка Apply создаёт одну операцию; Undo/Redo возвращают оба плеча точно |
| J: асимметрия | Переключение всех режимов не меняет состояние и не создаёт записи; no-op Apply сохраняет пару |
| K: центры | Chest/Hips/Head/Jaw изменяются один раз, без дополнительных парных записей |
| L: перезапуск | Настройка и 77 точек каждого из шести видов восстановлены без повторного применения delta |
| M: пальцы | Исходная Index2-пара: Geometry/View Offset и Base Pose/View Rotation |

Дополнительно: общая правка не зависит от выбранной камеры; неверная длина
отклоняется атомарно; канонические пары соответствуют оригинальным родителям.
Пространственные сравнения используют независимое FK/эталонное произведение
поворотов, а не только экранные координаты. Допуск матриц вращения — 6e-6
на компоненту базиса; после перезапуска — 0.0001 native px на точку.

Группы проверок Godot:

{checks}

Прежний `rig-proof`: 13 проверок прошли в Free.

## Реальные снимки Godot

Каждый пример начинается с неизменённого Character1 / Idle Working. Через
Character Geometry правое плечо поднимается приблизительно на 7.5 cm и
отводится наружу на 3.5 cm; поля — его родительские локальные координаты.
Существующие асимметрии при этом не устраняются. Эти демонстрационные правки
не записаны в рабочую калибровку пользователя.

Free — изменяется только красная сторона, фиолетовый контур остаётся:

![Free shoulders]({folder}free-shoulders-six.png)

Symmetric — обе стороны поднимаются и отводятся наружу:

![Symmetric shoulders]({folder}symmetric-shoulders-six.png)

Inverted — выбранное плечо поднимается, парное опускается и приводится внутрь:

![Inverted shoulders]({folder}inverted-shoulders-six.png)

Разные исходные длины предплечий и фактическое обратное изменение в линзе:

![Inverted segment lengths]({folder}inverted-length-preview.png)

## Воспроизведение

```powershell
.\\godot\\modules\\character-rigging-editor\\run.ps1 pairs-proof
.\\godot\\modules\\character-rigging-editor\\run.ps1 pairs-reload
```

Проверки используют отдельный replay-session и settings; текущий Working
не перезаписывают. Канонический SOMA и исходные данные не изменены.
Commit/push не выполнялись.

Документация API, использованная для проверки реализации:
[ButtonGroup](https://docs.godotengine.org/en/stable/classes/class_buttongroup.html),
[Basis](https://docs.godotengine.org/en/stable/classes/class_basis.html).
'''
(MODULE/'SOMA-PAIRED-EDITING.md').write_text(report,encoding='utf-8')
write(out/'summary.json',dict(status='done',modes=['Free','Symmetric','Inverted'],pairs=34,
      restart_verified=True,working_unchanged=True,proof_folder=validation['folder']))
print({'report':'SOMA-PAIRED-EDITING.md','working_unchanged':True,'restart_verified':True})
