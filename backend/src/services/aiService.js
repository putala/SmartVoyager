const Groq = require('groq-sdk');
const mapService = require('./mapService');
const { collectAttractions, normalizeName } = require('./planning/attractionCatalog');
const { findVerifiedPlace } = require('./planning/placeVerifier');
const { selectStops } = require('./planning/stopSelector');
const { SYSTEM_PROMPT, buildTripPrompt } = require('./planning/tripPrompt');
const { resolveGenerationSettings } = require('./planning/tripSettings');
const { hasCoordinates, parseProposals, anchorEndpoints } = require('./planning/proposals');

const MODEL = 'openai/gpt-oss-120b';
const TOWN_SAMPLES = 10;

let client = null;

// Pozwala testom podstawić udawanego klienta Groq; setClient(null) przywraca prawdziwego
exports.setClient = (mockClient) => {
    client = mockClient;
};

const getClient = () => {
    if (!client) {
        client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return client;
};

const locate = (place) => (place.lat && place.lng
    ? { lat: place.lat, lng: place.lng }
    : mapService.geocode(place.address));

/**
 * Dane z mapy: współrzędne startu i celu, przebieg drogi, miejscowości i atrakcje po drodze
 */
const exploreRoute = async (trip, settings) => {
    const start = await locate(trip.origin);
    const end = await locate(trip.destination);
    const roadLine = start && end ? await mapService.fetchRoadLine(start, end) : null;
    const towns = roadLine ? await mapService.townsAlongRoad(roadLine, TOWN_SAMPLES) : [];
    const catalog = roadLine && settings.middleCount > 0
        ? await collectAttractions(roadLine, towns, settings.toleranceKm)
        : [];
    return { start, end, roadLine, towns, catalog };
};

const requestProposals = async (prompt) => {
    let completion;
    try {
        completion = await getClient().chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            model: MODEL,
            response_format: { type: 'json_object' },
            reasoning_effort: 'low',
            max_completion_tokens: 7000,
        });
    } catch (error) {
        console.error('BŁĄD GROQ AI:', error);
        throw new Error(`Błąd AI: ${error.message}`, { cause: error });
    }
    return parseProposals(completion.choices[0]?.message?.content);
};

const placeDetails = (place) => ({
    location: place.location,
    openingHours: place.openingHours,
    website: place.website,
    osmId: place.osmId,
});

/**
 * Propozycje z danymi z OpenStreetMap; nieznalezione zostają z położeniem od modelu i verified: false
 */
const verifyProposals = async (proposals, catalog, box) => {
    const catalogByName = new Map(catalog.map(place => [normalizeName(place.name), place]));
    const results = [];
    for (const proposal of proposals) {
        const place = catalogByName.get(normalizeName(proposal.name)) || await findVerifiedPlace(proposal, box);
        if (place) {
            results.push({ ...proposal, ...placeDetails(place), verified: true });
        } else if (hasCoordinates(proposal)) {
            results.push({ ...proposal, verified: false });
        }
    }
    return results;
};

/**
 * Punkty trasy dla wycieczki: start, przystanki po drodze w kolejności przejazdu i cel,
 * w liczbie ustawionej suwakiem (mniej tylko wtedy, gdy model i mapa nie dały dość kandydatów)
 */
exports.generateWaypoints = async (trip, user) => {
    console.log(`[Groq AI] Generowanie trasy: ${trip.origin.address} -> ${trip.destination.address}`);
    const settings = resolveGenerationSettings(trip);

    const route = await exploreRoute(trip, settings);
    console.log(`[Groq AI] Katalog OpenStreetMap: ${route.catalog.length} atrakcji przy trasie.`);

    const prompt = buildTripPrompt({
        trip,
        preferences: user.preferences,
        settings,
        towns: route.towns,
        catalog: route.catalog,
    });
    const proposals = await requestProposals(prompt);
    const { first, last } = anchorEndpoints(proposals, route);

    const line = route.roadLine || [first.location, last.location];
    const box = mapService.boundingBox(line, settings.toleranceKm);
    const verified = await verifyProposals(proposals.slice(1, -1), route.catalog, box);
    const candidates = verified.map(stop => ({ stop, ...mapService.routePosition(stop.location, line) }));
    const stops = selectStops(candidates, settings.middleCount, settings.toleranceKm).map(candidate => candidate.stop);

    const verifiedCount = stops.filter(stop => stop.verified).length;
    console.log(`[Groq AI] Sukces: zapisano ${stops.length + 2} punktów, ${verifiedCount} z ${stops.length} pośrednich potwierdzonych w OpenStreetMap.`);

    return [first, ...stops, last].map((stop, index) => ({ ...stop, order_index: index + 1 }));
};
