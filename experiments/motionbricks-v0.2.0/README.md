# MotionBricks SOMA experiment

Отчёт: [MOTIONBRICKS_EXPERIMENT.md](MOTIONBRICKS_EXPERIMENT.md).

В репозитории хранятся собственные скрипты эксперимента, отчёт, MP4, исходные замеры JSON/NPZ и диагностические логи. Полные исходные PNG-последовательности доступны локально в `results/`, но игнорируются Git.

| Размещение | Содержимое |
| --- | --- |
| `experiments/motionbricks-v0.2.0/` | Код эксперимента, отчёт, результаты и видео |
| `runs/<timestamp>-<action>/` | Новые локальные запуски; не перезаписывают исторические результаты, игнорируются Git |
| `C:/Users/Public/motionbricks-runtime/` | Сторонний checkout, `.venv`, Python, uv, локальные кэши |
| `D:/motionbricks-models/` | SOMA ONNX, TensorRT plans и LFS-кэш весов |

Пути и точный commit официального репозитория задаются в `config.json`. Для другой машины используйте `config.local.json` с нужными `runtime_root` и `model_root`; этот файл игнорируется. Каталоги runtime и моделей должны иметь ASCII-пути из-за подтверждённой ошибки NVRTC при кириллице. Путь самого репозитория может содержать кириллицу.

Из корня World of Hex:

```powershell
.\experiments\motionbricks-v0.2.0\run.ps1 diagnose
.\experiments\motionbricks-v0.2.0\run.ps1 once
.\experiments\motionbricks-v0.2.0\run.ps1 loop
.\experiments\motionbricks-v0.2.0\run.ps1 verify
.\experiments\motionbricks-v0.2.0\run.ps1 benchmark
.\experiments\motionbricks-v0.2.0\run.ps1 fp16
.\experiments\motionbricks-v0.2.0\run.ps1 inbetweener
.\experiments\motionbricks-v0.2.0\run.ps1 scene
```

`install` выполняет `uv sync --locked` в отдельном runtime, `lfs` скачивает только SOMA-данные. `audit` проверяет сохранённые исторические массивы; `warm-loads` измеряет повторную загрузку без изменения plan; `cold` создаёт новый тяжёлый plan на D. `visual-inbetweener` и `visual-scene` записывают новые GL-кадры в каталог запуска. `summary` проверяет исторические PNG и создаёт новые копии видео в каталоге запуска.

Для восстановления runtime нужен официальный checkout `NVlabs/motionbricks` на commit из config, его штатные зависимости и локальный `tools/uv.exe`. В `runtime_root/motionbricks` должны быть две junction-ссылки:

```text
motionbricks/assets/onnx/soma -> model_root/soma
.trt-cache                  -> model_root/plans
```

Git LFS этого стороннего checkout настроен на `model_root/lfs-cache`. Запуск явно проверяет commit и ссылки; отсутствующие модели и окружение не подменяются другими путями. Сторонний checkout, зависимости и веса в основной репозиторий не добавляются.

Видео: [Inbetweener](results/inbetweener/demo.mp4), [SOMA gym и прыжок](results/scene-preview/demo.mp4). Результат первоначального эксперимента — SUCCESS; интеграция с риггингом World of Hex не выполнялась.
