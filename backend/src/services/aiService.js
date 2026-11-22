const Groq = require("groq-sdk");
const mapService = require('./mapService');

// Ta zmienna będzie przechowywać klienta
let client = null;

// Ta funkcja pozwala testom "wstrzyknąć" udawanego klienta
exports.setClient = (mockClient) => {
    client = mockClient;
};

const getClient = () => {
    if (!client) {
        client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return client;
};

// Model podaje nazwy w formie „Muzeum Regionalne w Myślenicach” albo z dopiskami („Zamek X – dziedziniec”),
// a OSM zna „Muzeum Regionalne” w miejscowości „Myślenice”. Odmienionej miejscowości Nominatim nie rozpoznaje,
// więc drugie zapytanie to sama nazwa obiektu + miejscowość z adresu (w mianowniku)
const verifyInOsm = async (wp, box) => {
    const town = (wp.address?.split(',').map(part => part.trim()).filter(Boolean).pop() || '')
        .replace(/\s*\(.*$/, '')
        .trim();
    const strippedName = wp.name
        .split(/\s[–—-]\s|\s*\(/)[0]
        .replace(/\s+(w|we|na|pod|nad|koło|przy|k\.)\s+\p{Lu}.*$/u, '')
        .replace(/\s+(pw\.|p\.w\.|pod wezwaniem)\s+/giu, ' ')
        .trim();
    // Jedno słowo („Muzeum”) pasowałoby do dowolnego muzeum w mieście
    const shortName = strippedName.split(/\s+/).length >= 2 ? strippedName : wp.name;
    const queries = [...new Set([
        wp.address ? `${wp.name}, ${wp.address}` : wp.name,
        town ? `${shortName}, ${town}` : shortName,
    ])];

    for (const query of queries) {
        const place = await mapService.findPlace(query, box);
        if (place) return place;
    }
    return null;
};

const normalizeName = (name) => (name || '').toLowerCase().replace(/[–—‑]/g, '-').replace(/\s+/g, ' ').trim();

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

const CATALOG_CATEGORIES = ['attraction', 'museum'];
const CATALOG_MAX_TOWNS = 8;
const CATALOG_PER_TOWN = 3;
const CATALOG_MAX_PLACES = 40;

// Pobiera z OSM atrakcje w miejscowościach pośrednich i zostawia tylko te przy drodze, w kolejności przejazdu
const collectAttractions = async (roadLine, towns, tolerance) => {
    const box = mapService.boundingBox(roadLine, tolerance);
    const middleTowns = pickEvenly(towns.slice(1, -1), CATALOG_MAX_TOWNS);
    const seen = new Set();
    const places = [];

    for (const town of middleTowns) {
        const inTown = [];
        for (const category of CATALOG_CATEGORIES) {
            for (const place of await mapService.attractionsInTown(town, category, box)) {
                const key = place.osmId || normalizeName(place.name);
                if (seen.has(key)) continue;
                seen.add(key);
                const position = mapService.routePosition(place.location, roadLine);
                if (position.progress > 0.02 && position.progress < 0.98 && position.offsetKm <= tolerance) {
                    inTown.push({ ...place, progress: position.progress });
                }
            }
        }
        // Duże miasto nie może zdominować listy; najpierw obiekty z godzinami otwarcia lub stroną www
        const richness = place => (place.openingHours ? 2 : 0) + (place.website ? 1 : 0) + (place.type === 'museum' ? 1 : 0);
        places.push(...inTown.sort((a, b) => richness(b) - richness(a)).slice(0, CATALOG_PER_TOWN));
    }

    return pickEvenly(places.sort((a, b) => a.progress - b.progress), CATALOG_MAX_PLACES);
};

// Kara (w ułamku długości trasy) dla miejsca niepotwierdzonego w OSM: bierzemy je tylko,
// gdy wypełnia lukę na trasie wyraźnie lepiej niż potwierdzone
const UNVERIFIED_PENALTY = 0.05;

// Wybiera `count` kandydatów najbliższych równo rozstawionym miejscom na trasie (progress 0..1)
const pickAlongRoute = (candidates, count) => {
    const pool = [...candidates];
    const chosen = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
        const target = (i + 0.5) / count;
        const cost = c => Math.abs(c.progress - target) + (c.wp.verified ? 0 : UNVERIFIED_PENALTY);
        const best = pool.reduce((a, b) => (cost(b) < cost(a) ? b : a));
        chosen.push(best);
        pool.splice(pool.indexOf(best), 1);
    }
    return chosen;
};

// Wybiera `count` elementów równomiernie rozłożonych na liście
const pickEvenly = (items, count) => {
    if (items.length <= count) return items;
    const step = items.length / count;
    return Array.from({ length: count }, (_, i) => items[Math.floor(i * step + step / 2)]);
};

const toPoint = (wp) => ({
    name: wp.name,
    address: wp.address,
    description: wp.description,
    location: {
        lat: parseFloat(wp.location?.lat || wp.lat),
        lng: parseFloat(wp.location?.lng || wp.lng)
    }
});

const TRAVEL_STYLE_LABELS = {
    avoidPaidAttractions: 'unikaj płatnych atrakcji',
    onlyHiddenGems: 'preferuj mniej znane miejsca zamiast najpopularniejszych',
    kidFriendly: 'miejsca odpowiednie dla dzieci',
    disabilityAccess: 'miejsca dostępne dla osób z niepełnosprawnościami',
    preferWalking: 'krótkie dojścia piesze od parkingu',
};

const describeTravelStyle = (preferences) => {
    const style = preferences?.travelStyle || {};
    const rules = Object.keys(TRAVEL_STYLE_LABELS).filter(key => style[key]).map(key => TRAVEL_STYLE_LABELS[key]);
    const notes = preferences?.personalNotes?.trim();
    if (notes) rules.push(`notatka użytkownika: ${notes}`);
    return rules.length > 0 ? rules.join('; ') : 'brak';
};

exports.generateWaypoints = async (trip, user) => {
    try {
        const groq = getClient();
        console.log(`[Groq AI] Generowanie trasy: ${trip.origin.address} -> ${trip.destination.address}`);

        const interests = user.preferences?.interests?.join(', ') || 'ogólne zwiedzanie';
        const travelStyle = describeTravelStyle(user.preferences);

        const {
            intensity = 5,
            numberOfPoints = 10,
            discoverySpread = 5
        } = trip.aiSettings || {};

        const budget = trip.budget > 0 ? `${trip.budget} PLN` : 'budżet ekonomiczny';

        const specialRequests = trip.description
            ? `DODATKOWE WYTYCZNE UŻYTKOWNIKA (PRIORYTET): ${trip.description}`
            : "Brak dodatkowych życzeń.";

        // 1. Mapa: współrzędne startu i celu, przebieg drogi i miejscowości po drodze
        const startCoords = trip.origin.lat && trip.origin.lng
            ? { lat: trip.origin.lat, lng: trip.origin.lng }
            : await mapService.geocode(trip.origin.address);
        const endCoords = trip.destination.lat && trip.destination.lng
            ? { lat: trip.destination.lat, lng: trip.destination.lng }
            : await mapService.geocode(trip.destination.address);

        const roadLine = startCoords && endCoords ? await mapService.fetchRoadLine(startCoords, endCoords) : null;
        const towns = roadLine ? await mapService.townsAlongRoad(roadLine, 10) : [];

        const middleCount = Math.max(0, numberOfPoints - 2);
        const candidateCount = middleCount > 0 ? middleCount + Math.min(3, Math.ceil(middleCount / 3)) : 0;

        // 2. Interpretacja Rozproszenia (Discovery Spread 0-10)
        const maxDetourKm = 5 + Math.round(discoverySpread * 2.5);
        const tolerance = maxDetourKm * 1.5;

        // Katalog prawdziwych atrakcji z OpenStreetMap w miejscowościach po drodze
        const catalog = roadLine && middleCount > 0 ? await collectAttractions(roadLine, towns, tolerance) : [];
        const catalogByName = new Map(catalog.map(place => [normalizeName(place.name), place]));
        console.log(`[Groq AI] Katalog OpenStreetMap: ${catalog.length} atrakcji przy trasie.`);
        const spreadInstruction = `Punkty pośrednie MUSZĄ leżeć przy głównej drodze z ${trip.origin.address} do ${trip.destination.address}, najdalej ${maxDetourKm} km od niej. Nie proponuj miejsc w innych kierunkach ani poza tym pasem.`;

        // 3. Interpretacja Intensywności (Intensity 0-10)
        let intensityInstruction = "";
        if (intensity <= 3) {
            intensityInstruction = "Tempo bardzo spokojne, 1-2 główne atrakcje z czasem na relaks.";
        } else if (intensity <= 7) {
            intensityInstruction = "Tempo standardowe, zbalansowane zwiedzanie.";
        } else {
            intensityInstruction = "Tempo ekstremalne, krótkie, intensywne postoje i duża dynamika.";
        }

        const roadInfo = towns.length > 0
            ? `Droga samochodowa prowadzi kolejno przez: ${towns.join(', ')}. Wybieraj atrakcje w tych miejscowościach albo tuż obok nich, w tej kolejności.`
            : '';

        const catalogInfo = catalog.length > 0
            ? `
        PRAWDZIWE ATRAKCJE Z OPENSTREETMAP (w kolejności przejazdu):
        ${catalog.map(place => `- ${place.name} (${place.town}, ${OSM_TYPE_LABELS[place.type] || place.type})`).join('\n        ')}
        Propozycje po drodze wybieraj PRZEDE WSZYSTKIM z tej listy, dopasowując je do zainteresowań i budżetu, a nazwę przepisuj dokładnie. Punkty mają być rozłożone równomiernie na całej trasie, najwyżej 2 z jednej miejscowości: jeśli na jakimś odcinku drogi lista nie ma nic odpowiedniego, zaproponuj tam własne, znane miejsce z miejscowości na tym odcinku.
`
            : '';

        const prompt = `Jesteś profesjonalnym przewodnikiem Voyager AI. 
        Zaplanuj trasę z: ${trip.origin.address} do: ${trip.destination.address}. ${roadInfo}
        Zwróć uwagę jakie miejscowości leżą na drodze między tymi lokalizacjami, aby na całej trasie znaleźć coś ciekawego.
        ${catalogInfo}
        PARAMETRY LOGICZNE:
        - GEOGRAFIA: ${spreadInstruction}
        - DYNAMIKA: ${intensityInstruction}
        - LICZBA PUNKTÓW: DOKŁADNIE ${candidateCount + 2} (start, ${candidateCount} propozycji po drodze, cel).
        - ZAINTERESOWANIA: ${interests}.
        - BUDŻET: ${budget}. Dobieraj miejsca, których koszt zwiedzania mieści się w budżecie.
        - STYL PODRÓŻY: ${travelStyle}.
        - KONIECZNE WYTYCZNE: ${specialRequests}

        WYMAGANIA TECHNICZNE:
        1. Każde miejsce MUSI istnieć w rzeczywistości. W polu "name" podaj krótką, oficjalną nazwę obiektu, pod którą jest na mapie (bez dopisków i myślników).
        2. Podaj współrzędne geograficzne (lat, lng) jako float.
        3. Odpowiedź musi być WYŁĄCZNIE obiektem JSON.
        4. Pierwszym punktem trasy ma być ${trip.origin.address}.
        5. Ostatnim punktem trasy ma być ${trip.destination.address}.
        6. Punkty ułóż w kolejności przejazdu. Każdy kolejny punkt jest bliżej celu niż poprzedni, bez cofania się.
        7. W polu "address" podaj ulicę (jeśli ją znasz) i miejscowość.

        STRUKTURA JSON:
        {
          "waypoints": [
            {
              "name": "Pełna nazwa",
              "address": "Ulica, Miasto",
              "description": "Dlaczego pasuje do profilu? Opisz miejsce w około 10 zdaniach.",
              "location": { "lat": 0.0, "lng": 0.0 },
              "order_index": 1
            }
          ]
        }`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Jesteś precyzyjnym asystentem Voyager AI. Twoim zadaniem jest dostarczenie danych geograficznych w formacie JSON.",
                },
                { role: "user", content: prompt },
            ],
            model: "openai/gpt-oss-120b",
            response_format: { type: "json_object" },
            reasoning_effort: "low",
            max_completion_tokens: 7000,
        });

        const responseText = chatCompletion.choices[0]?.message?.content;
        const parsedData = JSON.parse(responseText);
        const waypoints = (parsedData.waypoints || []).map(toPoint);

        if (waypoints.length < 2) {
            throw new Error("AI zwróciło za mało punktów");
        }

        const first = waypoints[0];
        const last = waypoints[waypoints.length - 1];
        if (startCoords) first.location = startCoords;
        if (endCoords) last.location = endCoords;
        if (isNaN(first.location.lat) || isNaN(last.location.lat)) {
            throw new Error("Nie udało się ustalić położenia startu lub celu");
        }

        // 4. Weryfikacja propozycji w OpenStreetMap: prawdziwe położenie, godziny otwarcia, strona www
        const line = roadLine || [first.location, last.location];
        const box = mapService.boundingBox(line, tolerance);

        const middle = [];
        for (const wp of waypoints.slice(1, -1)) {
            const known = catalogByName.get(normalizeName(wp.name));
            const place = known
                ? { location: known.location, openingHours: known.openingHours, website: known.website, osmId: known.osmId }
                : await verifyInOsm(wp, box);
            if (place) {
                middle.push({ ...wp, ...place, verified: true });
            } else if (!isNaN(wp.location.lat) && !isNaN(wp.location.lng)) {
                middle.push({ ...wp, verified: false });
            }
        }

        // 5. Wybór punktów przy drodze, w kolejności przejazdu; zweryfikowane mają pierwszeństwo
        const candidates = middle.map(wp => ({ wp, ...mapService.routePosition(wp.location, line) }));
        const isOnRoute = c => c.progress > 0.02 && c.progress < 0.98 && c.offsetKm <= tolerance;
        const byProgress = (a, b) => a.progress - b.progress;

        let chosen = pickAlongRoute(candidates.filter(isOnRoute), middleCount);
        const fillFrom = (pool) => {
            if (chosen.length >= middleCount) return;
            const extra = pool.filter(c => !chosen.includes(c)).slice(0, middleCount - chosen.length);
            chosen = [...chosen, ...extra];
        };
        fillFrom(candidates.filter(c => isOnRoute(c)).sort(byProgress));
        fillFrom([...candidates].sort((a, b) => a.offsetKm - b.offsetKm));
        chosen.sort(byProgress);

        const result = [
            { ...first, verified: Boolean(startCoords) },
            ...chosen.map(c => c.wp),
            { ...last, verified: Boolean(endCoords) },
        ].map((wp, i) => ({ ...wp, order_index: i + 1 }));

        const verifiedCount = chosen.filter(c => c.wp.verified).length;
        console.log(`[Groq AI] Sukces: zapisano ${result.length} punktów, ${verifiedCount} z ${chosen.length} pośrednich potwierdzonych w OpenStreetMap.`);
        return result;

    } catch (error) {
        console.error("BŁĄD GROQ AI:", error);
        throw new Error("Błąd AI: " + error.message);
    }
};
