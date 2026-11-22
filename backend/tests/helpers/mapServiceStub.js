const { straightRoad } = require('./tripFixtures');

/**
 * Zamiennik mapService bez sieci: zapytania do Nominatim i OSRM zwracają stałe dane,
 * a geometria trasy (boundingBox, routePosition) to prawdziwy kod.
 *
 * Użycie w pliku testu:
 *   jest.mock('../src/services/mapService', () => require('./helpers/mapServiceStub').createMapServiceStub());
 * Pojedyncze funkcje można potem zmieniać przez mapService.findPlace.mockResolvedValueOnce(...).
 */
const createMapServiceStub = (overrides = {}) => {
    const { boundingBox, routePosition } = jest.requireActual('../../src/services/mapService');
    return {
        geocode: jest.fn(async () => null),
        fetchRoadLine: jest.fn(async (start, end) => straightRoad(10, start, end)),
        townsAlongRoad: jest.fn(async () => []),
        attractionsInTown: jest.fn(async () => []),
        findPlace: jest.fn(async () => null),
        boundingBox,
        routePosition,
        ...overrides,
    };
};

module.exports = { createMapServiceStub };
