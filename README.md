# InPogodynka
Chrome extension displaying InPost Paczkomat weather and air-quality data.

# InPogodynka 🌡️📦

**InPogodynka** to rozszerzenie Chrome, które zmienia stronę nowej karty w panel z aktualnymi danymi środowiskowymi pobieranymi z wybranego Paczkomatu InPost.

Rozszerzenie pobiera dane z endpointu InPost, zapisuje lokalną historię pomiarów, wyświetla wykresy oraz automatycznie pobiera opis lokalizacji Paczkomatu ze strony InPost.

> Projekt jest prywatnym narzędziem hobbystycznym i nie jest oficjalnym produktem InPost.

---

## Funkcje

- Aktualna temperatura
- Wilgotność powietrza
- Ciśnienie atmosferyczne
- PM1
- PM2.5
- PM4
- PM10
- NO₂ i O₃ — jeśli Paczkomat zwraca te sensory
- Ocena EAQI dla PM2.5
- PAQI
- Wykres historii pomiarów
- Historia ostatnich 24 odczytów
- Automatyczne odświeżanie danych co około godzinę
- Ręczne odświeżenie danych
- Konfiguracja dowolnego Paczkomatu przez URL, kod i Point ID
- Automatyczny opis lokalizacji z `meta name="description"` strony Paczkomatu
- Lokalny cache — dane nie są zapisywane na zewnętrznym serwerze

---

## Przykład działania

Dla Paczkomatu:

```text
RWL01BAPP
```

panel może wyświetlać:

```text
RWL01BAPP · dane z InPost

Paczkomat InPost RWL01BAPP znajduje się w miejscowości Radziwiłłów,
województwo mazowieckie pod adresem ul. Warszawska 37, Market Dino.
```

oraz bieżące wartości temperatury, wilgotności, ciśnienia i jakości powietrza.

---

## Wymagania

- Google Chrome lub przeglądarka oparta na Chromium
- Włączony tryb deweloperski rozszerzeń
- Internet
- Poprawny URL Paczkomatu InPost
- Kod Paczkomatu
- Point ID Paczkomatu

---

## Instalacja

1. Pobierz lub sklonuj repozytorium:

   ```bash
   git clone https://github.com/TWOJ-LOGIN/inpogodynka.git
   ```

2. Otwórz Chrome i przejdź do:

   ```text
   chrome://extensions
   ```

3. Włącz **Tryb deweloperski** w prawym górnym rogu.

4. Kliknij:

   ```text
   Wczytaj rozpakowane
   ```

5. Wskaż folder projektu — ten, który zawiera plik:

   ```text
   manifest.json
   ```

6. Kliknij ikonę InPogodynka na pasku rozszerzeń.

7. Ustaw dane Paczkomatu:

   ```text
   URL strony Paczkomatu
   Kod Paczkomatu
   Point ID
   ```

8. Kliknij:

   ```text
   Zapisz i pobierz dane
   ```

9. Otwórz nową kartę w Chrome.

---

## Konfiguracja Paczkomatu

Rozszerzenie wymaga trzech wartości:

| Pole | Przykład | Opis |
|---|---|---|
| URL | `https://inpost.pl/paczkomat-...` | Adres strony wybranego Paczkomatu na inpost.pl |
| Kod Paczkomatu | `RWL01BAPP` | Kod identyfikujący Paczkomat |
| Point ID | `60545` | Numeryczny identyfikator używany przez endpoint danych InPost |

### Przykładowa konfiguracja

```text
URL:
[https://inpost.pl/paczkomat-radziwillow-rwl01bapp-warszawska-paczkomaty-mazowieckie](https://inpost.pl/paczkomat-radziwillow-rwl01bapp-warszawska-paczkomaty-mazowieckie)

Kod:
RWL01BAPP

Point ID:
60545
```

---

## Jak znaleźć Point ID

1. Otwórz stronę wybranego Paczkomatu na `inpost.pl`.
2. Naciśnij `F12`.
3. Otwórz zakładkę **Network**.
4. Odśwież stronę.
5. W filtrze wyszukaj:

   ```text
   air_index_level
   ```

6. Poszukaj żądania w stylu:

   ```text
   https://inpost.pl/shipx-point-data/60545/RWL01BAPP/air_index_level
   ```

