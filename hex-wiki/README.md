# Hex Wiki

Локальная Git-backed wiki по сеттингу **World of Hex / Хекс**.

Источник правды — обычные Markdown-файлы в Git. Gollum используется только как web-интерфейс для чтения и редактирования поверх этой папки.

## Почему не Docker

Основной путь запуска — WSL Ubuntu + Ruby + Gollum. Docker не нужен для локальной работы с wiki и не является обязательной зависимостью sub-project.

## Почему Markdown + Git

- Файлы можно редактировать в Cursor, VS Code или Obsidian.
- История изменений хранится в Git.
- Wiki не зависит от Confluence, Google Docs или других SaaS.
- При потере внешнего сервиса остаются обычные `.md` файлы на диске.

## Структура

```text
hex-wiki/
  Gemfile           # Ruby-зависимости (Gollum)
  scripts/          # WSL-скрипты установки и запуска
  wiki/             # Markdown-страницы wiki (отдельный Git repo)
  tools/            # Заготовки будущих импортеров
```

`hex-wiki/` — техническая обвязка.
`hex-wiki/wiki/` — сама wiki как набор Markdown-файлов.

## Git-логика и nested repo

Основной проект `world-of-hex` уже является Git-репозиторием. Поэтому `hex-wiki/wiki/` **не инициализируется автоматически** при создании файлов sub-project.

По умолчанию nested Git repo создаётся только при запуске:

```bash
./scripts/setup_wsl.sh
```

или вручную:

```bash
cd hex-wiki/wiki
git init
git add .
git commit -m "Initial Hex wiki"
```

### Варианты хранения

1. **Отдельный Git repo в `wiki/`** (рекомендуется) — wiki живёт как самостоятельный репозиторий внутри sub-project.
2. **Без nested repo** — страницы остаются обычными файлами в основном репозитории; Gollum всё равно работает, но история wiki не отделена.
3. **Git submodule** — если позже понадобится вынести wiki в отдельный remote, `wiki/` можно оформить как submodule.

Если nested repo не создан, `check_env.sh` покажет предупреждение, но не заблокирует запуск Gollum.

## Требования

Целевой режим:

```text
Windows host
  -> WSL Ubuntu
    -> Ruby
    -> Bundler
    -> Gollum
    -> Git repo with Markdown files
```

Нативный Windows-запуск Gollum не является приоритетным.

## Установка

Из WSL, в корне проекта:

```bash
npm run wiki:setup
```

Или напрямую:

```bash
cd hex-wiki
./scripts/setup_wsl.sh
```

Скрипт:

- обновит `apt`;
- установит Ruby, build tools, Git и системные зависимости;
- установит Bundler при необходимости;
- настроит путь gems в Linux FS: `~/.cache/hex-wiki/bundle` (не на `/mnt/c`, где NTFS ломает Bundler);
- выполнит `bundle install`;
- создаст структуру `wiki/`, если её ещё нет;
- инициализирует `wiki/.git`, если репозитория ещё нет;
- сделает первый commit, если репозиторий пуст.

## Проверка окружения

```bash
npm run wiki:check
```

Или:

```bash
cd hex-wiki
./scripts/check_env.sh
```

## Локальный запуск с редактированием

```bash
npm run wiki:dev
```

Или:

```bash
cd hex-wiki
./scripts/start_wiki.sh
```

После запуска wiki будет доступна на:

```text
http://127.0.0.1:4567
```

## Read-only режим

Для временного шаринга без удалённого редактирования:

```bash
npm run wiki:readonly
```

Или:

```bash
cd hex-wiki
./scripts/start_readonly.sh
```

## Экспорт одним файлом

Чтобы поделиться всей wiki как одним читаемым документом:

```bash
npm run wiki:export
```

Или:

```bash
node hex-wiki/scripts/export-wiki.mjs
```

Результат:

```text
hex-wiki/export/
  hex-wiki-YYYY-MM-DD.md   # все страницы + оглавление
  assets/                  # картинки, на которые ссылается экспорт
```

Откройте `.md` из папки `export/` в Obsidian / VS Code / Typora — внутренние ссылки и картинки будут работать. Для шаринга отдайте всю папку `export/` (или заархивируйте её). Один `.md` без `assets/` тоже читается, но без иллюстраций.

Папка `export/` в git не коммитится.

## Шаринг через ngrok

Сначала запустите read-only Gollum, затем в другом терминале:

```bash
npm run wiki:ngrok
```

Или:

```bash
cd hex-wiki
./scripts/start_ngrok.sh
```

**Важно:** не открывайте редактируемый Gollum через ngrok, если не хотите, чтобы внешние пользователи меняли wiki.

