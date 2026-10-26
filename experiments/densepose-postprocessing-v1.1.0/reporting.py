"""Versioned report with historical comparison and exact reachability limits."""
from collections import Counter
from io_support import ROOT,write


def report(data,metrics):
    area=sum(r['metrics']['alpha_pixels'] for r in metrics)
    original=sum(r['metrics']['original_pixels'] for r in metrics)
    r2=sum(r['metrics']['historical_r2_pixels'] for r in metrics)
    total=sum(r['metrics']['total_owned'] for r in metrics)
    filled=sum(r['metrics']['filled_pixels'] for r in metrics)
    ties=sum(r['metrics']['tiebreak_pixels'] for r in metrics)
    unknown=sum(r['metrics']['unknown_pixels'] for r in metrics)
    histogram=Counter()
    for row in metrics:
        histogram.update({int(k):v for k,v in row['metrics']['distance_histogram'].items()})
    max_distance=max(histogram,default=0)
    mean=sum(d*n for d,n in histogram.items())/filled if filled else 0
    unique=[r for r in metrics if r['key'].endswith('/frame-000')]
    index=['# Visual index v1.1.0','','## Full native atlases','',
           '| Pose/direction | Source | Original | Historical r2 | Convergence | Added | Clockwise ties | Unknown |',
           '| --- | --- | --- | --- | --- | --- | --- | --- |']
    for key in data:
        index.append('| '+key+' | '+' | '.join(f'[{name}](atlases/{key}/{name}.png)' for name in ['source','original','historical-r2','convergence','added','clockwise-ties','unknown'])+' |')
    index += ['','## All-direction pose pages','']
    for pose in dict.fromkeys(d['atlas']['pose'] for d in data.values()):
        index.append(f'- [{pose}](comparisons/by-pose/{pose}.png)')
    index += ['','## Per-atlas comparison pages','']
    for key in data:
        index.append(f'- [{key}](comparisons/by-atlas/{key}.png)')
    (ROOT/'INDEX_v1.1.0.md').write_text('\n'.join(index)+'\n',encoding='utf-8')
    lines=['# DensePose Postprocessing v1.1.0','',
        '## Выполнено','',
        'Обработаны 8 поз, 6 направлений, 5 skin-вариантов: 240 итоговых кадров.',
        '32 независимые геометрии рассчитаны BFS; 16 восточных геометрий получены отражением готовых карт.',
        'Нейросети и cross-view transfer не применялись. Исторический r2 прочитан из v1.0.0, без пересчёта.', '',
        '## Покрытие','',
        '| Этап | Размечено пикселей | Покрытие |','| --- | ---: | ---: |',
        f'| Original shared DensePose baseline | {original} | {original/area:.4%} |',
        f'| Historical Flood r2 v1.0.0 | {r2} | {r2/area:.4%} |',
        f'| Convergence v1.1.0 | {total} | {total/area:.4%} |','',
        f'Новых назначений: **{filled}**; пикселей с конфликтом, разрешённым N/E/S/W: **{ties}**;',
        f'оставшихся неизвестных: **{unknown}**. Итоги считают все 240 файловых результатов, включая',
        'повторное использование между skin-цветами и зеркальные направления; это не независимые инференсы.', '',
        '## Расстояния и сходимость','',
        f'Максимальная глубина BFS: **{max_distance}**; среднее расстояние новых назначений: **{mean:.4f}**.',
        'Среднее считается только по новым Flood-пикселям, без исходных источников расстояния 0.',
        'В flood-distance.npy: 0 — исходная метка, положительное значение — расстояние новой метки,',
        '-1 — фон или недостижимый пиксель (их различает alpha/unknown-mask).',
        'Число назначений каждой волны и terminal_delta=0 сохранены в metadata.json. Радиуса и',
        'предустановленного лимита итераций нет: BFS исчерпывает все достижимые вершины силуэта.', '',
        '| Расстояние | Новых пикселей |','| ---: | ---: |']
    lines += [f'| {d} | {n} |' for d,n in sorted(histogram.items())]
    lines += ['','## По позам и направлениям (одна копия общей skin-геометрии)','',
              '| Поза/направление | Original | r2 | Convergence | Tie-break | Unknown | Max distance |',
              '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for row in unique:
        m=row['metrics']
        lines.append(f'| {row["key"].rsplit("/",1)[0]} | {m["original_pixels"]} | {m["historical_r2_pixels"]} | {m["total_owned"]} | {m["tiebreak_pixels"]} | {m["unknown_pixels"]} | {m["max_distance"]} |')
    lines += ['','## Недостижимые области','']
    missing=[r for r in unique if r['metrics']['unknown_pixels']]
    if not missing:
        lines.append('Полное покрытие достигнуто во всех 48 сочетаниях позы/направления: каждый компонент alpha имел исходную опору.')
    else:
        for row in missing:
            key=row['key'].rsplit('/',1)[0]
            lines.append(f'- [{key}](geometry/{key}/unreachable-regions.json): {row["metrics"]["unknown_pixels"]} пикселей. Компонент alpha без четырёхсвязного пути к исходной метке; координаты, площадь и отдельные маски сохранены.')
    lines += ['','Никаких переходов через фон или диагонали, выбора ближайшей внешней метки либо',
              'произвольной классификации недостижимых компонентов не выполнялось.', '',
              '## Приоритет и сохранение данных','',
              'Для каждого пикселя рассматриваются только соседи расстояния d-1. Сначала определяется',
              'вся волна, затем она фиксируется целиком. Разные владельцы выбираются по N/E/S/W;',
              'несколько путей одного владельца не считаются конфликтом. Номер группы не участвует в выборе.',
              'Tie-break mask отмечает именно такие локальные конфликты предыдущих фронтов, а не все',
              'возможные равные пути до исторических seed, чьи метки могли уже слиться в предыдущих волнах.',
              'NONE=0, N=1, E=2, S=3, W=4. При отражении E/W меняются местами; N/S/NONE сохраняются.',
              'Восточные ракурсы не обрабатываются BFS повторно: отражение и новый clockwise-проход',
              'в общем случае дают разные результаты. Анатомические ID L/R не переставляются.', '',
              'Исходный O — выбранный общий DensePose baseline внутри alpha, как в v1.0.0.',
              'Предсказания за alpha остаются в исторических 24-классовых файлах без изменений, но не',
              'выступают источниками. Свою RGBA-текстуру сохраняет каждый skin-вариант; большие массивы',
              'и checkpoint не копируются. Недостижимые компоненты хранятся один раз на геометрию.', '',
              'Известная ошибка головы/туловища north сохранена: исходные владельцы фиксированы.',
              'Полное покрытие достижимой области не доказывает правильности анатомии или риггинга;',
              'дальние назначения и эвристическое разрешение равных фронтов требуют отдельного анализа.', '',
              '## Визуальные результаты и проверки','',
              '[Полный индекс 48 атласов и всех сравнительных страниц](INDEX_v1.1.0.md) ·',
              '[Численные показатели](metrics.json) · [Проверки](verification.json) · [Запуск](README_v1.1.0.md).',
              'Сравнение: Source / Original / historical r2 / convergence / Added / Clockwise ties / Unknown.',
              'Анатомические цвета прежние; жёлтый — добавлено, cyan — tie-break, розовый — недостижимо.',
              'Изображения native, без сглаживания и ресемплинга численных карт. Commit/push/merge не выполнялись.']
    (ROOT/'REPORT_v1.1.0.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    write(ROOT/'summary.json',{'version':'1.1.0','frames':len(metrics),'alpha_pixels':area,
        'original_pixels':original,'historical_r2_pixels':r2,'convergence_pixels':total,'new_pixels':filled,
        'clockwise_tiebreak_pixels':ties,'unknown_pixels':unknown,'max_distance':max_distance,
        'mean_distance_new_pixels':mean,'distance_histogram':dict(sorted(histogram.items())),
        'missing_geometry_cases':[r['key'].rsplit('/',1)[0] for r in missing],
        'cross_view_transfer':False,'neural_inference':False})