7. Liczba pomiędzy:

   ```text
   shipx-point-data/
   ```

   a kodem Paczkomatu to Point ID:

   ```text
   60545
   ```

---

## Automatyczne odświeżanie

Rozszerzenie używa mechanizmu:

```javascript
chrome.alarms
```

Dane są odświeżane mniej więcej co 60 minut:

```javascript
const INTERVAL = 60;
```

Automatyczne pobieranie działa w tle, gdy Chrome jest uruchomiony. Nie musisz mieć otwartej strony nowej karty InPogodynka.

### Ważne

Chrome i system operacyjny mogą opóźnić wykonanie alarmu, np. gdy:

- komputer jest uśpiony,
- Chrome jest całkowicie zamknięty,
- system ogranicza pracę procesów w tle.

Przycisk **Odśwież** na stronie InPogodynka wykonuje pobranie ręcznie i od razu.

---

## Dane i cache

Rozszerzenie zapisuje dane lokalnie w:

```javascript
chrome.storage.local
```

Nie używa zewnętrznej bazy danych ani własnego serwera.

### Klucze pamięci

| Klucz | Zawartość |
|---|---|
| `weather_cache` | Ostatni pobrany pomiar, konfiguracja Paczkomatu i opis lokalizacji |
| `weather_history` | Maksymalnie 24 ostatnie odczyty używane na wykresie |
| `last_code` | Kod Paczkomatu użyty do wykrywania zmiany lokalizacji |

### Przykładowy cache

```javascript
{
  data: {
    temperature: 12.4,
    pressure: 1018.2,
    humidity: 79,
    pm1: 4.0,
    pm25: 8.3,
    pm4: 10.1,
    pm10: 14.2,
    no2: null,
    o3: null
  },
  fetchedAt: 1791061440000,
  code: "RWL01BAPP",
  pointId: 60545,
  location: {
    description: "Paczkomat InPost RWL01BAPP znajduje się w miejscowości Radziwiłłów, województwo mazowieckie pod adresem ul. Warszawska 37, Market Dino."
  }
}
```

### Historia wykresu

Każdy rekord historii zawiera dane pogodowe oraz znacznik czasu:

```javascript
{
  temperature: 12.4,
  pressure: 1018.2,
  humidity: 79,
  pm25: 8.3,
  pm10: 14.2,
  ts: 1791061440000
}
```

Historia jest ograniczona do 24 ostatnich wpisów:

```javascript
history = history.slice(-24);
```

Jeśli zmienisz kod Paczkomatu, historia jest resetowana, aby nie mieszać pomiarów z różnych lokalizacji.

---

## Opis lokalizacji

Rozszerzenie pobiera stronę Paczkomatu i odczytuje zawartość:

```html
<meta name="description" content="...">
```

Przykładowo:

```html
<meta
  name="description"
  content="Paczkomat InPost RWL01BAPP znajduje się w miejscowości Radziwiłłów, województwo mazowieckie pod adresem ul. Warszawska 37, Market Dino."
>
```

Opis jest zapisywany jako:

```javascript
location.description
```

i wyświetlany pod kodem Paczkomatu na stronie nowej karty.

---

## Struktura projektu

```text
inpogodynka/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── newtab.html
├── newtab.css
├── newtab.js
├── chart.js
├── icon16.jpg
├── icon32.jpg
├── icon48.jpg
└── icon128.jpg
```

### Najważniejsze pliki

| Plik | Odpowiedzialność |
|---|---|
| `manifest.json` | Konfiguracja rozszerzenia Manifest V3 |
| `background.js` | Pobieranie danych InPost, cache, historia i automatyczne odświeżanie |
| `popup.html` | Formularz ustawień Paczkomatu |
| `popup.js` | Zapis URL, kodu i Point ID |
| `newtab.html` | Strona nowej karty |
| `newtab.css` | Wygląd panelu |
| `newtab.js` | Prezentacja danych, EAQI, PAQI i wykres |
| `chart.js` | Lokalna biblioteka Chart.js |
| `icon*.jpg` | Ikony rozszerzenia dla różnych rozmiarów |

---

## Architektura

