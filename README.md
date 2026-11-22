# Smart Voyager

Smart Voyager to aplikacja webowa i mobilna do planowania podróży. Użytkownik podaje start, cel, budżet i zainteresowania. Serwer pobiera z OpenStreetMap prawdziwe atrakcje leżące przy drodze samochodowej, a model Groq wybiera z nich te, które pasują do zainteresowań i budżetu. Położenie, godziny otwarcia i strony www pochodzą z OpenStreetMap. Plany są zapisywane w MongoDB, więc ta sama wycieczka jest dostępna w przeglądarce i na telefonie.

## Technologie

* **Backend:** Node.js, Express, JWT, bcrypt, MongoDB Atlas, Mongoose
* **Web:** React, TypeScript, Vite, Tailwind, Leaflet
* **Mobile:** React Native, Expo SDK 54, TypeScript, Zustand, mapy systemowe, lektor (`expo-speech`)
* **Trasa i AI:** OpenStreetMap (Nominatim, OSRM) oraz Groq (`openai/gpt-oss-120b`)
* **Bezpieczeństwo:** helmet, express-rate-limit

## Struktura

* `/backend` — API
* `/web` — aplikacja w przeglądarce
* `/mobile` — aplikacja na telefon

## Konfiguracja

W `backend/.env` (plik nie trafia do gita):

```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
GROQ_API_KEY=gsk_...
```

Bez `JWT_SECRET` serwer nie wystartuje. Opcjonalnie `CORS_ORIGIN` (adresy po przecinku, np. `http://localhost:5173`) ogranicza, z jakich stron przeglądarka może wołać API. Bez tej zmiennej API przyjmuje żądania z każdego adresu.

