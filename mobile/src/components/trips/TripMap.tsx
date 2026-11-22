import React, { useMemo, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

export interface TripMapWaypoint {
    _id?: string;
    name?: string;
    location?: { lat: number; lng: number };
    lat?: number;
    lng?: number;
}

interface TripMapProps {
    waypoints: TripMapWaypoint[];
    routeLineColor: string;
    mapBg: string;
}

export const TripMap = forwardRef<MapView, TripMapProps>(function TripMap(
    { waypoints, routeLineColor, mapBg },
    ref,
) {
    const internalRef = useRef<MapView>(null);
    useImperativeHandle(ref, () => internalRef.current as MapView);
    const { width: screenWidth } = useWindowDimensions();
    const mapHeight = screenWidth;

    const coordinates = useMemo(() => {
        return waypoints
            .map((wp) => {
                const lat = wp.location?.lat ?? wp.lat;
                const lng = wp.location?.lng ?? wp.lng;
                if (typeof lat === 'number' && typeof lng === 'number') {
                    return { latitude: lat, longitude: lng };
                }
                return null;
            })
            .filter((c): c is { latitude: number; longitude: number } => c !== null);
    }, [waypoints]);

    const initialRegion = coordinates[0]
        ? {
            latitude: coordinates[0].latitude,
            longitude: coordinates[0].longitude,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
        }
        : {
            latitude: 52.2297,
            longitude: 21.0122,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
        };

    useEffect(() => {
        if (coordinates.length >= 2 && internalRef.current) {
            internalRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                animated: false,
            });
        }
    }, [coordinates]);

    return (
        <View style={[styles.container, { backgroundColor: mapBg, height: mapHeight }]}>
            <MapView
                ref={internalRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
            >
                {coordinates.length >= 2 && (
                    <Polyline
                        coordinates={coordinates}
                        strokeColor={routeLineColor}
                        strokeWidth={4}
                        lineCap="round"
                        lineJoin="round"
                    />
                )}

                {waypoints.map((wp, idx) => {
                    const lat = wp.location?.lat ?? wp.lat;
                    const lng = wp.location?.lng ?? wp.lng;
                    if (typeof lat !== 'number' || typeof lng !== 'number') return null;

                    const pinColor =
                        idx === 0 ? 'green' :
                        idx === waypoints.length - 1 ? 'red' : '#475569';

                    return (
                        <Marker
                            key={wp._id || idx}
                            coordinate={{ latitude: lat, longitude: lng }}
                            title={wp.name}
                            pinColor={pinColor}
                        />
                    );
                })}
            </MapView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: { width: '100%' },
    map: { flex: 1 },
});
