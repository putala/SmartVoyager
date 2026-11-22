const DEFAULT_INTENSITY = 5;
const DEFAULT_NUMBER_OF_POINTS = 10;
const DEFAULT_DISCOVERY_SPREAD = 5;

// Zasięg eksploracji 0..10 przekłada się na 5..30 km dopuszczalnego zboczenia z drogi
const MIN_DETOUR_KM = 5;
const DETOUR_KM_PER_SPREAD_STEP = 2.5;

// Margines na niedokładne współrzędne: kandydat może leżeć o połowę dalej, niż prosimy model
const DETOUR_TOLERANCE_FACTOR = 1.5;

/**
 * Ustawienia generowania wyliczone z suwaków wycieczki. Model dostaje kilka propozycji zapasowych,
 * bo część może odpaść przy weryfikacji lub leżeć za daleko od drogi.
 */
const resolveGenerationSettings = (trip) => {
    const {
        intensity = DEFAULT_INTENSITY,
        numberOfPoints = DEFAULT_NUMBER_OF_POINTS,
        discoverySpread = DEFAULT_DISCOVERY_SPREAD,
    } = trip.aiSettings || {};
    const middleCount = Math.max(0, numberOfPoints - 2);
    const maxDetourKm = MIN_DETOUR_KM + Math.round(discoverySpread * DETOUR_KM_PER_SPREAD_STEP);

    return {
        intensity,
        middleCount,
        candidateCount: middleCount > 0 ? middleCount + Math.min(3, Math.ceil(middleCount / 3)) : 0,
        maxDetourKm,
        toleranceKm: maxDetourKm * DETOUR_TOLERANCE_FACTOR,
    };
};

module.exports = { resolveGenerationSettings };
