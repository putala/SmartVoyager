// Google Maps directions URLs accept at most 9 stops between origin and destination
const MAX_STOPS = 9;

interface NavigablePoint {
    location?: { lat?: number; lng?: number };
    lat?: number;
    lng?: number;
    visited?: boolean;
}

export interface NavigationLink {
    url: string;
    omittedStops: number;
}

const toCoordinates = (point: NavigablePoint): string | null => {
    const lat = point.location?.lat ?? point.lat;
    const lng = point.location?.lng ?? point.lng;
    return typeof lat === 'number' && typeof lng === 'number' ? `${lat},${lng}` : null;
};

/**
 * Driving directions from the trip start to its destination through the stops not visited yet.
 * Returns null when the trip has fewer than two points with coordinates.
 */
export function buildGoogleMapsRoute(points: NavigablePoint[]): NavigationLink | null {
    const located = points.filter(point => toCoordinates(point));
    if (located.length < 2) return null;

    const remainingStops = located.slice(1, -1).filter(point => !point.visited);
    const stops = remainingStops.slice(0, MAX_STOPS);
    const params = new URLSearchParams({
        api: '1',
        origin: toCoordinates(located[0])!,
        destination: toCoordinates(located[located.length - 1])!,
        travelmode: 'driving',
    });
    if (stops.length > 0) params.set('waypoints', stops.map(stop => toCoordinates(stop)).join('|'));

    return {
        url: `https://www.google.com/maps/dir/?${params.toString()}`,
        omittedStops: remainingStops.length - stops.length,
    };
}
