"""Build the requested A-E report from saved observations, without pixel judgments."""
from collections import Counter

from core import ROOT, read, write, GROUPS


def report():
    summary = read(ROOT/'summary.json')
    inventory = read(ROOT/'source-inventory.json')
    control = read(ROOT/'preprocess-comparison/preflight.json')
    warnings = read(ROOT/'diagnostic-warnings.json')['warnings']
    counts = inventory['counts']
    lines = ['# DensePose Full Character Benchmark v1.0.0','',
             '## A. Полнота обработки','',
             '| Показатель | Количество |','| --- | ---: |',
             f"| Поз | {counts['poses']} |",f"| Направлений | {counts['directions']} (4 исходных, 2 зеркальных) |",
             f"| Исходных атласов | {counts['source_atlases']} |",f"| Исходных кадров / уникальных RGBA | {counts['source_frames']} / {counts['unique_rgba_images']} |",
             f"| Ожидаемых самостоятельных инференсов | {counts['expected_inferences']} |",
             f"| Успешных самостоятельных инференсов основного прогона | {summary['successful_inferences']} |",
             f"| Ошибок итоговых кадров | {summary['failed_frames']} |",f"| Успешных зеркальных результатов | {summary['successful_mirrored_results']} |",
             f"| Итоговых успешных кадров | {summary['successful_final_frames']} / {counts['expected_final_frames']} |",f"| Ожидают обработки | {summary['pending_frames']} |",'',
             'Инвентаризация основана на body-слоях сохранённого каталога и исходнике компоновщика,',
             'а затем сверена с PNG-файлами. Пропущенных/лишних body-атласов не обнаружено.',
             'Источник: [source-inventory.json](source-inventory.json).', '',
             '**Пять кадров каждого body-атласа — оттенки кожи, а не временные кадры:**',
             '`_pose_layer_spec` устанавливает `frame_index=int(skin_color)`. Все варианты обработаны',
             'отдельно. Отсутствующие позы не генерировались; SE/NE происходят из штатного зеркального',
             'fallback компоновщика SW/NW. Зеркалируется каждый кадр, порядок кадров атласа не обращается.', '',
             '## B. Препроцессинг','',
             '[Сравнительная таблица A/B](preprocess-comparison/comparison.png) · [Полные показатели](preprocess-comparison/metrics.json)', '',
             '| Направление | Метод | Детекций | Score выбранной | Покрытие alpha | Вне alpha | Не размечено внутри alpha |',
             '| --- | --- | ---: | ---: | ---: | ---: | ---: |']
    for case in control['controls']:
        meta = read(ROOT/case['metadata'])
        detection,d = meta['detections'],meta['diagnostics']
        score = detection['selected_score']
        lines.append(f"| {case['direction']} | {case['method']} | {detection['count']} | {score:.6f} | {d['coverage']:.2%} | {d['predicted_pixels_outside_alpha']} | {d['unassigned_visible_pixels']} |" if score is not None else
                     f"| {case['direction']} | {case['method']} | 0 | N/A | {d['coverage']:.2%} | {d['predicted_pixels_outside_alpha']} | {d['unassigned_visible_pixels']} |")
    lines += ['', '**Основной метод — существующий Bicubic 512×512.** Покрытие выше во всех четырёх',
              'контролях, confidence прямого входа выше только в двух. Без независимой проверки суставных',
              'границ нет однозначного преимущества прямого входа. Применено заданное правило сохранения baseline,',
              'а не автоматический подбор параметров. Число компонент каждой группы сохранено в metrics.json;',
              'связность и внешний вид границ доступны для визуального исследования, не выдаются за эталонную точность.', '',
              'A точно сохраняет прежний canvas: S/N 110×110 центрируются в 150×150 со сдвигом (20,20),',
              'SW/NW уже 150×150. B использует собственный размер кадра без такого padding. Поэтому S/N',
              'сравнивают также влияние canvas, а SW/NW изолируют предварительное увеличение.',
              'Модельные resize 800/1333, detection threshold 0.05 и веса неизменны.', '',
              'SW baseline воспроизведён побитово: входные пиксели, scores, boxes, карта I и UV совпали.',
              'Официальный `apply_net.py dump` на том же входе дал идентичные scores, boxes и I/UV каждой детекции.',
              '[Проверки до массового прогона](preprocess-comparison/preflight.json) · [Лог apply_net](preprocess-comparison/apply-net/official.log).','',
              '## C. Анатомическая сегментация','',
              '| Поза | Кадров с результатом | С детекцией | Среднее покрытие | Среднее число внешних пикселей |',
              '| --- | ---: | ---: | ---: | ---: |']
    for name,row in summary['by_pose'].items():
        coverage = 'N/A' if row['mean_coverage'] is None else f"{row['mean_coverage']:.2%}"
        outside = 'N/A' if row['mean_outside_pixels'] is None else f"{row['mean_outside_pixels']:.1f}"
        lines.append(f"| {name} | {row['frames']} | {row['frames_with_detection']} | {coverage} | {outside} |")
    lines += ['', '| Направление | Кадров с результатом | С детекцией | Среднее покрытие |','| --- | ---: | ---: | ---: |']
    for name,row in summary['by_direction'].items():
        coverage = 'N/A' if row['mean_coverage'] is None else f"{row['mean_coverage']:.2%}"
        lines.append(f"| {name} | {row['frames']} | {row['frames_with_detection']} | {coverage} |")
    kinds = Counter(w['type'] for w in warnings)
    lines += ['', f"Диагностических предупреждений: **{len(warnings)}**. Это не число ошибочных кадров.",
              '[Все предупреждения](diagnostic-warnings.json) · [Покадровая сводка](summary.json) · [Пустые группы и подозрительные кадры](suspicious-frames.json) · [Компоненты всех 24 поверхностей](surface-components.json).','',
              '| Тип предупреждения | Количество |','| --- | ---: |']
    lines += [f'| {name} | {count} |' for name,count in kinds.items()]
    lines += ['', 'Сохранены площади всех 24 поверхностей и 14 групп, 4-связные компоненты, пустые группы,',
              'неразмеченные видимые пиксели и внешние пиксели. Пустая группа сама по себе не считается ошибкой:',
              'часть тела может быть скрыта. Сравнения соседних кадров относятся к skin-вариантам; временной',
              'оценки анимации в этих атласах нет. Возможный обмен L/R, исчезновение предплечья или перенос',
              'головы в torso отмечаются только как предупреждения. Пиксели по этим признакам не исправлялись.', '',
              'Native IDs сохранены до группировки. Альфа-ограничение — отдельная диагностика,',
              'не исправление внутренних границ. Никакого сглаживания, морфологии, переноса пикселей',
              'по скелету или ручной разметке не выполнялось. LLM не использовалась для автоматической',
              'оценки качества отдельных пикселей. Данные предназначены для последующего исследования.', '',
              '## D. Результаты для просмотра','',
              '[Полный индекс атласов и таблиц](INDEX.md) · [Палитра и группы](labels.json)','',
              'Примеры полноразмерных результатов:', '',
              '- [Idle SW: исходный атлас](atlases/idle/south-west/source.png)',
              '- [Idle SW: анатомический атлас](atlases/idle/south-west/segmentation.png)',
              '- [Idle SW: наложение](atlases/idle/south-west/overlay.png)',
              '- [Idle SW: ограничение по alpha](atlases/idle/south-west/segmentation-alpha.png)',
              '- [Все направления idle, все пять кадров](comparisons/by-pose/idle.png)',
              '- [Все позы SW, все пять кадров](comparisons/by-direction/south-west.png)',
              '- [Только группы рук idle](comparisons/by-part/Arm/idle.png)',
              '- [Только группы ног idle](comparisons/by-part/Leg/idle.png)',
              '- [Численная карта первого SW](results/idle/south-west/frame-000/class-map.npy)',
              '- [Пример маски Left Upper Arm](results/idle/south-west/frame-000/masks/Left_Upper_Arm.png)', '',
              'Все выходные атласы имеют исходные размеры и порядок пяти кадров. Отдельные кадры',
              'возвращены к собственным 110×110 или 150×150. Точные матрицы/индексы преобразований,',
              'включая сдвиг canvas и bbox, записаны в metadata.json. I и UV выбираются одним и тем же',
              'Nearest Neighbor sample; UV не смешиваются между поверхностями. Исходные ROI и тензоры всех',
              'детекций доступны в raw/ без повторного инференса. Зеркальные папки ссылаются на raw исходного направления.', '',
              '## E. Воспроизводимость','',
              'DensePose R50-FPN-s1x, `model_final_162be9.pkl`.',
              'SHA256: `b8a7382001b16e453bad95ca9dbc68ae8f2b839b304cf90eaf5c27fbdb4dae91`.',
              'Исходник Detectron2/DensePose: `b0fe2f0a5bb6496f65246ef35687a386a9f19202`.',
              'Использовано существующее WSL2 CPU-окружение; повторных установок и скачиваний весов не было.',
              'PyTorch 2.8.0+cpu, torchvision 0.23.0+cpu, Detectron2 / DensePose 0.6, Python 3.12.9.',
              'Полная конфигурация, версии, SHA256 исходников/адаптера: [model.json](model.json).',
              'Официальные документы GETTING_STARTED, DENSEPOSE_IUV и TOOL_APPLY_NET сохранены в provenance/.', '',
              'Зеркалирование отражает координаты, I/coarse/UV и bbox; native IDs и значения intrinsic UV сохраняются.',
              'Это переиспользованные предсказания, а не самостоятельная проверка модели на восточном направлении.',
              'Никакая перестановка анатомических меток L/R или преобразование U=1-U не применялись.', '',
              'После каждого кадра записан финальный статус и checksum артефактов. Возобновление проверяет',
              'контракт и сохранность выходов; успешные кадры не перезаписываются. Веса, окружения и большие',
              'численные архивы исключены из Git; PNG, компактные карты и метаданные доступны для добавления.',
              'Проверки: [verification.json](verification.json), [resume-check.json](resume-check.json),',
              '[проверка отсутствия перезаписи при resume](resume-verification.json).',
              'Исходные спрайты, компоновщик, каталог, скиллы, существующий benchmark и workbench защищены',
              'контрольными суммами. Commit/push/merge не выполнялись.']
    (ROOT/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    suspicious = [{'key':r['key'],'empty_groups':[name for name,g in r['diagnostics']['groups'].items() if g['empty']],
                   'warnings':[w for w in warnings if w['key']==r['key']]} for r in summary['frames'] if r['diagnostics'] and
                  (any(g['empty'] for g in r['diagnostics']['groups'].values()) or any(w['key']==r['key'] for w in warnings))]
    write(ROOT/'suspicious-frames.json',{'empty_is_not_automatically_wrong':True,'frames':suspicious})
    index = ['# Inspection index','','## Atlases','', '| Pose | Direction | Source | Segmentation | Overlay | Alpha |','| --- | --- | --- | --- | --- | --- |']
    for atlas in inventory['atlases']:
        prefix=f"atlases/{atlas['pose']}/{atlas['direction']}/"
        index.append(f"| {atlas['pose']} | {atlas['direction']} | [PNG]({prefix}source.png) | [PNG]({prefix}segmentation.png) | [PNG]({prefix}overlay.png) | [PNG]({prefix}segmentation-alpha.png) |")
    index += ['', '## Pose pages','']+[f"- [{pose}](comparisons/by-pose/{pose}.png): [arms](comparisons/by-part/Arm/{pose}.png), [legs](comparisons/by-part/Leg/{pose}.png)" for pose in inventory['labels']['poses']]
    index += ['', '## Direction pages','']+[f"- [{direction}](comparisons/by-direction/{direction}.png)" for direction in inventory['labels']['directions']]
    (ROOT/'INDEX.md').write_text('\n'.join(index)+'\n',encoding='utf-8')
