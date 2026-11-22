// Integracja z OpenStreetMap: Nominatim (wyszukiwanie miejsc) i OSRM (przebieg drogi)

const USER_AGENT = 'SmartVoyager/1.0';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

// Nominatim dopuszcza jedno zapytanie na sekundę z jednej aplikacji
const NOMINATIM_INTERVAL_MS = 1100;
let nominatimQueue = Promise.resolve();

const nominatim = (path) => {
    const call = nominatimQueue.then(async () => {
        try {
            const res = await fetch(`${NOMINATIM}${path}`, {
                headers: { 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(10000),
            });
            return res.ok ? await res.json() : null;
        } catch {
            return null;
        }
    });
    nominatimQueue = call.then(() => new Promise(resolve => setTimeout(resolve, NOMINATIM_INTERVAL_MS)));
    return call;
};

// Dane w OSM edytuje każdy, więc przepuszczamy tylko zwykłe linki http(s)
const safeUrl = (value) => {
    if (!value) return '';
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
        const url = new URL(candidate);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch {
        return '';
    }
};

// Ogranicza wyniki Nominatim do prostokąta trasy
const viewboxParam = (box) => (box ? `&viewbox=${box.west},${box.north},${box.east},${box.south}&bounded=1` : '');

/**
 * Współrzędne adresu; null, gdy nie znaleziono
 */
exports.geocode = async (address) => {
    const data = await nominatim(`/search?format=json&limit=1&q=${encodeURIComponent(address)}`);
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
};

/**
 * Wyszukanie atrakcji w OpenStreetMap w obrębie prostokąta wokół trasy.
 * Zwraca prawdziwe położenie oraz dane z bazy (godziny otwarcia, strona www), gdy są dostępne.
 */
exports.findPlace = async (query, box) => {
    const data = await nominatim(
        `/search?format=jsonv2&limit=1&extratags=1&accept-language=pl${viewboxParam(box)}&q=${encodeURIComponent(query)}`
    );
    const hit = data?.[0];
    return hit ? toPlace(hit) : null;
};

const toPlace = (hit) => ({
    location: { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) },
    openingHours: hit.extratags?.opening_hours || '',
    website: safeUrl(hit.extratags?.website || hit.extratags?.['contact:website']),
    osmId: hit.osm_type && hit.osm_id ? `${hit.osm_type}/${hit.osm_id}` : '',
});

/**
 * Prawdziwe obiekty danej kategorii OSM (np. "museum", "attraction") w miejscowości.
 * Prostokąt trasy odcina miejscowości o tej samej nazwie w innych częściach kraju.
 */
exports.attractionsInTown = async (town, category, box) => {
    const data = await nominatim(
        `/search?format=jsonv2&limit=6&extratags=1&accept-language=pl${viewboxParam(box)}&q=${encodeURIComponent(`${category} in ${town}`)}`
    );
    return (data || [])
        .filter(hit => hit.name)
        .map(hit => ({ name: hit.name, town, type: hit.type, ...toPlace(hit) }));
};

/**
 * Przebieg drogi samochodowej z OSRM jako lista {lat, lng}; przy błędzie linia prosta
 */
exports.fetchRoadLine = async (start, end) => {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=simplified&geometries=geojson`;
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
        if (!res.ok) return [start, end];
        const data = await res.json();
        const coords = data.routes?.[0]?.geometry?.coordinates;
        if (!coords || coords.length < 2) return [start, end];
        return coords.map(([lng, lat]) => ({ lat, lng }));
    } catch {
        return [start, end];
    }
};

const sampleLine = (line, count) => {
    if (line.length <= count) return line;
    return Array.from({ length: count }, (_, i) => line[Math.round(i * (line.length - 1) / (count - 1))]);
};

/**
 * Nazwy miejscowości leżących na drodze, w kolejności przejazdu
 */
exports.townsAlongRoad = async (line, count) => {
    const towns = [];
    for (const point of sampleLine(line, count)) {
        const data = await nominatim(
            `/reverse?format=json&zoom=10&accept-language=pl&lat=${point.lat}&lon=${point.lng}`
        );
        const address = data?.address || {};
        const name = address.city || address.town || address.village || address.municipality || address.county;
        if (name && !towns.includes(name)) towns.push(name);
    }
    return towns;
};

/**
 * Prostokąt obejmujący drogę, powiększony o margines w kilometrach
 */
exports.boundingBox = (line, marginKm) => {
    const latPad = marginKm / 110.57;
    const midLat = line.reduce((sum, p) => sum + p.lat, 0) / line.length;
    const lngPad = marginKm / (111.32 * Math.cos(midLat * Math.PI / 180));
    return {
        south: Math.min(...line.map(p => p.lat)) - latPad,
        north: Math.max(...line.map(p => p.lat)) + latPad,
        west: Math.min(...line.map(p => p.lng)) - lngPad,
        east: Math.max(...line.map(p => p.lng)) + lngPad,
    };
};

/**
 * Położenie punktu względem drogi: progress 0..1 to postęp wzdłuż trasy,
 * offsetKm to odległość od najbliższego miejsca na drodze
 */
exports.routePosition = (point, line) => {
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
