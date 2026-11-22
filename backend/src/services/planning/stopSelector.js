// Wybór przystanków wzdłuż trasy. Kandydat ma postać { stop, progress, offsetKm },
// gdzie progress (0..1) to postęp wzdłuż drogi, a offsetKm to odległość od niej.

// Punkty przy samym starcie lub celu nie są przystankami po drodze
const ROUTE_EDGE = 0.02;

// Kara (w ułamku długości trasy) dla miejsca niepotwierdzonego w OSM: bierzemy je tylko,
// gdy wypełnia lukę na trasie wyraźnie lepiej niż potwierdzone
const UNVERIFIED_PENALTY = 0.05;

const isAlongRoute = ({ progress, offsetKm }, toleranceKm) =>
    progress > ROUTE_EDGE && progress < 1 - ROUTE_EDGE && offsetKm <= toleranceKm;

const byProgress = (a, b) => a.progress - b.progress;

/**
 * `count` elementów równomiernie rozłożonych na liście
 */
const pickEvenly = (items, count) => {
    if (items.length <= count) return items;
    const step = items.length / count;
    return Array.from({ length: count }, (_, i) => items[Math.floor(i * step + step / 2)]);
};

/**
 * `count` kandydatów najbliższych równo rozstawionym miejscom na trasie
 */
const pickAlongRoute = (candidates, count) => {
    const pool = [...candidates];
    const chosen = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
        const target = (i + 0.5) / count;
        const cost = candidate => Math.abs(candidate.progress - target) + (candidate.stop.verified ? 0 : UNVERIFIED_PENALTY);
        const best = pool.reduce((a, b) => (cost(b) < cost(a) ? b : a));
        chosen.push(best);
        pool.splice(pool.indexOf(best), 1);
    }
    return chosen;
};

/**
 * Przystanki przy drodze w kolejności przejazdu. Gdy przy drodze jest ich za mało,
 * lista jest uzupełniana kandydatami najbliższymi drodze, żeby zgadzała się liczba punktów.
 */
const selectStops = (candidates, count, toleranceKm) => {
    const chosen = pickAlongRoute(candidates.filter(candidate => isAlongRoute(candidate, toleranceKm)), count);
    const nearestRest = candidates
        .filter(candidate => !chosen.includes(candidate))
        .sort((a, b) => a.offsetKm - b.offsetKm);
    chosen.push(...nearestRest.slice(0, count - chosen.length));
    return chosen.sort(byProgress);
};

module.exports = { isAlongRoute, pickEvenly, pickAlongRoute, selectStops };
