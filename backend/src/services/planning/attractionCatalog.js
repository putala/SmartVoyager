const mapService = require('../mapService');
const { isAlongRoute, pickEvenly } = require('./stopSelector');

const CATEGORIES = ['attraction', 'museum'];
const MAX_TOWNS = 8;
const MAX_PLACES_PER_TOWN = 3;
const MAX_PLACES = 40;

const normalizeName = (name) => (name || '').toLowerCase().replace(/[–—‑]/g, '-').replace(/\s+/g, ' ').trim();

// Obiekty z godzinami otwarcia i stroną www dają użytkownikowi więcej informacji
const informationScore = (place) =>
    (place.openingHours ? 2 : 0) + (place.website ? 1 : 0) + (place.type === 'museum' ? 1 : 0);

/**
 * Atrakcje jednej miejscowości leżące przy drodze; `seenKeys` usuwa duplikaty między miejscowościami
 */
const fetchTownAttractions = async (town, { roadLine, box, toleranceKm, seenKeys }) => {
    const places = [];
    for (const category of CATEGORIES) {
        for (const place of await mapService.attractionsInTown(town, category, box)) {
            const key = place.osmId || normalizeName(place.name);
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);
            const position = mapService.routePosition(place.location, roadLine);
            if (isAlongRoute(position, toleranceKm)) places.push({ ...place, progress: position.progress });
        }
    }
    // Duże miasto nie może zdominować listy
    return places.sort((a, b) => informationScore(b) - informationScore(a)).slice(0, MAX_PLACES_PER_TOWN);
};

/**
 * Katalog prawdziwych atrakcji z OpenStreetMap w miejscowościach pośrednich, w kolejności przejazdu
 */
const collectAttractions = async (roadLine, towns, toleranceKm) => {
    const context = {
        roadLine,
        box: mapService.boundingBox(roadLine, toleranceKm),
        toleranceKm,
        seenKeys: new Set(),
    };
    const places = [];
    for (const town of pickEvenly(towns.slice(1, -1), MAX_TOWNS)) {
        places.push(...await fetchTownAttractions(town, context));
    }
    return pickEvenly(places.sort((a, b) => a.progress - b.progress), MAX_PLACES);
};

module.exports = { normalizeName, collectAttractions };
