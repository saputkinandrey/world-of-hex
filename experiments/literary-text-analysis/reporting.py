"""Measured observations only; no P/R/F1 without independent human ground truth."""
from collections import Counter
import os
import re
from pathlib import Path

from common import ROOT, SCHEMA, read, rows, write, enforce_private_output


def run_summary(folder):
    manifest, document = read(folder/'run.json'), read(folder/'document.json')
    records = [read(p) for p in sorted((folder/'records').glob('*.json'))]
    calls, raw = [], []
    for path in sorted((folder/'model_outputs'/manifest['model']).glob('*.json')):
        item = read(path)
        raw.append(item)
        calls.extend(item['stages'].values() if 'stages' in item else [item])
    seconds = sum(c['measurement']['seconds'] for c in calls)
    output_tokens = sum(c.get('output_tokens', 0) for c in calls)
    input_tokens = sum(c.get('input_tokens', 0) for c in calls)
    entities = [e for r in records for e in r['normalized'].get('entities', [])]
    mentions = rows(folder/'mentions.jsonl') if (folder/'mentions.jsonl').exists() else []
    evidence = rows(folder/'evidence.jsonl') if (folder/'evidence.jsonl').exists() else []
    rejected = [item for r in records for item in r['normalized'].get('rejected', [])]
    errors = [e for r in records for e in r.get('stage_errors', [])]
    errors.extend(r['error'] for r in records if 'error' in r and not r.get('stage_errors'))
    attempts = len(records) * len(manifest['processing'].get('qwen_stages', ['combined'])) if manifest['model'] == 'qwen' else len(records)
    invalid_json = sum(e['type'] == 'JSONDecodeError' for e in errors)
    model = read(folder/'model.json') if (folder/'model.json').exists() else {}
    metadata = {k: manifest[k] for k in ['schema_version','model','revision','processing','language','source_sha256','range','run_sha256']}
    relative = folder.relative_to(ROOT).as_posix() if folder.is_relative_to(ROOT) else folder.as_posix()
    return {**metadata, 'run_directory': relative, 'source_kind': document['source_kind'],
        'paragraphs_recorded': len(records), 'successful_paragraphs': sum(r['status'] == 'SUCCESS' for r in records),
        'partial_paragraphs': sum(r['status'] == 'PARTIAL' for r in records),
        'failed_paragraphs': sum(r['status'] == 'ERROR' for r in records),
        'pending_paragraphs': manifest['range'][1]-manifest['range'][0]-len(records),
        'context_or_memory_failures': sum(e['type'] in {'ContextOverflow','OutOfMemoryError'} for e in errors),
        'paragraphs_unprocessed_due_context_or_memory': sum(any(e['type'] in {'ContextOverflow','OutOfMemoryError'} for e in [*r.get('stage_errors', []), *([r['error']] if 'error' in r else [])]) for r in records),
        'generation_errors': len(errors),
        'attempted_calls': attempts, 'invalid_json_calls': invalid_json,
        'invalid_json_fraction_of_saved_calls': invalid_json / len(calls) if calls else None,
        'generation_or_schema_error_fraction_of_attempts': len(errors) / attempts if attempts else None,
        'schema_error_calls': sum(e['type'] == 'ValueError' and ('arrays' in e['message'] or 'Expected mentions' in e['message']) for e in errors),
        'output_cap_calls': sum(c.get('hit_output_cap', False) for c in calls),
        'calls_with_saved_output': len(calls), 'processing_seconds': seconds,
        'load_seconds': model.get('load_measurement', {}).get('seconds'),
        'paragraphs_per_minute': len(records) * 60 / seconds if seconds else None,
        'input_tokens_including_overlap_and_context': input_tokens, 'generated_tokens': output_tokens,
        'input_tokens_per_second': input_tokens / seconds if seconds else None,
        'generated_tokens_per_second': output_tokens / seconds if seconds and output_tokens else None,
        'cuda_peak_allocated_bytes': max([c['measurement']['cuda_peak_allocated_bytes'] for c in calls] + [model.get('load_measurement', {}).get('cuda_peak_allocated_bytes',0)]),
        'cuda_peak_reserved_bytes': max([c['measurement']['cuda_peak_reserved_bytes'] for c in calls] + [model.get('load_measurement', {}).get('cuda_peak_reserved_bytes',0)]),
        'rss_peak_bytes': max([c['measurement']['rss_peak_bytes'] for c in calls] + [model.get('load_measurement', {}).get('rss_peak_bytes',0)]),
        'entity_types': dict(Counter(e['type'] for e in entities)),
        'character_mentions': sum(e['type'] == 'CHA' for e in entities) if manifest['model'] == 'fable' else len(mentions),
        'qwen_name_mentions': sum(m['kind'] == 'name' for m in mentions),
        'other_mentions': sum(m['kind'] != 'name' for m in mentions),
        'unresolved_mentions': sum(m['character_id'] in {'unknown','ambiguous'} for m in mentions),
        'behavior_observations': len(evidence), 'behavior_categories': dict(Counter(c for e in evidence for c in e['categories'])),
        'grounding_rejections': len(rejected), 'rejection_examples': rejected[:3],
        'fragments': len(rows(folder/'fragments.jsonl')) if (folder/'fragments.jsonl').exists() else 0,
        'revisions': len(rows(folder/'revision-history.jsonl')) if (folder/'revision-history.jsonl').exists() else 0,
        'evidence_examples': evidence[:2], 'mention_examples': entities[:3] if manifest['model'] == 'fable' else mentions[:3]}


