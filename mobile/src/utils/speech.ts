import * as Speech from 'expo-speech';

export interface SpeakableWaypoint {
    name?: string;
    address?: string;
    description?: string;
}

let activeWaypointKey: string | null = null;

function buildWaypointSpeechText(wp: SpeakableWaypoint): string | null {
    const parts: string[] = [];
    if (wp.name?.trim()) parts.push(wp.name.trim());
    if (wp.address?.trim()) parts.push(wp.address.trim());
    if (wp.description?.trim()) parts.push(wp.description.trim());
    if (parts.length === 0) return null;
    return parts.join('. ');
}

export function stopSpeech() {
    Speech.stop();
    activeWaypointKey = null;
}

export async function toggleWaypointSpeech(wp: SpeakableWaypoint, waypointKey: string) {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking && activeWaypointKey === waypointKey) {
        stopSpeech();
        return;
    }

    const text = buildWaypointSpeechText(wp);
    if (!text) return;

    Speech.stop();
    activeWaypointKey = waypointKey;
    Speech.speak(text, {
        language: 'pl-PL',
        rate: 0.95,
        onDone: () => {
            activeWaypointKey = null;
        },
        onStopped: () => {
            activeWaypointKey = null;
        },
    });
}
