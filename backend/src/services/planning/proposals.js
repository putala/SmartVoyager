// Odczyt i porządkowanie propozycji zwróconych przez model

const toWaypoint = (raw) => ({
    name: raw.name,
    address: raw.address,
    description: raw.description,
    location: {
        lat: parseFloat(raw.location?.lat || raw.lat),
        lng: parseFloat(raw.location?.lng || raw.lng),
    },
});

const hasCoordinates = ({ location }) => !isNaN(location.lat) && !isNaN(location.lng);

/**
 * Lista punktów z odpowiedzi modelu (JSON z polem "waypoints"); błąd, gdy nie ma choćby startu i celu
 */
const parseProposals = (content) => {
    let parsed = null;
    try {
        parsed = JSON.parse(content);
    } catch {
        // Niepoprawny JSON traktujemy jak pustą odpowiedź
    }
    const proposals = (parsed?.waypoints || []).map(toWaypoint);
    if (proposals.length < 2) throw new Error('Błąd AI: model zwrócił za mało punktów');
    return proposals;
};

/**
 * Start i cel zawsze leżą w miejscach wpisanych przez użytkownika, nie tam, gdzie wskazał model
 */
const anchorEndpoints = (proposals, { start, end }) => {
    const firstProposal = proposals[0];
    const lastProposal = proposals[proposals.length - 1];
    const first = { ...firstProposal, location: start || firstProposal.location, verified: Boolean(start) };
    const last = { ...lastProposal, location: end || lastProposal.location, verified: Boolean(end) };
    if (!hasCoordinates(first) || !hasCoordinates(last)) {
        throw new Error('Błąd AI: nie udało się ustalić położenia startu lub celu');
    }
    return { first, last };
};

module.exports = { toWaypoint, hasCoordinates, parseProposals, anchorEndpoints };
