# NVIDIA MotionBricks — технический эксперимент

Дата: 2026-10-27. Вердикт: **SUCCESS**.

На доступной RTX 3060 Laptop 6 GB штатный TensorRT runtime MotionBricks генерирует последовательную человеческую SOMA-анимацию. Получены настоящие анимационные массивы, непрерывное движение с поворотом, Inbetweener и взаимодействие с препятствием в SOMA gym. Это проверка работоспособности, не оценка интеграции или универсального качества движений.

## A. Окружение

- Windows 11 Pro 25H2, x64, build 26200.9711.
- NVIDIA GeForce RTX 3060 Laptop, 6144 MiB VRAM, compute capability 8.6, драйвер 596.49.
- `nvidia-smi` доступен. Показанные им CUDA 13.2 — возможности драйвера; Warp использовал Toolkit/NVRTC 12.9, локальный CUDA Runtime пакет — 12.9.79. Системный Toolkit/драйвер не устанавливались и не менялись.
- Локальный Python 3.12.16; uv 0.13.6; Git 2.45.1.windows.1; Git LFS 3.5.1.
- MotionBricks **0.2.0**, официальный самостоятельный [NVlabs/motionbricks](https://github.com/NVlabs/motionbricks), точный commit **54fc563aeaaf819a753d72cc9fdc6713989cdd43**.
- TensorRT **10.8.0.43** (`tensorrt-cu12`, bindings, libs); Warp **1.17.0**; Newton **1.6.0**; NumPy 2.4.3; USD 26.3. Полные версии: [environment.json](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/environment.json).
- До загрузок было свободно приблизительно 60.8 GB на C и 1117.2 GB на D. Первоначальный рабочий эксперимент находился в `D:/motionbricks-experiment`. После переноса отчёт, видео и скрипты находятся в `experiments/motionbricks-v0.2.0/` репозитория, локальный runtime — в `C:/Users/Public/motionbricks-runtime`, веса и планы — в `D:/motionbricks-models`.

Совместимость SM 8.6 с установленным TensorRT подтверждена фактическим построением и исполнением FP32/FP16 plans. GPU доступен процессам агента; ограничений, делающих CUDA недоступной, не обнаружено.

## B. Установка и исправления

Репозиторий клонирован официальным Git; зависимости установлены `uv sync --locked` по его `uv.lock`, без изменения зависимостей. Через `git lfs pull` загружены только SOMA-модели, человеческий USD и SOMA-клипы. G1-модели и Hugging Face SafeTensors не загружались.

| Файл | Реальный размер | Проверка |
| --- | ---: | --- |
| mmm_v6_soma_fp32.onnx | 757864273 bytes | SHA256 совпадает с LFS object ID |
| mmm_v6_soma_fp16.onnx | 380327058 bytes | SHA256 совпадает с LFS object ID |
| soma_n1.json | 2168 bytes | JSON manifest |

Это бинарные модели, не LFS pointers. [Полные контрольные суммы](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/model-checksums.json).

Обнаружены и устранены две проблемы:

1. `git clone` вернул ошибку защиты активного LFS post-checkout hook. Checkout фактически был полным и чистым. Hook проверен как стандартный Git LFS; защита Git не отключалась. Отдельный `git lfs pull` завершился успешно.
2. Первый официальный запуск из `C:/Users/Андрей/Desktop/motionbricks-experiment` остановился в Warp/NVRTC: `cannot open source file "builtin.h"`. Заголовок существовал. Повторная установка тех же версий в ASCII-путь D устранила ошибку без изменений библиотек. Исходная ошибка сохранена в [once.log](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/logs/once.log), успешный повтор — [once-ascii.log](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/logs/once-ascii.log). Проверены официальные инструкции и известные issues; точный внутренний механизм Unicode/NVRTC не переписывался.

При первоначальной проверке первая папка C сохранялась как диагностика и источник uv-cache/управляемого Python, а рабочее окружение размещалось на D вне World of Hex. При последующем переносе по запросу пользователя uv-cache и Python были перенесены/скопированы в локальный ASCII-runtime `C:/Users/Public/motionbricks-runtime`; на D остались ONNX, TensorRT-plans и Git LFS object cache весов. Глобальные Python-пакеты, PATH, драйверы и WSL не менялись. Исходники checkout MotionBricks не патчились; `git status --porcelain` в нём пуст. Первоначальный эксперимент не менял основной проект; последующий перенос добавил только изолированный каталог `experiments/motionbricks-v0.2.0/`. Commit/push не выполнялись.

## C. Результаты

| Проверка | Статус | Комментарий |
| --- | --- | --- |
| Загрузка модели SOMA | PASS | Подлинные FP32/FP16 ONNX проверены, модель загружена runtime |
| Инициализация TensorRT | PASS | Plans построены на SM 8.6; повторная загрузка из кэша подтверждена |
| Первая генерация | PASS | Неизменённый `generate_once.py`: 26 кадров, затем 50 с предыдущими кадрами в контексте |
| Последовательные генерации | PASS | Корректные массивы, конечные значения и стык фрагментов |
| Непрерывное движение | PASS | Неизменённый `locomotion_loop.py`: 14 генераций, 9 s, поворот +X → +Y |
| Inbetweener | PASS | Официальный CLI/GUI запущен; записан реально сгенерированный переход на 2 m |
| Scene Preview | PASS | Официальный CLI/GUI с неизменённым soma_gym; записан полный SmallJumpSP |
| Производительность | PASS | Прогретые FP32 и mixed FP16, CUDA stage timers, кэш и VRAM |

Модель предсказывает 30 основных SOMA-joints. В комплектном USD-скелете 77 joints, поэтому публичные выходы engine имеют форму `[frames,77,7]`: локальные XYZ и кватернион XYZW, с мировым размещением корня. Непредсказываемые дополнительные суставы не следует считать независимо сгенерированным движением пальцев.

- Сохранены фрагменты `[26,77,7]`, `[50,77,7]` при 30 Hz: 0.87 и 1.67 s по принятому в официальном примере расчёту N/FPS.
- Непрерывный пример сохранён как `[540,77,7]` при **60 Hz playback** за 9 s. Частота самой модели остаётся **30 Hz**.
- NaN/Infinity не обнаружены. Максимальная ошибка нормы кватерниона: 2.38e-7.
- Стык двух генераций: максимальная разность локальных переносов 2.98e-8 m, сырых компонентов pose 1.79e-7. Кватернионы сравнивались с учётом эквивалентности q и -q.
- Максимальный шаг корня в locomotion: 0.0378 m на отсчёт 1/60 s. Конец пути приблизительно `(5.765,11.824,1.030)` m; очевидного телепорта на стыках не наблюдалось.

Данные: [soma-generations.npz](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/soma-generations.npz), [animation-validation.json](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/animation-validation.json), [иерархия SOMA](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/soma-skeleton-layout.json), [проверка сохранённых массивов](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/final-array-audit.json).

### Визуальное подтверждение

- [Inbetweener: MP4, 4 s](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/inbetweener/demo.mp4), 960x640, 30 FPS. Генерация дала 50 кадров движения; видео включает воспроизведение и конечное состояние.
- [SOMA gym: MP4, 14 s](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/scene-preview/demo.mp4), 960x640, 30 FPS. `SmallJumpSP` начался на 3.97 s и завершился на 5.73 s; максимальная высота корня — 1.383 m.

Оба официальных GUI отдельно запущены штатными CLI-командами и осмотрены. Для воспроизводимой видеозаписи отдельный тестовый скрипт использовал реальные классы `InbetweenerDemo`/`ScenePreview` и `Newton ViewerGL.get_frame()`. В сцене движение задавалось `LocomotionCommand`, а проверка пересечения, автоматический dispatch и interaction state machine оставались официальными. Это скриптовый тест управления, а не утверждение о ручном прохождении WASD. Кадры получены GL-рендерером, без сторонней имитации скелета.

В осмотренных эпизодах не было очевидного разрушения скелета. Контакты стоп, самопересечения и физическая корректность не оценивались отдельным benchmark; успешный запуск не гарантирует качество всех действий.

## D. Производительность

Один фиксированный SOMA-запрос, batch=1, 3 warm-up + 10 измерений; по 26 действительных кадров, около 0.87 s анимации на запрос. FP32 использует официальные настройки SOMA с разрешённым TF32. Mixed FP16 включён штатным `TensorRTBuildOptions(enable_fp16=True)`.

| Замер | FP32 | Mixed FP16 |
| --- | ---: | ---: |
| Медиана полного generate_animation + synchronize | 5.848 ms | 3.368 ms |
| Медиана только inference, CUDA events | 4.986 ms | 2.460 ms |
| Повторный конструктор engine из кэша | 1.44–1.83 s | 1.17 s |
| Отдельно измеренная фаза TensorRT build | 80.15 s | 215.60 s |
| Конструктор с этим новым plan | 102.36 s | 241.75 s |
| VRAM всего GPU после прогрева | 1226 MiB | 977 MiB |

Первый полный официальный FP32-процесс занял **227.74 s**, включая imports, первые Warp-компиляции, построение plan и две генерации. Дополнительный FP32 build измерен через штатный progress monitor в отдельном пустом TensorRT-кэше, но с уже прогретыми OS/CUDA-кэшами; он не заменяет число первого запуска. Канонический plan и первоначальный benchmark при этом не перезаписывались. Указанные cold-конструкторы включают подготовку ONNX и runtime, а фаза build — отдельный интервал progress monitor.

FP16 ускорил inference примерно **2.03x**, полную генерацию — **1.74x**. На одинаковом запросе максимальное различие траектории корня между FP32/FP16 — около **4 mm**; выходы конечны, число кадров одинаково. Это сравнение одного запроса, не доказательство универсальной эквивалентности точности.

VRAM измерялась `nvidia-smi` для всего GPU в WDDM, с интервалом 0.5 s; это не точный per-process пик. Во время первого FP32 build зафиксировано до 1701 MiB, FP16 — до 1370 MiB. До запуска GPU занимал около 400–530 MiB другими компонентами рабочего стола. Короткие пики между отсчётами могли быть пропущены. Эти числа нельзя складывать с полным объёмом модели как независимые расходы.

Логи и числа: [benchmark-fp32.json](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/benchmark-fp32.json), [benchmark-fp16.json](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/benchmark-fp16.json), [fp32-cold-build.json](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/fp32-cold-build.json), [warm-loads.json](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/warm-loads.json), [summary.json](C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/results/summary.json), `logs/*-gpu.csv`.

## E. Воспроизведение

Из PowerShell на этом компьютере:

```powershell
& 'C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/run.ps1' once
& 'C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/run.ps1' loop
& 'C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/run.ps1' verify
& 'C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/run.ps1' benchmark
& 'C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/run.ps1' fp16
& 'C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/run.ps1' inbetweener
& 'C:/Users/Андрей/Desktop/world-of-hex/experiments/motionbricks-v0.2.0/run.ps1' scene
```

Первые две команды исполняют `uv run --locked python docs/examples/generate_once.py` и `uv run --locked python docs/examples/locomotion_loop.py`. GUI-команды запускают `python -m app.inbetweener_demo` и `python -m app.scene_preview --scene assets/scenes/soma_gym.scene.json`. SOMA является моделью по умолчанию. Используется `.venv` локального ASCII-runtime на C, без активации глобального окружения. Пути задаются в `config.json`; локальные переопределения можно записать в игнорируемый `config.local.json`.

`visual-inbetweener` и `visual-scene` повторяют GL-запись тестовых эпизодов. `probe.py`, `render_probe.py`, `warm_loads.py`, `cold_plan.py`, `audit_outputs.py`, все JSON, NPZ, PNG и логи сохранены в экспериментальной папке. Новые запуски сохраняют данные в отдельные игнорируемые `runs/<timestamp>-<action>/` и не перезаписывают приведённые выше замеры. `cold` создаёт отдельный новый кэш на D и не заменяет канонический plan. Исторический дополнительный FP32-кэш сохранён в `D:/motionbricks-models/cold/initial-fp32`. `summarize.py` проверяет полный набор кадров перед кодированием и не перезаписывает существующие MP4.

Официальные источники: [README](https://github.com/NVlabs/motionbricks/blob/54fc563aeaaf819a753d72cc9fdc6713989cdd43/README.md), [Runtime API](https://github.com/NVlabs/motionbricks/blob/54fc563aeaaf819a753d72cc9fdc6713989cdd43/docs/runtime_api.md), [SOMA model card](https://github.com/NVlabs/motionbricks/blob/54fc563aeaaf819a753d72cc9fdc6713989cdd43/docs/soma_model.md), [ONNX inference](https://github.com/NVlabs/motionbricks/blob/54fc563aeaaf819a753d72cc9fdc6713989cdd43/docs/onnx_inference.md), [TensorRT support matrix](https://docs.nvidia.com/deeplearning/tensorrt/10.x.x/getting-started/support-matrix.html).

## F. Вердикт

**SUCCESS.** На этом оборудовании можно использовать предобученный MotionBricks для генерации последовательной человеческой SOMA-анимации через официальный TensorRT runtime. Существенное условие данного Windows-окружения — ASCII-пути для установленного Warp и его CUDA-кэша. ONNX Runtime как резервный путь не потребовался. Интеграция с World of Hex, изменение его скелета/сегментации и проектирование адаптации не выполнялись.

## Перенос в репозиторий

Отчёт, скрипты, два MP4, исходные JSON/NPZ и диагностические логи хранятся рядом в этом каталоге. Полные PNG-последовательности перенесены сюда же, но исключены из Git; в Git входят небольшие видео и подтверждающие данные. SHA256-проверка всех перенесённых результатов и логов записана в `migration-verification.json`. Абсолютные пути внутри исторических JSON сохранены как сведения об исходном прогоне; текущие размещения задаются `config.json`.

Сторонний checkout и Python-зависимости находятся локально на C вне репозитория. Его каталоги SOMA ONNX и `.trt-cache` являются явно проверяемыми junction-ссылками на D. Это сохраняет ASCII-пути для NVRTC и держит тяжёлые веса вне Git. Контракты и алгоритмы приложения World of Hex не изменены.
