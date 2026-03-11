Ниже — **объёмный доклад “по шагам”** строго под практическую часть (Шаг 1–6) и под твою идею **маркетплейса “мёртвого кода” с AI-аудитом**. Я оформил так, чтобы ты мог(ла) **прямо читать как доклад** и параллельно переносить в **4–6 слайдов**.

---

## Шаг 1. Структура мини-дека (4–6 слайдов)

```text name=01-structure.txt
Мини-дек (минимум 4 слайда):

1) Problem — Потребность/проблема (почему болит и насколько это важно)
2) Customer — Целевая аудитория/сегмент (кто платит и кто поставляет)
3) Market — Рынок + TAM/SAM/SOM (масштаб возможности и логика расчёта)
4) Why now / Drivers — Почему сейчас (драйверы, делающие рынок “созревшим”)

(опционально 5) Competition / Alternatives — Замены и конкуренты (1 слайд)
(опционально 6) Trust & Risk — как снимаем риски покупки кода (IP/безопасность/escrow)
```

---

## Шаг 2. Слайд 1: Problem — формулировка потребности (1–3 проблемы + доказательства)

### Текст доклада (что говорить)
Проблема состоит из **двух встречных болей** — со стороны продавцов и со стороны покупателей.

1) **Боль продавца (“кладбище кода”)**: разработчики часто забрасывают проекты на стадии частичной готовности (условно 60–80%). В итоге месяцы работы превращаются в актив с нулевой ликвидностью: код есть, но продать его почти невозможно — нет рынка, нет стандарта оценки, нет доверия.

2) **Боль покупателя (“кот в мешке”)**: предприниматели и небольшие студии готовы купить кодовую базу, чтобы ускорить запуск MVP и сэкономить на разработке с нуля. Но они боятся скрытых проблем:  
- уязвимости и устаревшие зависимости,  
- техдолг и “спагетти-код”,  
- отсутствие документации/тестов,  
- юридические риски: лицензии, права на IP.

3) **Почему текущие решения не закрывают**:  
- GitHub/opensource — это “бесплатно”, но требует разбираться и нет гарантий качества/совместимости/лицензий;  
- фриланс/аутсорс — дорого и долго;  
- рынки типа Flippa часто ориентированы на **бизнес/активы**, а не на “недоделанный код как технологическую основу”, и покупателю всё равно нужно разбираться с качеством.

