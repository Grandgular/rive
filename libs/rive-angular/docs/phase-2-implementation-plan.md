# Phase 2: Enhanced Developer Experience - Implementation Plan

> **Status**: Planning  
> **Target Version**: 0.2.0  
> **Created**: 2026-02-16

## Scope

Фаза покрывает задачи из `ng-rive-issues-analysis.md`:

- Улучшенные ошибки с кодами и actionable suggestions
- Валидация имён `artboard` / `animations` / `stateMachines` / `inputs`
- Debug mode с управляемой детализацией логов

---

## Contract Decisions

Обязательные архитектурные решения перед началом реализации:

### 1. Debug Precedence (единая логика)

```
Локальный debug: true      → принудительно 'debug'
Локальный debug: false     → использовать глобальный уровень
Локальный debug: undefined → использовать глобальный уровень
Глобальный config          → его значение
Нет config                 → 'error' (только ошибки)
```

### 2. Validation Severity

- Ошибки несовпадения имён (`artboard`/`animations`/`stateMachines`) **не фейлят** загрузку
- Они эмитятся как `RiveValidationError` через `loadError` output и логируются
- Работа Rive продолжается, если runtime смог загрузиться

### 3. Zero-config Compatibility

- `RIVE_DEBUG_CONFIG` и `provideRiveDebug()` полностью optional
- Библиотека обязана работать без любого DI-конфига как сейчас

### 4. Public API Boundary

Публично экспортируются только:
- `RiveErrorCode` (enum)
- `RiveValidationError` (class)
- `RiveErrorOptions` (type)
- `provideRiveDebug` (function)
- `RiveDebugConfig`, `LogLevel` (types)

`RiveLogger` и `validator` остаются internal (без root-переэкспорта).

---

## Target Files

### New Files

| File | Description |
|------|-------------|
| `src/lib/utils/error-codes.ts` | Error codes enum и messages |
| `src/lib/utils/debug-config.ts` | InjectionToken и provideRiveDebug |
| `src/lib/utils/logger.ts` | RiveLogger class (internal) |
| `src/lib/utils/validator.ts` | Validation functions (internal) |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/models/rive.model.ts` | Расширить RiveLoadError, добавить RiveValidationError |
| `src/lib/models/index.ts` | Экспорты новых типов |
| `src/lib/components/rive-canvas.component.ts` | debugMode input, logger, validation |
| `src/lib/components/rive-canvas.component.spec.ts` | Тесты для debug и validation |
| `src/lib/services/rive-file.service.ts` | debug param, fix race condition |
| `src/lib/services/rive-file.service.spec.ts` | Тесты для race fix |
| `src/lib/utils/index.ts` | Internal exports |
| `src/index.ts` | Public API exports |
| `README.md` | Documentation updates |
| `CHANGELOG.md` | Version changelog |

---

## Implementation Plan

### 1. Error System and Models

- Ввести `RiveErrorCode` (`RIVE_1xx`, `RIVE_2xx`, `RIVE_3xx`) и словарь сообщений
- Расширить `RiveLoadError` через `Error | RiveErrorOptions`:
  - Backward compatible с текущим `new RiveLoadError(message, error)`
  - Поддержка `code`, `suggestion`, `docsUrl`
- Добавить `RiveValidationError` с полями `code`, `availableOptions`, `suggestion`

#### Error Codes

| Code | Situation | Message |
|------|-----------|---------|
| RIVE_101 | 404 при загрузке | File not found: {url} |
| RIVE_102 | Невалидный формат | Invalid .riv file format |
| RIVE_103 | Сетевая ошибка | Network error while loading file |
| RIVE_201 | Артборд не найден | Artboard "{name}" not found |
| RIVE_202 | Анимация не найдена | Animation "{name}" not found |
| RIVE_203 | State machine не найден | State machine "{name}" not found |
| RIVE_204 | Input не найден | Input "{name}" not found in "{sm}" |
| RIVE_301 | Нет источника | No animation source provided |
| RIVE_302 | Невалидный canvas | Invalid canvas element |

### 2. Debug Configuration and Logger

- Добавить `LogLevel` type: `'none' | 'error' | 'warn' | 'info' | 'debug'`
- Добавить `RiveDebugConfig` interface и optional token `RIVE_DEBUG_CONFIG`
- Добавить `provideRiveDebug(config)` для удобного app-level подключения
- Реализовать `RiveLogger` с уровнями логирования
- Вынести вычисление effective-level в отдельную функцию

#### Usage Example

```typescript
// Global debug (app.config.ts)
import { provideRiveDebug } from '@grandgular/rive-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRiveDebug({ logLevel: 'debug' })
  ]
};

// Local debug (component template)
<rive-canvas src="animation.riv" [debugMode]="true" />

