# Experimental anatomical segmentation v1.0.0

Реализован статистический постпроцессор сохранённых RGBA-слоёв LayerDiff. Нейросети не запускались. Все 205 файлов исходного `sw-head-consistency-02` сохранили контрольные суммы; [общая проверка](verification.json).

## Файлы реализации

- `C:/Users/Андрей/Desktop/world-of-hex/.agents/skills/hex-anatomical-segmentation/SKILL.md` — минимальный рабочий процесс с явно заданными слоями.
- `C:/Users/Андрей/Desktop/world-of-hex/.agents/skills/hex-anatomical-segmentation/scripts/segment.py` — чтение данных, дедупликация seed, проекция через существующий `preprocess.project`, точная рекурсия и артефакты.
- `C:/Users/Андрей/Desktop/world-of-hex/.agents/skills/hex-anatomical-segmentation/scripts/test_segment.py` — шесть проверок арифметики, порога, ранжирования, сериализации и повторных seed.

Существующие файлы проекта не редактировались. Коммиты, push и merge не выполнялись.

## Команда

Проверенная среда содержит NumPy 2.2.6 и Pillow 12.1.1. GPU и модельные SDK для скрипта не нужны. Выходная директория должна быть новой.

```powershell
$repoRoot = 'C:/Users/Андрей/Desktop/world-of-hex'
& 'C:/Users/Андрей/Desktop/hex-animation-tooling/see-through-windows/see-through/.venv/Scripts/python.exe' `
  "$repoRoot/.agents/skills/hex-anatomical-segmentation/scripts/segment.py" `
  --experiment "$repoRoot/godot/modules/character-animation-workbench/neural/evidence/experiments/sw-head-consistency-02" `
  --layers head 'back hair' `
  --output "$repoRoot/experiments/anatomical-segmentation/head-new" `
  --verify-head-reference
```

## Контроль головы

| Показатель | Результат |
| --- | ---: |
| Уникальные seed | 9 |
| Интенсивность head | 4912 |
| Интенсивность back hair | 18617 |
| Вес head | 8 |
| Вес back hair | 5 |
| Максимум S4 | 452785773 |
| Порог | 1/20 максимума S4 |
| Площадь | 774 |
| Компоненты, 4-связность | 773 и 1 |
| Контроль head ×1 / back hair ×1 | 791 |
| Контроль head ×5 / back hair ×8 | 772 |

Все значения совпали; [проверка](sw-head-consistency-02-v1-validated/verification.json).

- [Бинарная маска](sw-head-consistency-02-v1-validated/mask.png)
- [Маска RGBA](sw-head-consistency-02-v1-validated/mask-rgba.png)
- [Цветное наложение в исходном разрешении](sw-head-consistency-02-v1-validated/overlay.png)
- [Наложение Nearest Neighbor ×6](sw-head-consistency-02-v1-validated/overlay-preview.png)
- [Метаданные и контрольные суммы](sw-head-consistency-02-v1-validated/metadata.json)
- [Точные числовые карты](sw-head-consistency-02-v1-validated/numeric.json.gz)

Ранний каталог `sw-head-consistency-02-v1` сохранён как диагностический: его проверка компонент не прошла из-за первоначального использования 8-связности. При 8-связности диагональный пиксель присоединяется к основной области. Бинарная маска и арифметические контрольные значения уже тогда совпадали. Итоговый каталог — `sw-head-consistency-02-v1-validated`; геометрия маски ради диагностики не менялась.

## Дополнительные технические проверки

- `single-layer-baseline`: явно выбран `footwear`; режим `single_layer_baseline`.
- `three-layer-technical`: явно выбраны `handwear`, `topwear`, `objects`; режим `experimental_pairwise_products`.
- `thirteen-layer-technical`: все 13 категорий; тот же экспериментальный режим. Максимум P4 равен `233145941606410738876551759360`, что превышает int64; значение сохранено без потерь.

Проверены PNG-маски 0/255, числовая маска, все S1–S4/P1–P4, повторное вычисление порога, контрольные суммы, неизменность исходных цветов вне маски и точное масштабирование Nearest Neighbor. Скилл прошёл `quick_validate.py`; шесть тестов прошли.

Числовой архив — gzip JSON. Значения хитмапов, взвешенных хитмапов и рекурсии записаны десятичными строками произвольной длины; для повторных вычислений их нужно читать как целые, без преобразования во float. Массивы расположены по строкам Y и столбцам X. Цветовые карты нормализованы отдельно для визуализации и не участвуют в вычислениях.

Алгоритм остаётся экспериментальным. Выбор семантически связанных слоёв не автоматизирован. Обобщение через сумму попарных произведений для трёх и более слоёв не подтверждено как анатомический метод. Дополнительные комбинации проверены технически; их анатомическая точность не оценивалась. Морфология, удаление компонент, заполнение отверстий и ручная коррекция отсутствуют.
