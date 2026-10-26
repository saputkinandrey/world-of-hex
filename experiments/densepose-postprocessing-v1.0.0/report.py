"""A-F report from measurements, never infer anatomical truth from coverage."""
from core import ROOT, read, write


def report(config,groups,data,metrics):
    rows = list(metrics)
    index = ['# Visual index v1.0.0','','[Separate anatomy/provenance palettes](legend.png)','','## All poses and directions','',
             '| Pose/direction | Source | Original | Flood | Final | Added | Provenance | Conflicts |','| --- | --- | --- | --- | --- | --- | --- | --- |']
    for key in data:
        index.append('| '+key+' | '+' | '.join(f'[{name}](atlases/{key}/{name}.png)' for name in ['source','original','flood','final','added','provenance','conflicts'])+' |')
    index += ['','## Pose comparisons','']
    poses = list(dict.fromkeys(item['atlas']['pose'] for item in data.values()))
    for pose in poses:
        index += [f'- [{pose}: all six directions](comparisons/by-pose/{pose}.png)',
                  f'- [{pose}: North comparison](cross-view/{pose}/north-comparison.png)',
                  f'- [{pose}: geometry hypotheses](cross-view/{pose}/geometry-comparison.png)']
        for title in ['Head','Torso','Upper-Arms','Lower-Arms','Upper-Legs','Lower-Legs','Hands','Feet']:
            index.append(f'- [{pose}: {title}](comparisons/groups/{title}/{pose}.png)')
    index += ['','## Flood radius pages','']
    for key in data:
        index.append(f'- [{key}: r1/r2/r4](comparisons/flood/{key}.png)')
    (ROOT/'INDEX_v1.0.0.md').write_text('\n'.join(index)+'\n',encoding='utf-8')
    main = [r for r in rows if r['key'].endswith('/frame-000')]
    lines = ['# DensePose Anatomical Postprocessing v1.0.0','',
        '## A. Проверка геометрии','',
        f'Обработано {len(data)} сочетаний позы/направления, {len(rows)} skin-кадров; 8 поз, 6 направлений.',
        f'Совпадение бинарной геометрии всех пяти вариантов: {sum(all(v["binary_silhouette"] for v in d["alpha_validation"]) for d in data.values())} / {len(data)} атласов.',
        f'Точная alpha всех пяти вариантов: {sum(all(v["exact_alpha"] for v in d["alpha_validation"]) for d in data.values())} / {len(data)}.',
        'Для каждого атласа сохранён alpha-validation/<pose>/<direction>/alpha-comparison.json и карты расхождений.',
        'Исключения бинарной геометрии не заполняются автоматически. RGBA каждого skin-кадра сохраняется собственной.', '',
        'densepose-original.npy — неизменная историческая 24-классовая карта именно этого skin-кадра.',
        'densepose-baseline.npy — выбранная карта frame-000 (либо явный override). owners-original.npy',
        'получена из выбранного baseline внутри alpha. Сохранение меток проверяется относительно этой',
        'общей исходной карты владельцев, а не пяти различных исторических предсказаний.',
        'DensePose-пиксели вне alpha сохранены в исторической карте и owners-densepose-unclipped.npy;',
        'они не являются допустимыми владельцами силуэта и не используются как источники заполнения.', '',
        '## B. Flood Fill','',
        'r2 — предварительный основной вариант по заданию, автоматического выбора победителя нет.',
        'Независимые четырёхсвязные волны каждой группы проходят только по исходному U. Равные',
        'минимальные расстояния разных групп остаются неизвестными; порядок обхода не выбирает владельца.', '',
        '| Вариант | Заполнено | Неизвестно | Равных ближайших владельцев |','| --- | ---: | ---: | ---: |',
        f'| Original | 0 | {sum(r["metrics"]["original_unassigned"] for r in rows)} | n/a |']
    alpha_exceptions = [{'key':key,'frames':item['alpha_validation']} for key,item in data.items()
                        if not all(v['exact_alpha'] for v in item['alpha_validation'])]
    insert = lines.index('## B. Flood Fill')
    exception_lines = ['Исключения точной alpha (бинарный силуэт проверяется отдельно):','']
    for exception in alpha_exceptions:
        detail = ', '.join(f'frame-{v["skin"]:03d}: {v["alpha_different_pixels"]} alpha-пикселей; binary={v["binary_silhouette"]}' for v in exception['frames'] if not v['exact_alpha'])
        exception_lines.append(f'- {exception["key"]}: {detail}.')
    lines[insert:insert] = exception_lines+['']
    for radius in config['flood_radii']:
        vals = [r['flood_variants'][str(radius)] for r in rows]
        lines.append(f'| Flood r{radius} | {sum(v["filled"] for v in vals)} | {sum(v["unknown"] for v in vals)} | {sum(v["ambiguous"] for v in vals)} |')
    best = sorted(main,key=lambda r:-r['metrics']['flood_pixels'])[:3]
    worst = sorted(main,key=lambda r:-r['metrics']['unknown_pixels'])[:3]
    lines += ['', 'Большие добавления (не оценка анатомической точности): '+', '.join(r['key'] for r in best)+'.',
              'Наибольшие оставшиеся пробелы: '+', '.join(r['key'] for r in worst)+'.',
              'Площади оставшихся четырёхсвязных пробелов и соседние группы — в flood-fill/**/regions.json.',
              'Полные покадровые и групповые показатели всех радиусов — [metrics.json](metrics.json).', '',
              '## C. Северный ракурс','',
              '| Поза | Original | Flood r2 | Assisted | Перенос | Конфликты гипотез |',
              '| --- | ---: | ---: | ---: | ---: | ---: |']
    for r in main:
        if '/north/' in r['key']:
            m=r['metrics']
            lines.append(f'| {r["key"].split("/")[0]} | {m["original_coverage"]:.2%} | {m["flood_coverage"]:.2%} | {m["assisted_coverage"]:.2%} | {m["cross_view_pixels"]} | {m["cross_view_conflicts"]} |')
    lines += ['', 'Для каждой позы исследованы identity/flip и все целочисленные dx/dy от -2 до +2:',
              '50 гипотез, их Dice/IoU, пересечения, разности, альтернативные карты и групповые соглашения',
              'сохранены в cross-view/<pose>/hypotheses/ и geometry.json. Максимум IoU не выбирает трансформацию.',
              'Перенос требует согласия обеих заданных нулевых гипотез, точного совпадения силуэта',
              'в окрестности 3x3 и наличия только той же северной исходной группы в геодезическом радиусе 4.',
              'Он заполняет только оставшиеся после r2 неизвестные пиксели. Источники — исходные южные',
              'владельцы; сам Flood Fill донора не используется. Это проверяемый консервативный фильтр,',
              'а не доказательство правильного анатомического соответствия двух ракурсов.',
              'Конфликты — объединение несовпадений двух геометрически допустимых нулевых гипотез;',
              'они не означают, что северная классификация обязательно ошибочна. Неоднозначные альтернативы',
              'хранятся отдельными картами гипотез и alternative-owner-bitset.npy. Однозначный консенсус —',
              'cross-view-proposals.npy. Перестановки L/R нет: это собственные анатомические ID DensePose.',
              'Полностью отсутствующая северная детекция не восстанавливается без северных опор.', '',
              '## D. Итоговое покрытие','',
              '| Этап | Размечено пикселей | Покрытие |','| --- | ---: | ---: |']
    total = sum(r['metrics']['alpha_pixels'] for r in rows)
    import numpy as np
    historical = []
    for key,item in data.items():
        for skin,frame in enumerate(item['frames']):
            alpha = frame['rgba'][:,:,3]>0
            n = int(np.count_nonzero((frame['dense']>0)&alpha))
            historical.append({'key':f'{key}/frame-{skin:03d}','historical_own_pixels':n,
                               'historical_own_coverage':n/int(alpha.sum()) if alpha.any() else 0})
    write(ROOT/'historical-comparison.json',{'version':'1.0.0','purpose':'Distinguish skin-baseline reuse from flood/transfer additions','frames':historical})
    historical_count = sum(r['historical_own_pixels'] for r in historical)
    lines.append(f'| Исторические предсказания каждого собственного skin | {historical_count} | {historical_count/total:.2%} |')
    for title,field in [('Original','original_pixels'),('Flood r2',None),('Final',None)]:
        n = sum(r['metrics'][field] if field else r['metrics']['original_pixels']+r['metrics']['flood_pixels']+(r['metrics']['cross_view_pixels'] if title=='Final' else 0) for r in rows)
        lines.append(f'| {title} | {n} | {n/total:.2%} |')
    lines += ['', 'Итоги выше включают 240 сохранённых skin-кадров, в том числе зеркала; независимых',
              'геометрических расчётов 32. Это не 240 независимых нейросетевых оценок качества.', '',
              '[Отдельное сравнение собственных исторических предсказаний skin-вариантов](historical-comparison.json).', '',
              '## E. Открытые проблемы','',
              'Ошибочно размеченные DensePose области остаются фиксированными: заполнение пустот',
              'не исправляет уже неверную голову/торс или границы плеча/предплечья и бедра/голени.',
              'Крупные потери ограничены радиусом, спорные владельцы остаются неизвестными.',
              'Силуэтное совпадение не доказывает совпадение перекрывающихся частей тела.',
              'Исходные предсказания для разных skin-вариантов не голосуют и не выбираются по внешнему виду.',
              'Высокое покрытие не является доказательством качества анатомии или готовности рига.', '',
              '## F. Визуальные результаты','',
              '[Полный индекс всех 48 атласов, 8 таблиц поз и 64 групповых таблиц](INDEX_v1.0.0.md).',
              '[Раздельные палитры анатомии и происхождения, включая L/R](legend.png).',
              '[Idle north](cross-view/idle/north-comparison.png) · [Flinch north](cross-view/flinch/north-comparison.png) · [Longarm north](cross-view/longarm/north-comparison.png).',
              'В атласах отдельно показаны исходный цвет, владельцы, Flood, Final, добавления и provenance.',
              'Жёлтый — Flood, cyan — перенос, розовый — неизвестно; конфликтная карта отдельная красная.',
              'Палитры анатомии и происхождения не смешиваются. Исходные PNG имеют native-размеры,',
              'в таблицах кадры центрируются без ресемплинга и сглаживания.', '',
              '[Автоматические проверки](verification.json) · [Решения](DECISIONS_v1.0.0.md) · [Запуск](README_v1.0.0.md).',
              'Нейросети, UV, вероятности и raw-архивы не запускались и не читались. Исходники не менялись.',
              'Commit/push/merge не выполнялись.']
    (ROOT/'REPORT_v1.0.0.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
