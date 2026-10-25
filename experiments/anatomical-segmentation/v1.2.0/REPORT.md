# hex-anatomical-segmentation 1.2.0

Скилл обновлён. Эталоны конкретных экспериментов и все флаги `--verify-…-reference` удалены по указанию пользователя. Площади и максимумы ниже являются наблюдениями, а не целевыми значениями.

## Изменённые файлы

- `C:/Users/Андрей/Desktop/world-of-hex/.agents/skills/hex-anatomical-segmentation/SKILL.md`
- `C:/Users/Андрей/Desktop/world-of-hex/.agents/skills/hex-anatomical-segmentation/scripts/segment.py`
- `C:/Users/Андрей/Desktop/world-of-hex/.agents/skills/hex-anatomical-segmentation/scripts/test_segment.py`

## Математика

Используются исходные ненормализованные хитмапы, без весовых коэффициентов. Для одного слоя заданы два одинаковых виртуальных входа H,H: S1=2H, P1=H². Для двух слоёв S1=A+B, P1=A×B. Для трёх и более сохранена экспериментальная сумма попарных произведений.

Три одновременных обновления `(S,P) = (S+P,S×P)` используют значения предыдущей итерации. Итоговая маска вычисляется из S4 условием `20*S4 >= max(S4)`; нулевая карта даёт пустую маску. Расчёт выполняется точными целыми числами произвольной длины.

Исходные RGBA, условие `alpha > 128`, дедупликация seed, проверка конфликтов, сохранённый transform и функция `preprocess.project` сохранены. Число компонент служит диагностикой. Геометрия маски не корректируется.

## Фактические результаты

Оба прогона использовали `sw-head-consistency-02`: девять уникальных seed, повторный seed 42 учтён один раз.

| Вход | Инициализация | Максимум S4 | Площадь S4 | Компоненты, 4-связность |
| --- | --- | ---: | ---: | --- |
| handwear | single_layer_self_pair | 43967 | 854 | 475, 379 |
| head + back hair | two_layer_product | 56769 | 791 | 790, 1 |

Наблюдаемая динамика handwear:

| Карта | Максимум | Площадь при 5% от собственного максимума |
| --- | ---: | ---: |
| S1 | 14 | 1779 |
| S2 | 63 | 1294 |
| S3 | 749 | 924 |
| S4 | 43967 | 854 |

Артефакты:

- handwear: [маска](handwear/mask.png), [наложение](handwear/overlay-preview.png), [метаданные](handwear/metadata.json), [числовые карты](handwear/numeric.json.gz).
- head + back hair: [маска](head/mask.png), [наложение](head/overlay-preview.png), [метаданные](head/metadata.json), [числовые карты](head/numeric.json.gz).

В каждом числовом архиве сохранены исходные хитмапы, S1–S4, P1–P4 и бинарная маска. Большие значения представлены десятичными строками. Нормализация применяется только при создании диагностических тепловых PNG.

## Запуск

Нужна среда с NumPy и Pillow. Каждый выходной каталог должен быть новым.

```powershell
$repoRoot = 'C:/Users/Андрей/Desktop/world-of-hex'
$pythonPath = 'C:/Users/Андрей/Desktop/hex-animation-tooling/see-through-windows/see-through/.venv/Scripts/python.exe'
$scriptPath = "$repoRoot/.agents/skills/hex-anatomical-segmentation/scripts/segment.py"
$experimentPath = "$repoRoot/godot/modules/character-animation-workbench/neural/evidence/experiments/sw-head-consistency-02"
& $pythonPath $scriptPath --experiment $experimentPath --layers handwear --output "$repoRoot/experiments/anatomical-segmentation/new-handwear-v1.2.0"
& $pythonPath $scriptPath --experiment $experimentPath --layers head 'back hair' --output "$repoRoot/experiments/anatomical-segmentation/new-head-v1.2.0"
```

## Проверки

Восемь общих тестов прошли: одно- и двухслойная инициализация, одновременная рекурсия, трёхслойное обобщение, нулевая карта, точная граница порога, ранжирование, произвольная точность при сериализации, дедупликация seed и обнаружение конфликтующих RGBA. Тесты не привязаны к целевой маске или площади конкретного эксперимента. [Журнал тестов](tests.txt).

Проверены формулы непосредственно на сохранённых числовых картах, равенство PNG и числовых масок, исходные цвета вне маски и контрольные суммы артефактов. Скилл прошёл `quick_validate.py`.

Все 713 файлов исторических экспериментов 2 и 3 неизменны. [Результаты проверки](validation.json). Нейросети не запускались. Коммит, push и merge не выполнялись.

Статус алгоритма остаётся экспериментальным. Анатомическая точность масок не оценивалась; обобщение для трёх и более слоёв остаётся неподтверждённой гипотезой.