```text
Użytkownik
    │
    ▼
Popup ustawień
    │ zapisuje URL / kod / Point ID
    ▼
chrome.storage.local
    │
    ▼
background.js
    │
    ├── POST: endpoint danych powietrza InPost
    ├── GET: strona Paczkomatu InPost
    ├── odczyt meta description
    ├── zapis weather_cache
    └── zapis weather_history
    │
    ▼
newtab.js
    │
    ├── odczyt cache
    ├── renderowanie kafelków
    ├── renderowanie opisu lokalizacji
    └── renderowanie wykresu Chart.js
```

---

## Endpoint danych

Rozszerzenie korzysta z endpointu InPost w postaci:

```text
[https://inpost.pl/shipx-point-data/{POINT_ID}/{KOD_PACZKOMATU}/air_index_level](https://inpost.pl/shipx-point-data/{POINT_ID}/{KOD_PACZKOMATU}/air_index_level)
```

Przykład:

```text
[https://inpost.pl/shipx-point-data/60545/RWL01BAPP/air_index_level](https://inpost.pl/shipx-point-data/60545/RWL01BAPP/air_index_level)
```

Żądanie jest wykonywane metodą:

```text
POST
```

Odpowiedź zawiera listę sensorów, np.:

```text
TEMPERATURE:12.4
HUMIDITY:79
PRESSURE:1018.2
PM25:8.3
PM10:14.2
```

---

## Rozwiązywanie problemów

### Brak danych

Sprawdź:

- czy Point ID jest wpisane,
- czy kod Paczkomatu jest poprawny,
- czy adres URL strony Paczkomatu jest poprawny,
- czy Chrome ma dostęp do internetu,
- czy rozszerzenie zostało odświeżone po zmianie plików.

Otwórz:

```text
chrome://extensions
```

i kliknij ikonę odświeżenia przy rozszerzeniu.

### Błąd `Brak Point ID`

Otwórz ustawienia rozszerzenia i wpisz poprawną wartość Point ID.

Dla `RWL01BAPP`:

```text
60545
```

### Błąd `InPost HTTP 403`

InPost może odrzucić żądanie. Sprawdź:

- poprawność Point ID,
- poprawność kodu Paczkomatu,
- aktualność endpointu InPost,
- uprawnienie hosta w `manifest.json`:

```json
"host_permissions": [
  "[https://inpost.pl/*](https://inpost.pl/*)"
]
```

### Brak opisu lokalizacji

Pogoda może działać, nawet jeżeli opis lokalizacji nie zostanie pobrany.

Sprawdź, czy strona Paczkomatu nadal zawiera:

```html
<meta name="description" content="...">
```

W razie braku meta description rozszerzenie używa alternatywnych danych adresowych ze strony.

### Wykres nie wyświetla się

Sprawdź, czy plik:

```text
chart.js
```

znajduje się w tym samym folderze co `newtab.html` i ma rozmiar około 208 KB.

W `newtab.html` kolejność skryptów musi być następująca:

```html
<script src="chart.js"></script>
<script src="newtab.js"></script>
```

---

## Prywatność

- Rozszerzenie nie przesyła danych do własnego serwera.
- Dane są zapisywane lokalnie przez `chrome.storage.local`.
- Rozszerzenie wysyła żądania wyłącznie do domeny `inpost.pl`.
- Ustawienia Paczkomatu oraz historia pomiarów pozostają w przeglądarce użytkownika.

---

## Licencja

Projekt jest udostępniony do prywatnego i edukacyjnego wykorzystania.

Biblioteka Chart.js jest udostępniana na licencji MIT. Szczegóły znajdują się w pliku biblioteki oraz na stronie projektu Chart.js.

---

## Zastrzeżenie

Projekt nie jest powiązany z InPost. Endpointy, format odpowiedzi oraz zawartość stron InPost mogą się zmienić, co może wymagać aktualizacji rozszerzenia.

## Postaw kawę ☕

Jeśli InPogodynka okazała się przydatna albo po prostu spodobał Ci się projekt, możesz postawić mi kawę:

[![Postaw kawę](https://buycoffee.to/assets/img/button-buycoffe.png)](https://buycoffee.to/twydra)

➡️ [https://buycoffee.to/twydra](https://buycoffee.to/twydra)
