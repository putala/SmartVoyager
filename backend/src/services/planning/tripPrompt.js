// Budowa polecenia dla modelu językowego. Funkcje są czyste: te same dane dają ten sam tekst.

const SYSTEM_PROMPT = 'Jesteś precyzyjnym asystentem Voyager AI. Twoim zadaniem jest dostarczenie danych geograficznych w formacie JSON.';

const TRAVEL_STYLE_LABELS = {
    avoidPaidAttractions: 'unikaj płatnych atrakcji',
    onlyHiddenGems: 'preferuj mniej znane miejsca zamiast najpopularniejszych',
    kidFriendly: 'miejsca odpowiednie dla dzieci',
    disabilityAccess: 'miejsca dostępne dla osób z niepełnosprawnościami',
    preferWalking: 'krótkie dojścia piesze od parkingu',
};

const OSM_TYPE_LABELS = {
    museum: 'muzeum',
    attraction: 'atrakcja',
    castle: 'zamek/pałac',
    gallery: 'galeria',
    viewpoint: 'punkt widokowy',
    monument: 'pomnik',
    memorial: 'miejsce pamięci',
    zoo: 'zoo',
    theme_park: 'park rozrywki',
    artwork: 'dzieło sztuki',
};

const describeInterests = (preferences) => preferences?.interests?.join(', ') || 'ogólne zwiedzanie';

const describeTravelStyle = (preferences) => {
    const style = preferences?.travelStyle || {};
    const rules = Object.keys(TRAVEL_STYLE_LABELS).filter(key => style[key]).map(key => TRAVEL_STYLE_LABELS[key]);
    const notes = preferences?.personalNotes?.trim();
    if (notes) rules.push(`notatka użytkownika: ${notes}`);
    return rules.length > 0 ? rules.join('; ') : 'brak';
};

const describeIntensity = (intensity) => {
    if (intensity <= 3) return 'Tempo bardzo spokojne, 1-2 główne atrakcje z czasem na relaks.';
    if (intensity <= 7) return 'Tempo standardowe, zbalansowane zwiedzanie.';
    return 'Tempo ekstremalne, krótkie, intensywne postoje i duża dynamika.';
};

const describeBudget = (budget) => (budget > 0 ? `${budget} PLN` : 'budżet ekonomiczny');

const describeSpecialRequests = (description) => (description
    ? `DODATKOWE WYTYCZNE UŻYTKOWNIKA (PRIORYTET): ${description}`
    : 'Brak dodatkowych życzeń.');

// Cała odpowiedź musi zmieścić się w limicie tokenów, więc przy wielu punktach opisy są krótsze
const descriptionSentences = (totalPoints) => {
    if (totalPoints <= 10) return '8-10';
    if (totalPoints <= 16) return '6-8';
    return '5-6';
};

const describeDescriptionRules = (totalPoints) => `W polu "description" napisz ${descriptionSentences(totalPoints)} pełnych zdań, które pozwolą poznać miejsce przed przyjazdem: czym jest, krótka historia (daty, postacie, wydarzenia), co konkretnie warto zobaczyć, ciekawostka, ile czasu zaplanować i czy wstęp jest płatny oraz dlaczego pasuje do zainteresowań użytkownika. Pisz rzeczowo jak przewodnik. Nie pisz o kolejności punktów, rozłożeniu na trasie, odległości od drogi, dalszej jeździe ani o pozostałym budżecie wycieczki. Dla startu i celu opisz samo miejsce.`;

const describeRoad = (towns) => (towns.length > 0
    ? `Droga samochodowa prowadzi kolejno przez: ${towns.join(', ')}. Wybieraj atrakcje w tych miejscowościach albo tuż obok nich, w tej kolejności.`
    : '');

const describeCatalog = (catalog) => {
    if (catalog.length === 0) return '';
    const lines = catalog.map(place => `- ${place.name} (${place.town}, ${OSM_TYPE_LABELS[place.type] || place.type})`);
    return `
        PRAWDZIWE ATRAKCJE Z OPENSTREETMAP (w kolejności przejazdu):
        ${lines.join('\n        ')}
        Propozycje po drodze wybieraj PRZEDE WSZYSTKIM z tej listy, dopasowując je do zainteresowań i budżetu, a nazwę przepisuj dokładnie. Punkty mają być rozłożone równomiernie na całej trasie, najwyżej 2 z jednej miejscowości: jeśli na jakimś odcinku drogi lista nie ma nic odpowiedniego, zaproponuj tam własne, znane miejsce z miejscowości na tym odcinku.
`;
};

/**
 * Pełne polecenie dla modelu na podstawie wycieczki, profilu użytkownika i danych z mapy
 */
const buildTripPrompt = ({ trip, preferences, settings, towns, catalog }) => {
    const origin = trip.origin.address;
    const destination = trip.destination.address;
    const totalPoints = settings.candidateCount + 2;

    return `Jesteś profesjonalnym przewodnikiem Voyager AI. 
        Zaplanuj trasę z: ${origin} do: ${destination}. ${describeRoad(towns)}
        Zwróć uwagę jakie miejscowości leżą na drodze między tymi lokalizacjami, aby na całej trasie znaleźć coś ciekawego.
        ${describeCatalog(catalog)}
        PARAMETRY LOGICZNE:
        - GEOGRAFIA: Punkty pośrednie MUSZĄ leżeć przy głównej drodze z ${origin} do ${destination}, najdalej ${settings.maxDetourKm} km od niej. Nie proponuj miejsc w innych kierunkach ani poza tym pasem.
        - DYNAMIKA: ${describeIntensity(settings.intensity)}
        - LICZBA PUNKTÓW: DOKŁADNIE ${totalPoints} (start, ${settings.candidateCount} propozycji po drodze, cel).
        - ZAINTERESOWANIA: ${describeInterests(preferences)}.
        - BUDŻET: ${describeBudget(trip.budget)}. Dobieraj miejsca, których koszt zwiedzania mieści się w budżecie.
        - STYL PODRÓŻY: ${describeTravelStyle(preferences)}.
        - KONIECZNE WYTYCZNE: ${describeSpecialRequests(trip.description)}

        WYMAGANIA TECHNICZNE:
        1. Każde miejsce MUSI istnieć w rzeczywistości. W polu "name" podaj krótką, oficjalną nazwę obiektu, pod którą jest na mapie (bez dopisków i myślników).
        2. Podaj współrzędne geograficzne (lat, lng) jako float.
        3. Odpowiedź musi być WYŁĄCZNIE obiektem JSON.
        4. Pierwszym punktem trasy ma być ${origin}.
        5. Ostatnim punktem trasy ma być ${destination}.
        6. Punkty ułóż w kolejności przejazdu. Każdy kolejny punkt jest bliżej celu niż poprzedni, bez cofania się.
        7. W polu "address" podaj ulicę (jeśli ją znasz) i miejscowość.
        8. ${describeDescriptionRules(totalPoints)}

        STRUKTURA JSON:
        {
          "waypoints": [
            {
              "name": "Pełna nazwa",
              "address": "Ulica, Miasto",
              "description": "Opis miejsca zgodnie z punktem 8.",
              "location": { "lat": 0.0, "lng": 0.0 },
              "order_index": 1
            }
          ]
        }`;
};

module.exports = { SYSTEM_PROMPT, buildTripPrompt, describeTravelStyle, describeIntensity };
