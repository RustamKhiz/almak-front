# Almak Frontend

Angular-приложение для работы с заказами: авторизация, список заказов, создание и редактирование, просмотр, печать и выгрузка `.doc`.

## Что умеет фронт

- логин по JWT и защита внутренних маршрутов: веб хранит access token в памяти и refresh token в `HttpOnly` cookie, Electron использует локальное хранилище;
- список заказов и экран просмотра заказа;
- создание и редактирование заказа;
- смена статуса заказа;
- удаление заказа;
- печать и скачивание документа;
- работа с несколькими типами товарных позиций в одном заказе.

## Поддерживаемые позиции заказа

Сейчас фронт поддерживает:

- межкомнатные двери;
- входные двери;
- погонаж;
- доборы;
- капитель;
- обшивку.

Для каждого типа есть своя модель, своя модалка и свой mapping в API.

## Основные маршруты

- `/auth` — авторизация;
- `/orders` — список заказов;
- `/order` — создание заказа;
- `/order/:id` — просмотр заказа;
- `/order/:id/edit` — редактирование заказа;
- `/orders-charts` — графики по заказам.

Статистика поставщиков на странице графиков загружается агрегированным запросом `/orders/analytics/suppliers`; полные заказы по одному не запрашиваются.

Маршруты описаны в [src/app/app.routes.ts](/c:/main/projects/diplom/almak-front/src/app/app.routes.ts).

## Ключевые части приложения

- [src/app/components/order-create](/c:/main/projects/diplom/almak-front/src/app/components/order-create) — главный экран создания и редактирования заказа.
- [src/app/pages/order-view](/c:/main/projects/diplom/almak-front/src/app/pages/order-view) — просмотр заказа, смена статуса, печать, скачивание, удаление.
- [src/app/services/orders.service.ts](/c:/main/projects/diplom/almak-front/src/app/services/orders.service.ts) — публичный фасад заказов.
- [src/app/services/orders-api.service.ts](/c:/main/projects/diplom/almak-front/src/app/services/orders-api.service.ts) — HTTP-запросы заказов.
- [src/app/services/order.mapper.ts](/c:/main/projects/diplom/almak-front/src/app/services/order.mapper.ts) — mapping между UI и backend API.
- [src/app/services/order-api.types.ts](/c:/main/projects/diplom/almak-front/src/app/services/order-api.types.ts) — DTO backend API.
- [src/app/services/order-normalizers.ts](/c:/main/projects/diplom/almak-front/src/app/services/order-normalizers.ts) — числовая и legacy-нормализация.
- [src/app/services/order-document.service.ts](/c:/main/projects/diplom/almak-front/src/app/services/order-document.service.ts) — генерация HTML и `.doc`.
- [src/app/types/order.types.ts](/c:/main/projects/diplom/almak-front/src/app/types/order.types.ts) — основные типы заказа.
- [src/app/common/dialogs](/c:/main/projects/diplom/almak-front/src/app/common/dialogs) — модалки товарных позиций.
- [src/app/common/constants](/c:/main/projects/diplom/almak-front/src/app/common/constants) — словари и подписи.

## Структура данных на фронте

Главный формат формы — `OrderCreatePayload`.

В нём есть:

- шапка заказа: `name`, `phone`, `date`, `prepayment`, `discount`, `needsDelivery`, `deliveryAddress`, `comment`, `status`;
- массивы позиций:
  - `interiorDoors`
  - `entranceDoors`
  - `moldings`
  - `extensions`
  - `capitals`
  - `panelings`

На фронте сумма заказа считается локально:

- `orderTotal` — сумма всех товарных позиций;
- `totalToPay` — `orderTotal - discount`;
- `customerDebt` — `totalToPay - prepayment`.

Важно: в текущей логике в итог входят:

- межкомнатные двери;
- входные двери;
- погонаж;
- доборы;
- обшивка.

Капитель цены не имеет и в итог не входит.

## Как работает создание и редактирование

Экран [order-create.component.ts](/c:/main/projects/diplom/almak-front/src/app/components/order-create/order-create.component.ts):