### Доказательные элементы (что писать внизу слайда)
- Масштаб “производства кода”: GitHub в Octoverse 2025 пишет, что на GitHub **180M+ developers** и что “в среднем более одного нового разработчика присоединяется каждую секунду”, за год добавилось **36M новых раз��аботчиков**. ([github.blog](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/?utm_source=openai))  
- Риск “устаревших и уязвимых компонентов” — отдельная категория OWASP Top 10:2021 (A06:2021 “Vulnerable and Outdated Components”), которая объясняет, что риск возникает, если команда не знает версии компонентов, не обновляет зависимости и т.п. Это прямо релевантно покупке старого/заброшенного кода. ([owasp.org](https://owasp.org/Top10/en/A06_2021-Vulnerable_and_Outdated_Components/?utm_source=openai))  

```text name=02-slide-problem.txt
СЛАЙД 1 — Problem
Заголовок: “Мёртвый код: потери у продавцов + высокий риск у покупателей”

• Контекст: проект заброшен на 60–80% → месяцы работы не монетизируются
• Боль покупателя: страшно покупать чужую кодовую базу без аудита (tech debt, уязвимости, зависимости, доки)
• Последствия: покупатели переплачивают за разработку с нуля; продавцы теряют вложенное время

Сигналы/основания (внизу мелко):
- GitHub Octoverse 2025: 180M+ developers, 36M новых за год, “1 new developer every second”:
  https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/
- OWASP Top 10 A06:2021 Vulnerable and Outdated Components:
  https://owasp.org/Top10/en/A06_2021-Vulnerable_and_Outdated_Components/
```

---

## Шаг 3. Слайд 2: Customer — целевой клиент и сегмент + persona/JTBD + барьеры

### Логика (как объяс��ять по шагам)
В нашем продукте **двусторонний маркетплейс**, поэтому важно разделить:

- **Платящий сегмент (Buyer)**: “Охотники за быстрым стартом” — предприниматели/студии, которым нужен быстрый запуск MVP.  
- **Поставщики (Seller)**: “Разочарованные инди-хакеры” — инди-разработчики, которые забросили проекты и хотят “вытащить хоть какую-то ценность”.

В докладе акцент делаем на **покупателе**, потому что он платит (commission + платный AI-отчет).

### Persona (2–3 строки)
Покупатель:  
- “Саша, 28 лет, solopreneur/PM, делает micro‑SaaS. Умеет читать код, но нет времени на глубокий аудит. Нужен MVP за 2–4 недели. Бюджет до $2k на старт.”

### JTBD (обязательно по заданию)
“Когда мне нужно быстро проверить гипотезу и запустить MVP, я хочу купить готовую кодовую базу с понятным качеством, чтобы сэкономить месяцы разработки и снизить риск покупки.”

### Ключевые возражения/барьеры
- “Код не запустится / устарел”  
- “Код украден у работодателя / лицензии не позволяют перепродажу”  

И тут ты переходишь к тому, что **AI-аудит + чек-листы лицензий + escrow** — механизм снижения барьеров (на уровне слайдов достаточно 1–2 фраз).

```text name=03-slide-customer.txt
СЛАЙД 2 — Customer

Целевой сегмент (покупатели): “Охотники за быстрым стартом”
+ Поставщики (продавцы): “Разочарованные инди-хакеры” (для наполнения витрины)

Параметры покупателя:
- Роль: founder / product / tech lead small team
- Сценарий: нужен MVP быстро (недели, не месяцы)
- Ограничения: бюджет до ~$2k, нет времени на полный ручной аудит
- Критерии выбора: понятный стек, документация, прогнозируемая поддерживаемость
- Где искать: Product Hunt, IndieHackers, Reddit, Telegram/чаты стартапов

Persona (мини):
“Solopreneur, запускает micro‑SaaS, хочет основу 60–80% готовности без ‘кота в мешке’.”

JTBD:
“Когда мне нужно запустить MVP быстро, я хочу купить кодовую базу с прозрачным качеством,
чтобы сэкономить 3–4 месяца разработки.”

Барьеры:
- “Код устарел/не запустится”
- “Юридические риски (лицензии/IP)”
```

---

## Шаг 4. Слайд 3: Market — TAM/SAM/SOM (метод, допущения, источники)

Здесь важна **не магия цифр**, а метод и прозрачные допущения.

### 4.1. Что мы считаем рынком (правильная формулировка)
- Мы НЕ говорим “наш рынок — студенты/инди”.  
- Мы говорим: “рынок — это **спрос на ускорение запуска цифровых прод��ктов** (MVP) через покупку готовой кодовой базы/ассетов, вместо разработки с нуля”.

### 4.2. Метод расчёта (как требует задание)
Сделаем **комбинированный**:
- **TAM (top-down)**: большой рынок платной цифровой работы/разработки (как “деньги, которые тратятся на создание софта”). Тут как якорь удобно использовать публичные метрики крупных маркетплейсов услуг.  
- **SAM (top-down/proxy)**: “pre‑revenue / starter assets” — подтверждаем, что такой класс активов существует на Flippa и имеет ценовые рамки.  
- **SOM (bottom-up)**: достижимая доля по числу сделок, среднему чеку и комиссии.

### 4.3. Числа (пример для учебной работы — можно взять как базовый вариант)
Важно: ниже — **учебная модель** (в слайде обязательно “Assumptions”).  
- **Средний чек сделки (ASP)**: $500 (как ты и задавал(а)).  
- **Комиссия**: 15%.  
- **План сделок на год 3**: 20,000 (пример — можно уменьшить до 5,000, если хочешь более консервативно).

**SOM (GMV)** = 20,000 × $500 = **$10,000,000**  
**SOM (Revenue)** = $10,000,000 × 15% = **$1,500,000**

### 4.4. Какие источники ставим внизу слайда (только точные ссылки)
- GitHub Octoverse 2025 — подтверждает масштаб developer economy (контекст для supply). ([github.blog](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/?utm_source=openai))  
- Flippa Help Center “Listing sale pricing” — прямо выделяет категорию **“New / Starter / Template / Non-Revenue Generating Assets”** и пишет max asking price **$9,999**; это отличный внешний якорь, что рынок “пред-ревеню активов” реален и с понятной логикой цены. ([support.flippa.com](https://support.flippa.com/hc/en-us/articles/12856932906767-Listing-sale-pricing?utm_source=openai))  
- Fiverr FY2024 results — публичные цифры revenue (якорь на масштаб gig marketplace). ([investors.fiverr.com](https://investors.fiverr.com/news-releases/news-release-details/fiverr-announces-fourth-quarter-and-full-year-2024-results/?utm_source=openai))  
*(Upwork 10-K я здесь не закрепляю цифрой, потому что в нашем веб-выгрузе нет прямой цитаты из 10-K; если хочешь — дособерём отдельно именно ссылку на SEC и конкретный фрагмент.)*

```text name=04-slide-market.txt
СЛАЙД 3 — Market (TAM / SAM / SOM)

Метод: комбинированный (TAM — top-down, SAM — proxy/top-down, SOM — bottom-up)

TAM (широкий): деньги, которые тратятся на цифровую разработку/услуги (gig marketplaces как индикатор)
SAM (доступный): сделки с “starter / non-revenue assets” (код/проекты без выручки как класс активов)
SOM (достижимый за 2–3 года): по плану сделок платформы

Bottom-up (SOM) — пример:
- Сделки/год (год 3): 20,000
- Средний чек: $500
- GMV: $10M
- Комиссия: 15%
- Выручка: $1.5M (+ upsell AI-отчёт/промо)

Ключевые допущения:
- Средний чек $500 (покупка “основы” дешевле разработки с нуля)
- Комиссия 15%
- Конверсия в сделку зависит от доверия → решаем AI-аудитом + escrow + юридическими чек-листами

Источники (внизу слайда):
- GitHub Octoverse 2025 (масштаб dev economy): https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/
- Flippa: “New / Starter / Template / Non-Revenue Generating Assets” (pricing rules): https://support.flippa.com/hc/en-us/articles/12856932906767-Listing-sale-pricing
- Fiverr FY2024 results (масштаб gig marketplace): https://investors.fiverr.com/news-releases/news-release-details/fiverr-announces-fourth-quarter-and-full-year-2024-results/
```

---

## Шаг 5. Слайд 4: Why now / Drivers — 3–5 драйверов (с привязкой к сегменту)

### Что говорить (объёмно)
1) **Взрыв количества кода и людей, которые его пишут**  
GitHub фиксирует резкий рост: 180M+ разработчиков, 36M новых за год. Это означает, что “сырья” (репозиториев/проектов) будет только больше, а значит вторичный рынок активов логичен. ([github.blog](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/?utm_source=openai))  

2) **Безопасность и зависимости стали болью по умолчанию**  
OWASP Top 10 выделяет проблему “Vulnerable and Outdated Components”: если не знаешь версии компонентов и не обновляешь зависимости — ты уязвим. Для покупателя чужого кода это главный страх. Значит, ценность автоматизированного аудита растёт. ([owasp.org](https://owasp.org/Top10/en/A06_2021-Vulnerable_and_Outdated_Components/?utm_source=openai))  

3) **Рынок уже признаёт “pre‑revenue assets” как товар**  
Flippa формализует класс “starter/non‑revenue generating assets” и ограничивает цены — это признак того, что покупатели реально рассматривают такие активы, но рынок требует доверия и понятных рамок. ([support.flippa.com](https://support.flippa.com/hc/en-us/articles/12856932906767-Listing-sale-pricing?utm_source=openai))  

4) **Лицензии и право использования — ключ к доверию**  
ChooseALicense (проект GitHub) даёт понятные “карточки” лицензий (например MIT): условия, ограничения, что можно/нельзя. Это можно встроить в “юридический чек-лист” платформы. ([choosealicense.com](https://choosealicense.com/licenses/mit/?utm_source=openai))  

```text name=05-slide-why-now.txt
СЛАЙД 4 — Why now (Почему сейчас)

1) Рост dev economy и объёма кода:
- Octoverse 2025: 180M+ developers, 36M новых за год → supply “мертвого кода” огромный
  https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/

2) Зависимости/уязвимости — стандартная боль:
- OWASP Top10 A06:2021 “Vulnerable and Outdated Components”
  https://owasp.org/Top10/en/A06_2021-Vulnerable_and_Outdated_Components/

3) Pre-revenue/starter assets уже торгуются (рынок признаёт класс актива):
- Flippa pricing rules for “New/Starter/Non-Revenue Generating Assets”
  https://support.flippa.com/hc/en-us/articles/12856932906767-Listing-sale-pricing

4) Лицензии можно “приземлить” в проверяемые правила:
- MIT license summary: https://choosealicense.com/licenses/mit/
- Каталог лицензий: https://choosealicense.com/licenses/
```

---

## Шаг 6. Проверка связности (цепочка: Problem → Customer → Market → Why now)

```text name=06-logic-check.txt
Проверка логики:

Problem:
- Продавцы не могут монетизировать незавершенный труд
- Покупатели боятся покупать чужой код без аудита

Customer:
- Платящий сегмент: “Охотники за быстрым стартом”
- Поставщики: “Разочарованные инди-хакеры”

Market:
- TAM: широкий рынок платной разработки/цифровых услуг
- SAM: ниша “starter/non-revenue assets” (как класс)
- SOM: bottom-up через сделки * чек * комиссия

Why now:
- рост количества разработчиков и кода
- рост важности dependency/security аудита
- наличие сформированного поведения “покупать pre-revenue assets”
- понятные рамки лицензий → можно встроить доверие
```

---

# Итоговые артефакты (как сдавать)

1) **Презентация 4–6 слайдов** — текст выше уже в формате “слайды”.  
2) **Таблица TAM/SAM/SOM** — можно оформить отдельным листом (я могу собрать аккуратную таблицу в виде Excel-структуры).  
3) **Список источников** — ссылки внизу слайдов + общий список.

---

## Источники (единый список ссылок для конца презентации)
```text name=07-references-final.txt
1) GitHub Octoverse 2025 (Oct 28 2025, updated Jan 30 2026):
https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/

2) Flippa Help Center — Listing sale pricing (May 29, 2025):
https://support.flippa.com/hc/en-us/articles/12856932906767-Listing-sale-pricing

3) OWASP Top 10 A06:2021 — Vulnerable and Outdated Components:
https://owasp.org/Top10/en/A06_2021-Vulnerable_and_Outdated_Components/

4) Choose a License (GitHub) — MIT License:
https://choosealicense.com/licenses/mit/

5) Choose a License (GitHub) — Licenses catalog:
https://choosealicense.com/licenses/

6) Fiverr — Full Year 2024 results (Feb 2025 публикация IR-страницы):
https://investors.fiverr.com/news-releases/news-release-details/fiverr-announces-fourth-quarter-and-full-year-2024-results/
```

---

## Чтобы сделать доклад ещё “объёмнее” и максимально “как у отличника”
Скажи, пожалуйста, 2 решения (выбери вариант):
1) **География SAM/SOM**: (A) worldwide, (B) US+EU, (C) RU+CIS  
2) **Ценовой сегмент лотов**: (A) до $1k, (B) $1k–$10k, (C) смешанный

После этого я:
- сделаю **отдельный Шаг “Таблица расчёта TAM/SAM/SOM”** с 2 сценариями (консервативный/базовый),
- добавлю **короткую “защиту 2–3 минуты”** и **расширенную 5–6 минут** (часто просят на паре).