// Local debug (service)
this.riveFileService.loadFile({ src: 'animation.riv', debug: true });
```

### 3. Component Integration

- Добавить `debugMode = input<boolean>()`
- Инициализировать logger с учетом global config и реактивного override
- В `onLoad()`:
  - Логировать доступные сущности только при debug
  - Запускать post-load validation
- В `validateConfiguration()`:
  - Безопасно проверять наличие runtime metadata
  - При mismatch формировать `RiveValidationError`, логировать и эмитить через `loadError`

#### Debug Output Example

```
[Rive] Loading animation from: assets/animation.riv
[Rive] Canvas size: 800x600, DPR: 2
[Rive] Animation loaded successfully
[Rive] Available artboards: ["Artboard", "Mobile", "Tablet"]
[Rive] Using artboard: "Artboard"
[Rive] Available state machines: ["StateMachine1", "Hover"]
[Rive] Playing state machine: "StateMachine1"
```

### 4. Service Hardening (RiveFileService)

- Расширить `RiveFileParams` полем `debug?: boolean`
- Применить ту же debug-precedence логику
- **Исправить race condition:**
  - Подписки `EventType.Load` / `EventType.LoadError` ставятся **до** `init()`
  - `await file.init()` с обработкой исключений
  - Корректное завершение pending-state во всех ветках

```typescript
private async loadRiveFile(...): Promise<void> {
  try {
    const file = new RiveFile(params);
    
    // Подписки ДО init() — устраняет race condition
    file.on(EventType.Load, () => { ... });
    file.on(EventType.LoadError, () => { ... });

    // Теперь безопасно инициализируем
    await file.init();
  } catch (error) {
    // Обработка ошибок init()
  }
}
```

### 5. Exports and API Surface

- `src/lib/utils/index.ts`: internal-friendly реэкспорты
- `src/index.ts`: только public сущности
- Не экспортировать `RiveLogger` и validator наружу

### 6. Tests

**rive-canvas.component.spec.ts:**
- Debug precedence и обновление уровня логирования
- Emission `RiveValidationError` при неверных именах
- Отсутствие падения при неполных metadata runtime

**rive-file.service.spec.ts:**
- Подписка до `init()` и обработка reject/throw
- Единичный pending cleanup
- Debug override не ломает cache/refCount контракт

**rive.model tests:**
- Backward compatibility конструктора `RiveLoadError`

### 7. Documentation

**README.md:**
- Разделы `Debug Mode`, `Error Codes`, `Validation behavior`
- Описать non-fatal validation и обработку через `loadError`

**CHANGELOG.md:**
```markdown
## [0.2.0] - 2026-02-XX

### Added
- Debug mode with two-level configuration (global via `provideRiveDebug()`, local via `[debugMode]` input)
- Error codes system (RIVE_1xx for load errors, RIVE_2xx for validation, RIVE_3xx for config)
- `RiveValidationError` class for artboard/animation/state machine validation
- Validation of artboard, animation, and state machine names on load
- `debug` parameter in `RiveFileParams` for per-request debugging
- Verbose logging in debug mode

### Changed
- `RiveLoadError` now accepts optional `code`, `suggestion`, and `docsUrl` (backward compatible)
- Improved error messages with actionable suggestions

### Fixed
- Fixed race condition in `RiveFileService.loadRiveFile()` where events could fire before subscriptions
- Properly await `RiveFile.init()` Promise to handle initialization errors
```

---

## Acceptance Criteria

- [ ] Phase 2 цели из анализа закрыты без нарушения zero-config сценария
- [ ] Нет противоречий в debug behavior между документацией и кодом
- [ ] Валидация выдает структурированные ошибки и не ломает успешный runtime load
- [ ] `RiveFileService` не содержит race между `init()` и подписками
- [ ] Все новые/измененные тесты проходят
- [ ] 100% обратная совместимость с существующим API

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Runtime metadata API нестабилен | Защитные проверки + graceful fallback |
| Расширение API может стать breaking | Strict public export list |
| Шумные логи в production | Default `error`, explicit opt-in для `debug` |

---

## File Structure After Changes

```
libs/rive-angular/src/lib/
├── components/
│   ├── rive-canvas.component.ts (updated)
│   └── rive-canvas.component.spec.ts (updated)
├── models/
│   ├── rive.model.ts (updated)
│   └── index.ts (updated)
├── utils/
│   ├── element-observer.ts (unchanged)
│   ├── error-codes.ts (new)
│   ├── debug-config.ts (new)
│   ├── logger.ts (new, internal)
│   ├── validator.ts (new, internal)
│   └── index.ts (updated)
└── services/
    ├── rive-file.service.ts (updated)
    ├── rive-file.service.spec.ts (updated)
    └── index.ts (updated)
```
