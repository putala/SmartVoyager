const Groq = require("groq-sdk");

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

// Współrzędne miejsca z OpenStreetMap (Nominatim); null, gdy nie znaleziono
const geocode = async (address) => {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SmartVoyager/1.0' } });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data[0]) return null;
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {
        return null;
    }
};

// Przebieg drogi samochodowej z OSRM jako lista {lat, lng}; przy błędzie linia prosta
const fetchRoadLine = async (start, end) => {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=simplified&geometries=geojson`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SmartVoyager/1.0' } });
        if (!res.ok) return [start, end];
        const data = await res.json();
        const coords = data.routes?.[0]?.geometry?.coordinates;
        if (!coords || coords.length < 2) return [start, end];
        return coords.map(([lng, lat]) => ({ lat, lng }));
    } catch {
        return [start, end];
    }
};

// Położenie punktu względem drogi: progress 0..1 to postęp wzdłuż trasy,
// offsetKm to odległość od najbliższego miejsca na drodze
const routePosition = (point, line) => {
    const kmPerLat = 110.57;
    const kmPerLng = 111.32 * Math.cos(point.lat * Math.PI / 180);
    const toXY = (p) => ({ x: p.lng * kmPerLng, y: p.lat * kmPerLat });
    const p = toXY(point);

    let travelled = 0;
    let best = { offsetKm: Infinity, alongKm: 0 };
    for (let i = 0; i < line.length - 1; i++) {
        const a = toXY(line[i]);
        const b = toXY(line[i + 1]);
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const segKm = Math.hypot(ex, ey);
        const t = segKm === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * ex + (p.y - a.y) * ey) / (segKm * segKm)));
        const offsetKm = Math.hypot(p.x - (a.x + t * ex), p.y - (a.y + t * ey));
        if (offsetKm < best.offsetKm) best = { offsetKm, alongKm: travelled + t * segKm };
        travelled += segKm;
    }
    return { progress: travelled === 0 ? 0 : best.alongKm / travelled, offsetKm: best.offsetKm };
};

// Kilka punktów z przebiegu drogi do podpowiedzi dla modelu
const sampleLine = (line, count) => {
    if (line.length <= count) return line;
    return Array.from({ length: count }, (_, i) => line[Math.round(i * (line.length - 1) / (count - 1))]);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Nazwy miejscowości leżących na drodze (Nominatim pozwala na 1 zapytanie na sekundę)
const townsAlongRoad = async (line, count) => {
    const towns = [];
    for (const point of sampleLine(line, count)) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=pl&lat=${point.lat}&lon=${point.lng}`;
            const res = await fetch(url, { headers: { 'User-Agent': 'SmartVoyager/1.0' } });
            if (res.ok) {
                const a = (await res.json()).address || {};
                const name = a.city || a.town || a.village || a.municipality || a.county;
                if (name && !towns.includes(name)) towns.push(name);
            }
        } catch {
            // pomijamy punkt, którego nie udało się nazwać
        }
        await sleep(1100);
    }
    return towns;
};

// Wybiera `count` elementów równomiernie rozłożonych na liście
const pickEvenly = (items, count) => {
    if (items.length <= count) return items;
    const step = items.length / count;
    return Array.from({ length: count }, (_, i) => items[Math.floor(i * step + step / 2)]);
};

const toPoint = (wp) => ({
    ...wp,
    location: {
        lat: parseFloat(wp.location?.lat || wp.lat),
        lng: parseFloat(wp.location?.lng || wp.lng)
    }
});

