const mapService = require('../mapService');

// Model podaje nazwy w formie „Muzeum Regionalne w Myślenicach” albo z dopiskami („Zamek X – dziedziniec”),
// a OSM zna „Muzeum Regionalne” w miejscowości „Myślenice”. Odmienionej miejscowości Nominatim nie rozpoznaje.
const NAME_SUFFIX = /\s[–—-]\s|\s*\(/;
const LOCATIVE_TOWN = /\s+(w|we|na|pod|nad|koło|przy|k\.)\s+\p{Lu}.*$/u;
const CHURCH_DEDICATION = /\s+(pw\.|p\.w\.|pod wezwaniem)\s+/giu;

/**
 * Miejscowość z adresu „ulica, miejscowość”, bez dopisków w nawiasie
 */
const extractTown = (address) => {
    const lastPart = address?.split(',').map(part => part.trim()).filter(Boolean).pop() || '';
    return lastPart.replace(/\s*\(.*$/, '').trim();
};

/**
 * Nazwa obiektu bez miejscowości i dopisków; jedno słowo („Muzeum”) pasowałoby do dowolnego obiektu,
 * więc wtedy zostaje pełna nazwa
 */
const simplifyName = (name) => {
    const simplified = name
        .split(NAME_SUFFIX)[0]
        .replace(LOCATIVE_TOWN, '')
        .replace(CHURCH_DEDICATION, ' ')
        .trim();
    return simplified.split(/\s+/).length >= 2 ? simplified : name;
};

/**
 * Zapytania do Nominatim od najdokładniejszego: pełna nazwa z adresem, potem uproszczona nazwa z miejscowością
 */
const buildSearchQueries = ({ name, address }) => {
    const town = extractTown(address);
    const shortName = simplifyName(name);
    return [...new Set([
        address ? `${name}, ${address}` : name,
        town ? `${shortName}, ${town}` : shortName,
    ])];
};

/**
 * Miejsce znalezione w OpenStreetMap w obrębie prostokąta trasy albo null
 */
const findVerifiedPlace = async (proposal, box) => {
    for (const query of buildSearchQueries(proposal)) {
        const place = await mapService.findPlace(query, box);
        if (place) return place;
    }
    return null;
};

module.exports = { extractTown, simplifyName, buildSearchQueries, findVerifiedPlace };
