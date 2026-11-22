import * as Speech from 'expo-speech';
import { describeOpeningHoursForSpeech } from './openingHours';

export interface SpeakableWaypoint {
    name?: string;
    address?: string;
    description?: string;
    openingHours?: string;
}

let activeWaypointKey: string | null = null;
// Each utterance gets an id so callbacks of a stopped utterance cannot clear the current one.
let utteranceId = 0;

function buildWaypointSpeechText(wp: SpeakableWaypoint): string | null {
    const parts: string[] = [];
    if (wp.name?.trim()) parts.push(wp.name.trim());
    if (wp.address?.trim()) parts.push(wp.address.trim());
    const spokenHours = describeOpeningHoursForSpeech(wp.openingHours);
    if (spokenHours) parts.push(`Godziny otwarcia: ${spokenHours}`);
    if (wp.description?.trim()) parts.push(wp.description.trim());
    if (parts.length === 0) return null;
    return parts.join('. ');
}

export function stopSpeech() {
    utteranceId += 1;
    activeWaypointKey = null;
    Speech.stop();
}

export function toggleWaypointSpeech(wp: SpeakableWaypoint, waypointKey: string) {
    if (activeWaypointKey === waypointKey) {
        stopSpeech();
        return;
    }

    const text = buildWaypointSpeechText(wp);
    if (!text) return;

    stopSpeech();
    const id = utteranceId;
    activeWaypointKey = waypointKey;

    const finish = () => {
        if (utteranceId === id) activeWaypointKey = null;
    };

    Speech.speak(text, {
        language: 'pl-PL',
        rate: 0.95,
        onDone: finish,
        onStopped: finish,
        onError: finish,
    });
}