`MONGO_URI` to connection string klastra z MongoDB Atlas. `GROQ_API_KEY` tworzy się w [console.groq.com](https://console.groq.com) w zakładce API Keys. Klucz Groq wygasa, więc po błędzie generowania trzeba sprawdzić datę w konsoli i wkleić nowy.

Web łączy się z `http://localhost:5000/api` (`web/src/api/axiosInstance.ts`). Telefon łączy się z adresem komputera w sieci lokalnej, ustawionym w `mobile/src/api/axiosInstance.ts`. Przy innym adresie IP komputera tę linijkę trzeba zmienić. Telefon i komputer muszą być w tej samej sieci routera. `localhost` na telefonie oznacza sam telefon.

## Uruchomienie

W trzech osobnych terminalach, w podanej kolejności.

### Backend

```powershell
cd backend
npm install
npm run dev
```

Serwer nasłuchuje na porcie 5000. Dobry start kończy się komunikatem `MongoDB connected successfully`.

Konto administratora:

```powershell
cd backend
npm run seed:admin
```

Skrypt tworzy użytkownika `superadmin@voyager.pl`. Hasło jest w pliku `backend/seedAdmin.js`.

### Web

```powershell
cd web
npm install
npm run dev
```

Vite podaje adres, zwykle `http://localhost:5173`.

### Mobile

Na telefonie zainstaluj Expo Go w wersji dla SDK 54. Aplikacja ze sklepu jest nowsza i tej wersji projektu nie otworzy. Starszą paczkę na Androida pobiera się z [expo.dev/go?sdkVersion=54&platform=android&device=true](https://expo.dev/go?sdkVersion=54&platform=android&device=true).

```powershell
cd mobile
npm install
npx expo start --offline
```

Flaga `--offline` pomija logowanie do Expo. W Expo Go zeskanuj kod QR. Wygląd aplikacji jest w ustawieniach. Na ekranie wycieczki dotknięcie punktu czyta jego opis, a drugie dotknięcie tego samego punktu zatrzymuje lektor.

## Generowanie punktów

`POST /api/trips/:id/generate` działa tak:

1. Nominatim zamienia adres startu i celu na współrzędne.
2. OSRM zwraca przebieg drogi samochodowej.
3. Nominatim podaje miejscowości leżące na tej drodze.
4. Dla tych miejscowości serwer pobiera z OpenStreetMap atrakcje i muzea (najwyżej 3 na miejscowość, najpierw te z godzinami otwarcia) i odrzuca te, które leżą za daleko od drogi.
5. Groq (`openai/gpt-oss-120b`) dostaje tę listę razem z zainteresowaniami, budżetem i stylem podróży z profilu i wybiera z niej miejsca. Na odcinkach bez atrakcji z listy może zaproponować własne.
6. Każda propozycja spoza listy jest szukana w OpenStreetMap. Znaleziona dostaje prawdziwe współrzędne, godziny otwarcia i stronę www oraz znacznik `verified`.
7. Serwer wybiera punkty równo rozłożone wzdłuż drogi, z pierwszeństwem dla potwierdzonych, układa je od startu do celu i zapisuje tyle punktów, ile ustawiono na suwaku.

Kod jest podzielony według odpowiedzialności:

* `services/aiService.js` — przebieg generowania i zapytanie do Groq,
* `services/mapService.js` — komunikacja z Nominatim i OSRM oraz geometria trasy,
* `services/planning/attractionCatalog.js` — katalog atrakcji przy drodze,
* `services/planning/tripPrompt.js` — treść polecenia dla modelu,
* `services/planning/placeVerifier.js` — wyszukiwanie propozycji w OpenStreetMap,
* `services/planning/stopSelector.js` — wybór punktów równo rozłożonych na trasie.

Moduły w `planning/` poza wyszukiwaniem w mapie to czyste funkcje, więc można je testować bez sieci i bez klucza Groq.

Suwak zasięgu eksploracji zmienia dopuszczalne zboczenie z drogi: około 5 km przy wartości 0 i około 30 km przy wartości 10. Pierwszy punkt to start, ostatni to cel. Usunięcie wycieczki kasuje też jej punkty.

Godziny otwarcia i strona www pojawiają się przy punkcie tylko wtedy, gdy są wpisane w OpenStreetMap. Dla mniejszych obiektów często ich brakuje.

Generowanie trwa zwykle 30–60 sekund, bo OpenStreetMap pozwala na jedno zapytanie na sekundę. Darmowe konto Groq ma limit 8000 tokenów na minutę. Przy dużej liczbie przystanków kolejne generowanie trzeba powtórzyć po krótkiej przerwie.

## Synchronizacja

Dane są tylko na serwerze, a obie aplikacje czytają je przez API. Web odświeża listę i szczegóły wycieczki po powrocie do karty przeglądarki. Aplikacja mobilna odświeża je przy wejściu na ekran i po powrocie aplikacji z tła. Zmiana zrobiona na telefonie jest więc widoczna w przeglądarce bez przeładowania strony i odwrotnie.

## Bezpieczeństwo i dane użytkownika

* Hasła są hashowane bcryptem, sesja to token JWT podpisany kluczem z `.env`.
* Logowanie nie zdradza, czy konto o danym e-mailu istnieje.
* Logowanie i rejestracja mają limit 20 prób na 15 minut z jednego adresu IP.
* `helmet` ustawia nagłówki bezpieczeństwa HTTP. Błędy nie pokazują stosu wywołań poza `NODE_ENV=development`.
* Pola `_id`, `user`, `trip` i znaczniki czasu nie są przyjmowane z żądań, więc nie da się przepisać cudzej wycieczki ani punktu.
* Linki z OpenStreetMap są przepuszczane tylko jako `http`/`https`.
* Użytkownik może pobrać wszystkie swoje dane (JSON) i usunąć konto razem z wycieczkami po podaniu hasła. Zakładka profilu w webie ma obie opcje, aplikacja mobilna usuwanie konta.

## API

Żądania poza rejestracją i logowaniem wymagają nagłówka `Authorization: Bearer <token>`.

### Uwierzytelnianie (`/api/auth`)

| Metoda | Endpoint | Opis | Dostęp |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Rejestracja | publiczny |
| POST | `/api/auth/login` | Logowanie, zwraca JWT | publiczny |
| GET | `/api/auth/profile` | Dane zalogowanego użytkownika | użytkownik |
| PUT | `/api/auth/profile` | Aktualizacja profilu | użytkownik |

### Wycieczki (`/api/trips`)

| Metoda | Endpoint | Opis | Dostęp |
| :--- | :--- | :--- | :--- |
| GET | `/api/trips` | Własne wycieczki z punktami | użytkownik |
| POST | `/api/trips` | Nowa wycieczka | użytkownik |
| GET | `/api/trips/:id` | Szczegóły wycieczki | właściciel lub admin |
| PUT | `/api/trips/:id` | Edycja wycieczki | właściciel lub admin |
| DELETE | `/api/trips/:id` | Usunięcie wycieczki i jej punktów | właściciel lub admin |
| POST | `/api/trips/:id/generate` | Generowanie punktów trasy | właściciel lub admin |
| GET | `/api/trips/admin/all` | Wszystkie wycieczki | admin |
| GET | `/api/trips/admin/waypoints` | Wszystkie punkty | admin |

### Punkty trasy

| Metoda | Endpoint | Opis | Dostęp |
| :--- | :--- | :--- | :--- |
| GET | `/api/trips/:tripId/waypoints` | Punkty wycieczki | właściciel lub admin |
| POST | `/api/trips/:tripId/waypoints` | Dodanie punktu | właściciel lub admin |
| DELETE | `/api/trips/:tripId/waypoints` | Usunięcie wszystkich punktów wycieczki | właściciel lub admin |
| PUT | `/api/trips/waypoints/:id` | Edycja punktu, na przykład oznaczenie jako odwiedzony | właściciel lub admin |
| DELETE | `/api/trips/waypoints/:id` | Usunięcie jednego punktu | właściciel lub admin |

### Użytkownicy (`/api/users`)

| Metoda | Endpoint | Opis | Dostęp |
| :--- | :--- | :--- | :--- |
| PUT | `/api/users/profile` | Edycja własnego profilu | użytkownik |
| PUT | `/api/users/change-password` | Zmiana własnego hasła | użytkownik |
| GET | `/api/users/me/export` | Pobranie wszystkich własnych danych (JSON) | użytkownik |
| DELETE | `/api/users/me` | Usunięcie własnego konta; w treści `{ "password": "..." }` | użytkownik |
| GET | `/api/users` | Lista użytkowników | admin |
| GET | `/api/users/stats` | Liczba użytkowników i wycieczek | admin |
| PUT | `/api/users/:id/role` | Zmiana roli | admin |
| DELETE | `/api/users/:id` | Usunięcie konta wraz z wycieczkami i punktami | admin |
