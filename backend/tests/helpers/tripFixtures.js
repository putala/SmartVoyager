// Dane testowe: wycieczka Kraków -> Wrocław, droga jako prosta linia i punkty zwracane przez „model”

const KRAKOW = { lat: 50.0614, lng: 19.9366 };
const WROCLAW = { lat: 51.1079, lng: 17.0385 };

/**
 * Wycieczka jak dokument z bazy; `overrides` nadpisuje pola, `aiSettings` scala się z domyślnymi
 */
const buildTrip = (overrides = {}) => ({
    title: 'Kraków - Wrocław',
    origin: { address: 'Kraków', ...KRAKOW },
    destination: { address: 'Wrocław', ...WROCLAW },
    budget: 500,
    description: '',
    ...overrides,
    aiSettings: { intensity: 5, numberOfPoints: 6, discoverySpread: 3, ...overrides.aiSettings },
});

const buildUser = (preferences = {}) => ({
    preferences: {
        interests: ['historia', 'muzea'],
        travelStyle: {},
        personalNotes: '',
        ...preferences,
    },
});

/**
 * Punkt na odcinku start -> cel; `progress` 0..1 to postęp wzdłuż drogi
 */
const pointAlongRoad = (progress, from = KRAKOW, to = WROCLAW) => ({
    lat: from.lat + (to.lat - from.lat) * progress,
    lng: from.lng + (to.lng - from.lng) * progress,
});

/**
 * Droga jako linia łamana złożona z `segments` odcinków między startem a celem
 */
const straightRoad = (segments = 10, from = KRAKOW, to = WROCLAW) =>
    Array.from({ length: segments + 1 }, (_, i) => pointAlongRoad(i / segments, from, to));

/**
 * Odpowiedź modelu: start, `stops` przystanków rozłożonych równo po drodze i cel
 */
const buildModelWaypoints = (stops) => [
    { name: 'Kraków', address: 'Rynek Główny, Kraków', description: 'Start', location: KRAKOW },
    ...Array.from({ length: stops }, (_, i) => ({
        name: `Atrakcja ${i + 1}`,
        address: `ul. Testowa ${i + 1}, Miasto ${i + 1}`,
        description: `Opis atrakcji ${i + 1}`,
        location: pointAlongRoad((i + 1) / (stops + 1)),
    })),
    { name: 'Wrocław', address: 'Rynek, Wrocław', description: 'Cel', location: WROCLAW },
];

module.exports = { KRAKOW, WROCLAW, buildTrip, buildUser, pointAlongRoad, straightRoad, buildModelWaypoints };
