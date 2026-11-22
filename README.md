# Smart Voyager

Smart Voyager to aplikacja webowa i mobilna do planowania podróży. Użytkownik podaje start, cel, budżet i zainteresowania. Serwer układa punkty trasy wzdłuż drogi samochodowej i prosi model Groq o atrakcje w miejscowościach leżących na tej drodze.

## Technologie

* **Backend:** Node.js, Express, JWT, bcrypt, MongoDB Atlas, Mongoose
* **Web:** React, TypeScript, Vite, Tailwind, Leaflet
* **Mobile:** React Native, Expo SDK 54, TypeScript, Zustand, mapy systemowe, lektor (`expo-speech`)
* **Trasa i AI:** OpenStreetMap (Nominatim, OSRM) oraz Groq (`openai/gpt-oss-120b`)

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
4. Groq proponuje atrakcje w tych miejscowościach. Model to `openai/gpt-oss-120b`.
5. Serwer zostawia propozycje blisko drogi, układa je od startu do celu i zapisuje tyle punktów, ile ustawiono na suwaku.

Suwak zasięgu eksploracji zmienia dopuszczalne zboczenie z drogi: około 5 km przy wartości 0 i około 30 km przy wartości 10. Pierwszy punkt to start, ostatni to cel. Usunięcie wycieczki kasuje też jej punkty.

Generowanie trwa zwykle kilkanaście do trzydziestu sekund, bo OpenStreetMap pozwala na jedno zapytanie na sekundę. Darmowe konto Groq ma limit 8000 tokenów na minutę. Przy dużej liczbie przystanków kolejne generowanie trzeba powtórzyć po krótkiej przerwie.

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
| GET | `/api/users` | Lista użytkowników | admin |
| GET | `/api/users/stats` | Liczba użytkowników i wycieczek | admin |
| PUT | `/api/users/:id/role` | Zmiana roli | admin |
| DELETE | `/api/users/:id` | Usunięcie konta wraz z wycieczkami i punktami | admin |