exports.generateWaypoints = async (trip, user) => {
    try {
        const groq = getClient();
        console.log(`[Groq AI] Generowanie trasy: ${trip.origin.address} -> ${trip.destination.address}`);

        const interests = user.preferences?.interests?.join(', ') || 'ogólne zwiedzanie';

        // DODANO: Destrukturyzacja z wartościami domyślnymi, aby uniknąć błędów przy braku pól
        const {
            intensity = 5,
            numberOfPoints = 10,
            discoverySpread = 5
        } = trip.aiSettings || {};

        const budget = trip.budget > 0 ? `${trip.budget} PLN` : 'budżet ekonomiczny';

        // DODANO: Definicja zmiennej specialRequests, której brakowało!
        const specialRequests = trip.description
            ? `DODATKOWE WYTYCZNE UŻYTKOWNIKA (PRIORYTET): ${trip.description}`
            : "Brak dodatkowych życzeń.";

        const startCoords = trip.origin.lat && trip.origin.lng
            ? { lat: trip.origin.lat, lng: trip.origin.lng }
            : await geocode(trip.origin.address);
        const endCoords = trip.destination.lat && trip.destination.lng
            ? { lat: trip.destination.lat, lng: trip.destination.lng }
            : await geocode(trip.destination.address);

        const middleCount = Math.max(0, numberOfPoints - 2);
        const candidateCount = middleCount > 0 ? middleCount + Math.min(4, Math.ceil(middleCount / 3)) : 0;

        // 1. Interpretacja Rozproszenia (Discovery Spread 0-10)
        const maxDetourKm = 5 + Math.round(discoverySpread * 2.5);
        const spreadInstruction = `Punkty pośrednie MUSZĄ leżeć przy głównej drodze z ${trip.origin.address} do ${trip.destination.address}, najdalej ${maxDetourKm} km od niej. Nie proponuj miejsc w innych kierunkach ani poza tym pasem.`;

        // 2. Interpretacja Intensywności (Intensity 0-10)
        let intensityInstruction = "";
        if (intensity <= 3) {
            intensityInstruction = "Tempo bardzo spokojne, 1-2 główne atrakcje z czasem na relaks.";
        } else if (intensity <= 7) {
            intensityInstruction = "Tempo standardowe, zbalansowane zwiedzanie.";
        } else {
            intensityInstruction = "Tempo ekstremalne, krótkie, intensywne postoje i duża dynamika.";
        }

        const roadLine = startCoords && endCoords ? await fetchRoadLine(startCoords, endCoords) : null;
        const towns = roadLine ? await townsAlongRoad(roadLine, 10) : [];
        const coordsInfo = towns.length > 0
            ? `Droga samochodowa prowadzi kolejno przez: ${towns.join(', ')}. Wybieraj atrakcje w tych miejscowościach albo tuż obok nich, w tej kolejności.`
            : '';

        const prompt = `Jesteś profesjonalnym przewodnikiem Voyager AI. 
        Zaplanuj trasę z: ${trip.origin.address} do: ${trip.destination.address}. ${coordsInfo}
        Zwróć uwagę jakie miejscowości leżą na drodze między tymi lokalizacjami, aby na całej trasie znaleźć coś ciekawego.
        
        PARAMETRY LOGICZNE:
        - GEOGRAFIA: ${spreadInstruction}
        - DYNAMIKA: ${intensityInstruction}
        - LICZBA PUNKTÓW: DOKŁADNIE ${candidateCount + 2} (start, ${candidateCount} propozycji po drodze, cel).
        - ZAINTERESOWANIA: ${interests}.
        - BUDŻET: ${budget}.
        - KONIECZNE WYTYCZNE: ${specialRequests}

        WYMAGANIA TECHNICZNE:
        1. Każde miejsce MUSI istnieć w rzeczywistości.
        2. Podaj DOKŁADNE współrzędne geograficzne (lat, lng) jako float.
        3. Odpowiedź musi być WYŁĄCZNIE obiektem JSON.
        4. Pierwszym punktem trasy ma być ${trip.origin.address}.
        5. Ostatnim punktem trasy ma być ${trip.destination.address}.
        6. Punkty ułóż w kolejności przejazdu. Każdy kolejny punkt jest bliżej celu niż poprzedni, bez cofania się.

        STRUKTURA JSON:
        {
          "waypoints": [
            {
              "name": "Pełna nazwa",
              "address": "Adres, Miasto",
              "description": "Dlaczego pasuje do profilu? Poszukaj w Internecie informacji na temat danego miejsca aby zweryfikować jego autentyczność i napisz o danym dłuższy opis konieczine około 10 zdań.",
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
        const waypoints = (parsedData.waypoints || [])
            .map(toPoint)
            .filter(wp => !isNaN(wp.location.lat) && !isNaN(wp.location.lng));

        if (waypoints.length < 2) {
            throw new Error("AI zwróciło za mało punktów");
        }

        const first = waypoints[0];
        const last = waypoints[waypoints.length - 1];
        const start = startCoords || first.location;
        const end = endCoords || last.location;
        first.location = start;
        last.location = end;

        const line = roadLine || [start, end];
        const tolerance = maxDetourKm * 1.5;
        const candidates = waypoints.slice(1, -1)
            .map(wp => ({ wp, ...routePosition(wp.location, line) }));

        const onRoute = candidates.filter(c => c.progress > 0.02 && c.progress < 0.98 && c.offsetKm <= tolerance);
        let chosen = pickEvenly(onRoute.sort((a, b) => a.progress - b.progress), middleCount);
        if (chosen.length < middleCount) {
            const extra = candidates
                .filter(c => !chosen.includes(c))
                .sort((a, b) => a.offsetKm - b.offsetKm)
                .slice(0, middleCount - chosen.length);
            chosen = [...chosen, ...extra];
        }
        chosen.sort((a, b) => a.progress - b.progress);

        const result = [first, ...chosen.map(c => c.wp), last]
            .map((wp, i) => ({ ...wp, order_index: i + 1 }));

        console.log(`[Groq AI] Sukces: ${onRoute.length} z ${waypoints.length - 2} propozycji przy trasie, zapisano ${result.length} punktów.`);
        return result;

    } catch (error) {
        console.error("BŁĄD GROQ AI:", error);
        throw new Error("Błąd AI: " + error.message);
    }
};