def report(input_folder, output_path):
    folders = sorted(p.parent for p in Path(input_folder).resolve().rglob('run.json') if 'adapter-snapshot' not in p.parts)
    summaries = [run_summary(folder) for folder in folders if (folder/'progress.json').exists()]
    output = Path(output_path)
    if any(s['source_kind'] != 'authored_fixture' for s in summaries):
        enforce_private_output(output, 'local_book')
    output.parent.mkdir(parents=True, exist_ok=True)
    result = {'schema_version': SCHEMA, 'producer': 'saved_result_reporter',
              'model': 'per_run', 'checkpoint_revision': 'per_run', 'processing': 'read_saved_outputs_only',
              'literary_benchmark': 'not_run' if all(s['source_kind'] == 'authored_fixture' for s in summaries) else 'see_per_run_sources',
              'independent_human_gold': False, 'quality_metrics': 'not_measured', 'runs': summaries}
    control_summary = None
    control_path = ROOT/'controls/qwen-ner-en/results.json'
    if control_path.exists():
        control = read(control_path)
        calls = [read(ROOT/'controls/qwen-ner-en'/p['raw_file']) for p in control['paragraphs']]
        control_summary = {'schema_version':SCHEMA,'model':'qwen','checkpoint_revision':control['revision'],
            'processing':control['processing'],'paragraphs':len(control['paragraphs']),
            'mentions':sum(len(p['mentions']) for p in control['paragraphs']),
            'names':sum(m['kind'] == 'name' for p in control['paragraphs'] for m in p['mentions']),
            'errors':sum(p['status'] == 'ERROR' for p in control['paragraphs']),
            'rejected_objects':sum(len(p['rejected']) for p in control['paragraphs']),
            'seconds':sum(c['measurement']['seconds'] for c in calls),
            'load_measurement':read(ROOT/'controls/qwen-ner-en/model.json')['load_measurement'],
            'source_sha256':control['source_sha256'],'quality_metrics':'not_measured'}
        result['stateless_ner_control'] = control_summary
    write(output.with_suffix('.json'), result)
    lines = ['# Literary Text Analyzer v0.1.0', '',
             '## Статус и материал', '',
             '**Литературный benchmark: `not_run`.** Пользователь сообщил, что книги ещё не скачаны.',
             'Проверки выполнены на самостоятельно составленном тексте о Маре, Роване и Ивене:',
             '32 английских абзаца и 32 русских абзаца тех же событий. Это не текст Сапковского.',
             '[Событийное соответствие и контрольные случаи](fixtures/events.json).', '',
             'Исследование качества на рассказе The Lesser Evil не имитируется. Независимого проверенного',
             'человеком эталона нет; Precision/Recall/F1 не измерялись. Разметка моделей имеет статус',
             '`automatic_unverified`; авторский чек-лист не используется как независимый gold.', '',
             '## Фактические запуски', '',
             'Основное сравнение — `final-fable-en`, `final-qwen-en` и `final-qwen-ru`.',
             'Остальные каталоги — отдельные разработки промпта, прерванный проход и технические проверки.',
             'Прерванные результаты сохранены; их нельзя считать дополнительными полными benchmark-прогонами.', '',
             '| Запуск | Модель / язык | Абзацев | Успешно / частично / ошибка | Упоминаний персонажей | Поведенческих наблюдений |',
             '| --- | --- | ---: | --- | ---: | ---: |']
    for s in summaries:
        name = s['run_directory']
        lines.append(f'| [{name}]({name}/run.json) | {s["model"]} / {s["language"]} | {s["paragraphs_recorded"]} | {s["successful_paragraphs"]} / {s["partial_paragraphs"]} / {s["failed_paragraphs"]} | {s["character_mentions"]} | {s["behavior_observations"]} |')
    if control_summary:
        lines += ['', f'Отдельный NER-only контроль: {control_summary["paragraphs"]} абзаца, '
                  f'{control_summary["mentions"]} упоминаний (собственных имён: {control_summary["names"]}), '
                  f'ошибок ответа: {control_summary["errors"]}, отклонённых объектов: {control_summary["rejected_objects"]}. '
                  f'Инференс: {control_summary["seconds"]:.2f} с. Это не оценка точности/полноты.']
    lines += ['', 'Успех обработки означает соблюдение технического протокола, а не правильность интерпретации.',
              'FABLE сохраняет все исходные типы BIO; в таблице считаются CHA, без предположения, что это только собственные имена.',
              'Qwen сохраняет имена отдельно от местоимений и описаний. Близость количества упоминаний',
              'не доказывает равенства полноты или точности. Сравнивать следует одинаковые диапазоны и source SHA.', '',
              'Основной последовательный Qwen использует два предыдущих абзаца и рабочую память, FABLE —',
              'текущий абзац. Поэтому дополнительно выполнен NER-only Qwen контроль на тех же 32 английских',
              'абзацах, каждый независимо, без контекста и памяти. Его ответы и параметры:',
              '[controls/qwen-ner-en/results.json](controls/qwen-ner-en/results.json). Он отделён от coreference',
              'и поведенческого анализа. В сравнительном JSON обе версии Qwen показаны раздельно.', '',
              '## Производительность', '',
              '| Запуск | Загрузка, с | Инференс, с | Абзацев/мин | CUDA peak, GiB | RSS peak, GiB | Невалидный JSON / сохранённых вызовов |',
              '| --- | ---: | ---: | ---: | ---: | ---: | --- |']
    for s in summaries:
        load = f'{s["load_seconds"]:.2f}' if s['load_seconds'] is not None else 'n/a'
        lines.append(f'| {s["run_directory"]} | {load} | {s["processing_seconds"]:.2f} | {(s["paragraphs_per_minute"] or 0):.2f} | {s["cuda_peak_allocated_bytes"]/2**30:.3f} | {s["rss_peak_bytes"]/2**30:.3f} | {s["invalid_json_calls"]} / {s["calls_with_saved_output"]} |')
    lines += ['', 'Время инференса суммирует CUDA-синхронизированные вызовы; загрузка, хеширование файлов и запись',
              'артефактов вынесены за этот показатель. RSS измеряется с шагом 20 мс; CUDA peak включает загрузку.',
              'В JSON отчёта есть токены/с, ошибки схемы/контекста/памяти и незавершённые абзацы.',
              'FABLE считает входные токены вместе с перекрытием; Qwen — вместе с инструкцией и контекстом.', '',
              '## Проверяемые примеры и ошибки', '']
    for s in summaries:
        lines += [f'### {s["run_directory"]}', '',
                  f'Категории поведения: `{s["behavior_categories"]}`. Отклонено объектов из-за схемы/цитаты: {s["grounding_rejections"]}.',
                  f'Неразрешённых упоминаний: {s["unresolved_mentions"]}; ошибок схемы: {s["schema_error_calls"]}; достижения лимита выхода: {s["output_cap_calls"]}.', '']
        lines += [f'Смысловых фрагментов: {s["fragments"]}; предложений уточнения атрибуции: {s["revisions"]}.', '']
        for mention in s['mention_examples'][:2]:
            lines.append(f'- Упоминание `{mention.get("text")}`: `{mention["paragraph_id"]}`, [{mention["start"]}, {mention["end"]}).')
        for evidence in s['evidence_examples']:
            lines.append(f'- Наблюдение: {evidence["summary"]} Категории: {", ".join(evidence["categories"])}; источник `{evidence["assertion_source"]}`, статус `{evidence["assertion_status"]}`. Цитата: «{evidence["evidence"][0]["quote"]}».')
        for rejection in s['rejection_examples']:
            lines.append(f'- Отклонено: `{rejection["kind"]}` — {rejection["error"]}. Оригинал сохранён в ответе модели.')
        lines.append('')
    lines += ['Первый объединённый промпт дал слишком широкий диапазон имени и пропуски поведения;',
              'один из четырёх ответов нарушил схему. Этот запуск сохранён в `runs/smoke-qwen-en/`.',
              'Последующая версия делает два запроса к той же Qwen: упоминания, затем поведение.',
              'Смена промпта и различие конфигураций отражены в run.json; результаты не смешиваются.', '',
              'Последняя версия убирает конкретные имена/действия из примера промпта: в раннем двухэтапном',
              'контроле Qwen копировала готовый пример вместо текущего текста. Все исходные ответы сохранены.', '',
              '## Контракты и ручная проверка', '',
              'TXT: UTF-8, пустая строка отделяет абзацы, одиночный перенос сохраняется внутри абзаца.',
              'FB2: p/v/subtitle/text-author с разделами; EPUB: OPF spine и HTML p/li; заголовки — метаданные раздела.',
              'Для XML/EPUB исходное положение задаётся путём элемента/членом архива и номером блока.',
              'Все текстовые диапазоны — Unicode code points внутри абзаца, конец не включён.', '',
              'TXT использует нормализацию переводов строк при чтении. В `source-positions.json` полных',
              'запусков записано точное отображение абзацных границ в исходные Unicode/UTF-8 позиции,',
              'включая CRLF и BOM; эти позиции не подменяются индексами нормализованной строки.', '',
              'FABLE ограничена 512 токенами; длинный абзац обрабатывается окнами с перекрытием, без потери',
              'исходных позиций. У Qwen вход не обрезается: переполнение сохраняется как явная ошибка.',
              'Контекст предыдущих абзацев и реестр ограничены; техническое окно не становится смысловым фрагментом.',
              'Смысловые объединения выполняются только по явным ссылкам модели между соседними абзацами.',
              'Уточнения attribution остаются предложениями модели с журналом before/after; оригиналы не меняются.', '',
              'В `review/packet.json` каждого полного запуска находятся редактируемые задания. Можно исправить',
              'персонажей, упоминания, говорящих, границы фрагментов и поведенческие наблюдения. Импорт требует',
              'имени рецензента, `reviewed=true` и проверяет цитаты; история хранится отдельно в review/history/.',
              'Исправления из заполненного моделью пакета не объявляются независимым blind gold.', '',
              '## Воспроизводимость и ограничения', '',
              'FABLE: SaladTechnologies/fable-base @ 45aceef3d49fe75bd8240010cbfdc983724ec420.',
              'Qwen: Qwen/Qwen3-1.7B @ 70d244cc86ccca08cf5af4e1e306ecf908b1ad5e.',
              'FABLE загружена через AutoModelForTokenClassification с оригинальной 15-классовой головой,',
              'без missing/mismatched/unexpected keys. Qwen использует AutoModelForCausalLM и штатный chat template,',
              'enable_thinking=False, greedy generation, CUDA bfloat16; FABLE CUDA float32. Обучения нет.',
              'Оригинальные checkpoint-файлы и старые окружения используются только для чтения.',
              'Версии, SHA256, исходники адаптера, конфигурация и параметры каждого запуска сохранены рядом с результатом.', '',
              '[Сравнение именных упоминаний на одинаковом английском тексте](review/ner-comparison.json) ·',
              '[Соответствующие события EN/RU](review/bilingual-events.json) ·',
              '[Предварительная проверка конкретных примеров](review/PRELIMINARY.md) ·',
              '[Проверки длинного входа, контекста и resume](acceptance.json) ·',
              '[Сохранность прошлых экспериментов](provenance/protected-after.json).', '',
              '[FABLE model card](https://huggingface.co/SaladTechnologies/fable-base) ·',
              '[Qwen model card и chat template](https://huggingface.co/Qwen/Qwen3-1.7B) ·',
              '[Transformers tokenizer offsets/overflow](https://huggingface.co/docs/transformers/main/en/main_classes/tokenizer).', '',
              'Проверка точной цитаты подтверждает наличие текста, но не правильность приписывания, категории,',
              'отрицания или пересказа. Маленькая Qwen может давать неверные выводы даже в валидном JSON.',
              'FABLE не оценивается как проигравшая в coreference/поведении: у неё нет соответствующей головы.',
              'ruELECTRA в этом этапе не используется, русский FABLE benchmark не запускается.', '',
              'Рекомендация: сначала проверить экспорт на небольшом литературном участке вручную. Решение о',
              'массовом применении Qwen или обучении специализированного классификатора сейчас преждевременно.',
              'Текущий прототип позволяет собрать и проверить материал для такого решения, не превращая',
              'его в пары «ситуация → правильное действие». Commit/push/merge не выполнялись.', '']
    def local_link(match):
        target = match.group(1)
        if '://' in target:
            return match.group(0)
        path = Path(target)
        if not path.is_absolute():
            path = ROOT/path
        try:
            relative = Path(os.path.relpath(path, output.resolve().parent)).as_posix()
        except ValueError:
            relative = path.as_posix()
        return '](' + ('<' + relative + '>' if ' ' in relative else relative) + ')'
    output.write_text(re.sub(r'\]\(([^)]+)\)', local_link, '\n'.join(lines)), encoding='utf-8')
    print(f'Reported {len(summaries)} separate runs: {output}')
