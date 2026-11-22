import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Calls `refresh` when the app returns from the background, so changes made on another
 * device (for example the web app) show up without restarting the app.
 */
export function useRefreshOnForeground(refresh: () => void) {
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    useEffect(() => {
        let previous = AppState.currentState;
        const subscription = AppState.addEventListener('change', (next) => {
            if (previous.match(/inactive|background/) && next === 'active') refreshRef.current();
            previous = next;
        });
        return () => subscription.remove();
    }, []);
}