- работает и в create, и в edit режиме;
- в edit режиме загружает заказ через `ordersService.getOrder(id)`;
- хранит шапку заказа в `Reactive Form`;
- хранит товарные позиции в `signal`;
- для каждой позиции умеет `add/edit/duplicate/remove`;
- перед сохранением проверяет:
  - валидность формы;
  - что в заказе есть хотя бы одна позиция;
  - что при `needsDelivery = true` заполнен `deliveryAddress`.

Сохранение идёт через confirm-диалог, затем:

- create: `ordersService.createOrder(payload)`
- edit: `ordersService.updateOrder(id, payload)`

## Как работает просмотр заказа

Экран [order-view.component.ts](/c:/main/projects/diplom/almak-front/src/app/pages/order-view/order-view.component.ts):

- загружает заказ по `id`;
- показывает все типы товарных позиций;
- позволяет сменить статус;
- умеет удалить заказ;
- умеет распечатать и скачать документ.

Документ строится в [order-document.service.ts](/c:/main/projects/diplom/almak-front/src/app/services/order-document.service.ts).

## Mapping в API

[orders.service.ts](/c:/main/projects/diplom/almak-front/src/app/services/orders.service.ts) сохраняет публичный API для компонентов и делегирует работу:

- загрузку списка заказов;
- загрузку одного заказа;
- создание;
- обновление;
- удаление;
- смену статуса;
- HTTP-вызовы — `OrdersApiService`;
- преобразование backend JSON в `OrderCreatePayload` и обратно — `OrderMapper`.

Здесь важно помнить:

- на фронте поле клиента называется `name`, на бэке — `customer`;
- статус на фронте — число (`1 | 2 | 3`), на бэке — строка (`accepted | progress | completed`);
- фронт передаёт все массивы позиций целиком;
- бэк при `PUT /orders/:id` пересоздаёт дочерние записи заново.

## Локальный запуск

### Обычный dev-режим

```bash
npm install
npm start
```

### Локальный фронт против локального бэка

```bash
npm install
npm run start:local
```

Локальный API берётся из [src/environments/environment.local.ts](/c:/main/projects/diplom/almak-front/src/environments/environment.local.ts).

## Полезные команды

```bash
npm start
npm run start:local
npm run build
npx tsc -p tsconfig.json --noEmit
```

## Релизы

Версия хранится в `package.json` и автоматически отображается в UI (навигационная панель). Используется [SemVer](https://semver.org/lang/ru/): `MAJOR.MINOR.PATCH`.

| Тип изменения          | Команда             |
| ---------------------- | ------------------- |
| Баг-фикс               | `npm version patch` |
| Новая функциональность | `npm version minor` |
| Ломающие изменения     | `npm version major` |

### Процесс

1. Убедиться что ветка `dev` стабильна и все изменения закоммичены.
2. Поднять версию — npm сам обновит `package.json`, создаст коммит и git-тег:
   ```bash
   npm version patch -m "chore: release v%s"
   ```
3. Запушить ветку вместе с тегом:
   ```bash
   git push origin dev --tags
   ```
4. Открыть PR `dev → main` и смержить — фронт задеплоится автоматически.
5. Electron-приложение соберётся и задеплоится автоматически по тегу (workflow `deploy-desktop.yml`).

### Что происходит автоматически

- **Push в `main`** → CI собирает фронт и деплоит на сервер ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).
- **Push тега `v*`** → CI собирает Electron `.exe`, загружает на сервер, обновляет `Almak-Setup-latest.exe` ([`.github/workflows/deploy-desktop.yml`](.github/workflows/deploy-desktop.yml)).
- **Запущенные Electron-клиенты** получат уведомление об обновлении и установят его при следующем запуске.

Дополнительную информацию по Electron-сборке см. в [ELECTRON.md](ELECTRON.md).

## Правило по кодировке

- Все текстовые исходники фронта (`src/**/*.ts`, `src/**/*.html`, `src/**/*.scss`, `README.md`) должны храниться в `UTF-8` без BOM.
- Нельзя сохранять файлы в `ANSI`, `Windows-1251`, `CP1251` или другой локальной кодировке.
- После массовых правок нужно проверять, что в проект не попали `�`, `Ð`, `Ñ`, `Р`/`С`-кракозябры или сломанная кириллица.
- Если файл уже повреждён по кодировке, его нужно сначала перекодировать в `UTF-8`, и только потом продолжать правки.