## Как добавлять страницы

1. Создайте `.md` файл в `hex-wiki/wiki/`.
2. Добавьте YAML front matter со статусом, authority и тегами.
3. Свяжите страницу через Gollum wiki-links: `[[path/to/page|Label]]`.
4. При необходимости добавьте ссылку в `Sidebar.md`.
5. Закоммитьте изменения в `wiki/`.

Рекомендуемые статусы:

```text
canon
draft
legacy
deprecated
conflict
gurps-reference
```

Уровни authority:

```text
100 — консолидированный канон / явно принято пользователем
90  — свежая отдельная статья DOCX
80  — закреплённое решение из чата
50  — старый Confluence export
40  — справочник правил GURPS
20  — черновик
```

## Backup и сохранность данных

Все данные wiki — это обычные файлы в `hex-wiki/wiki/`.

Ручной backup через Git:

```bash
cd hex-wiki/wiki
git status
git add .
git commit -m "Update Hex wiki"
```

Дополнительно можно:

- пушить `wiki/` в отдельный remote;
- копировать папку `wiki/` в backup;
- хранить изображения и PDF в `wiki/assets/`.

Gollum не является источником правды: при его остановке все страницы остаются на диске.

## Управление из корня проекта

В корневом `package.json` добавлены команды:

```bash
npm run wiki:check
npm run wiki:setup
npm run wiki:dev
npm run wiki:readonly
npm run wiki:ngrok
```

Эти команды можно запускать из корня проекта. На Windows они автоматически перенаправляются в WSL Ubuntu через `hex-wiki/scripts/run-wiki-script.mjs`.

## Windows troubleshooting

### PowerShell блокирует `npm`

Если видите ошибку про `npm.ps1` и execution policy, используйте:

```powershell
npm.cmd run wiki:setup
```

Или откройте **Command Prompt** вместо PowerShell.

### `execvpe(/bin/bash) failed`

Обычно это значит, что Windows пытается запустить `bash` в WSL-дистрибутиве `docker-desktop`, а не в Ubuntu.

С root-командами проект теперь ищет Ubuntu WSL автоматически. Если Ubuntu ещё не установлен:

```powershell
wsl --install -d Ubuntu
wsl --set-default Ubuntu
```

После установки перезапустите терминал и снова выполните:

```powershell
npm.cmd run wiki:setup
```

### `world-writable` / unsafe to remove under `vendor/bundle`

На Windows проект лежит на `/mnt/c` (NTFS). Bundler считает такие каталоги небезопасными.

Скрипты ставят gems в Linux-home:

```text
~/.cache/hex-wiki/bundle
```

а не в `hex-wiki/vendor/bundle`.

### `yaml.h not found` / native extension build failures

Нужны системные headers. Их ставит `wiki:setup` (`libyaml-dev`, `libssl-dev`, `libxml2-dev`, `libzstd-dev`, `libjitterentropy3-dev` и т.д.).

### Повторный запрос sudo password

`wiki:setup` проверяет apt-пакеты перед установкой. Если все системные зависимости уже стоят, `sudo apt-get` не запускается и пароль не спрашивается.

Если нужен полностью passwordless sudo внутри WSL, настройте это явно в самой Ubuntu, не храните пароль в скриптах проекта:

```bash
sudo visudo
```

И добавьте строку для вашего WSL-пользователя:

```text
user ALL=(ALL) NOPASSWD: /usr/bin/apt-get
```

После этого `wiki:setup` сможет ставить недостающие apt-пакеты без запроса пароля.

### `Author identity unknown` при initial commit

`wiki:setup` не меняет `git config --global`. Для первого bootstrap-коммита wiki он использует одноразовую identity через env-переменные:

```text
Hex Wiki Setup <hex-wiki@example.local>
```

Если хотите свой author в этом коммите, задайте переменные перед запуском:

```bash
GIT_AUTHOR_NAME="Your Name" GIT_AUTHOR_EMAIL="you@example.com" npm run wiki:setup
```

### Рекомендуемый путь на Windows

1. Установить Ubuntu WSL.
2. Сделать его default: `wsl --set-default Ubuntu`.
3. Запускать wiki-команды из корня проекта через `npm.cmd run ...`.
4. Открывать wiki в браузере Windows: `http://127.0.0.1:4567`.

## Что не входит в этот этап

- Docker Compose как основной путь;
- отдельный frontend/backend;
- база данных;
- автосинхронизация с Google Docs;
- массовый импорт legacy-источников;
- сложная авторизация и permissions.

На этом этапе создан только скелет локальной Git-backed wiki.
